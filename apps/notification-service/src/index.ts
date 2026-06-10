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

// Maps a template + job data → short in-app notification content.
// Returns null for templates that should not create an in-app notification (e.g. verify_email).
function getInAppMeta(
  template: string,
  data: Record<string, unknown>,
): { title: string; body: string; link?: string } | null {
  switch (template) {
    case "welcome":
      return { title: "Welcome to Kabon.Africa", body: `Your account is live, ${data["name"]}.`, link: "/dashboard" };
    case "project_submitted":
      return { title: "Project submitted", body: `"${data["projectTitle"]}" is now under review.`, link: data["projectId"] ? `/projects/${data["projectId"]}` : "/dashboard" };
    case "project_approved":
      return { title: "Project approved!", body: `"${data["projectTitle"]}" has been verified — ${data["carbonTons"]} tonnes issued.`, link: data["projectId"] ? `/projects/${data["projectId"]}` : "/dashboard" };
    case "project_rejected":
      return { title: "Project update", body: `"${data["projectTitle"]}" could not be verified at this time.`, link: data["projectId"] ? `/projects/${data["projectId"]}` : "/dashboard" };
    case "credit_sold":
      return { title: "Credits sold!", body: `${data["tons"]} tonnes from "${data["projectTitle"]}" sold for ${data["totalPrice"]} ${data["currency"]}.`, link: "/dashboard" };
    case "admin_new_registration":
      return { title: "New registration", body: `${data["name"]} (${data["email"]}) just signed up.`, link: (data["adminUrl"] as string) || "/admin/users" };
    case "forgot_password":
      return { title: "Password reset requested", body: "A password reset link has been sent to your email." };
    default:
      return null;
  }
}

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

    // Resolve the email recipient.
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

      // Send the email.
      if (!transporter) {
        console.log(`[notification] No SMTP config — skipping email to ${recipient} (${template})`);
      } else {
        await transporter.sendMail({
          from: process.env.FROM_EMAIL || "noreply@kabon.africa",
          to: recipient,
          subject: tmpl.subject,
          html: tmpl.html(data),
        });
        console.log(`[notification] Email sent to ${recipient} (${template})`);
      }

      // Persist an in-app notification.
      // If toOverride is set (e.g. admin_new_registration), find the user by that email.
      // Otherwise use the job's userId directly.
      const meta = getInAppMeta(template, data);
      if (meta) {
        let notifyUserId = userId;
        if (toOverride) {
          const overrideUser = await prisma.user.findUnique({ where: { email: toOverride }, select: { id: true } });
          if (overrideUser) notifyUserId = overrideUser.id;
          else notifyUserId = "";  // no matching user — skip in-app
        }
        if (notifyUserId) {
          await prisma.notification.create({
            data: {
              userId: notifyUserId,
              type: template,
              title: meta.title,
              body: meta.body,
              link: meta.link ?? null,
            },
          }).catch((err: unknown) => {
            console.warn("[notification] Failed to persist in-app notification:", (err as Error).message);
          });
        }
      }
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
