import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Worker } from "bullmq";
import nodemailer from "nodemailer";
import { prisma } from "@carbonafrika/db";
import { templates } from "./templates";

const app = express();
const PORT = process.env.NOTIFICATION_PORT || 3007;

const transporter = (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "notification-service" }));

const connection = { url: process.env.REDIS_URL! };

const notificationWorker = new Worker(
  "notification",
  async (job) => {
    const { userId, type, template, data, to: toOverride } = job.data as {
      userId: string;
      type: "email" | "sms";
      template: string;
      data: Record<string, unknown>;
      to?: string;
    };

    let recipient = toOverride;
    if (!recipient) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (!user?.email) {
        console.log(`[notification] No email for user ${userId}, skipping`);
        return;
      }
      recipient = user.email;
    }

    if (type === "email") {
      const tmpl = templates[template];
      if (!tmpl) {
        console.warn(`[notification] Unknown template: ${template}`);
        return;
      }

      if (!transporter) {
        console.log(`[notification] No SMTP config — skipping email to ${recipient} (${template})`);
        return;
      }

      await transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@kabon.africa",
        to: recipient,
        subject: tmpl.subject,
        html: tmpl.html(data),
      });

      console.log(`[notification] Email sent to ${recipient} (${template})`);
    }
  },
  { connection, concurrency: 10, drainDelay: 30000, stalledInterval: 30000 }
);

notificationWorker.on("failed", (job, err) => {
  console.error(`[notification] Job ${job?.id} failed:`, err.message);
});

const server = app.listen(PORT, () => {
  console.log(`notification-service running on port ${PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[notification-service] Port ${PORT} already in use — exiting cleanly for restart`);
    process.exit(1);
  }
  throw err;
});

const shutdown = async () => {
  await notificationWorker.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
