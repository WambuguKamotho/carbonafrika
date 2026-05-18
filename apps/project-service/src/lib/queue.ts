import { Queue } from "bullmq";

const connection = { url: process.env.REDIS_URL! };

export const verificationQueue = new Queue("verification", { connection });
export const notificationQueue = new Queue("notification", { connection });

export async function enqueueVerification(payload: {
  projectId: string;
  verificationId: string;
}) {
  await verificationQueue.add("verify-project", payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function enqueueNotification(payload: {
  userId: string;
  type: "email" | "sms";
  template: string;
  data: Record<string, unknown>;
}) {
  await notificationQueue.add("send-notification", payload, { attempts: 3 });
}
