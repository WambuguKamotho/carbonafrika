import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Worker } from "bullmq";
import { Resend } from "resend";
import { prisma } from "@carbonafrika/db";
import { templates } from "./templates";

const app = express();
const PORT = process.env.NOTIFICATION_PORT || 3005;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const connection = { url: process.env.REDIS_URL! };

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "notification-service" }));

// BullMQ worker for notification queue
const notificationWorker = new Worker(
  "notification",
  async (job) => {
    const { userId, type, template, data } = job.data as {
      userId: string;
      type: "email" | "sms";
      template: string;
      data: Record<string, unknown>;
    };

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (!user?.email) {
      console.log(`[notification] No email for user ${userId}, skipping`);
      return;
    }

    if (type === "email") {
      const tmpl = templates[template];
      if (!tmpl) {
        console.warn(`[notification] Unknown template: ${template}`);
        return;
      }

      if (!resend) {
        console.log(`[notification] No RESEND_API_KEY — skipping email to ${user.email} (${template})`);
        return;
      }

      await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@carbonafrika.com",
        to: user.email,
        subject: tmpl.subject,
        html: tmpl.html(data),
      });

      console.log(`[notification] Email sent to ${user.email} (${template})`);
    }
  },
  { connection, concurrency: 10 }
);

notificationWorker.on("failed", (job, err) => {
  console.error(`[notification] Job ${job?.id} failed:`, err.message);
});

app.listen(PORT, () => {
  console.log(`notification-service running on port ${PORT}`);
});

const shutdown = async () => {
  await notificationWorker.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
