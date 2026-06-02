import { Queue } from "bullmq";
import { redisConnectionOptions } from "@carbonafrika/types";

const connection = redisConnectionOptions("project-service");

let verificationQueue: Queue | null = null;
let notificationQueue: Queue | null = null;

try {
  const vq = new Queue("verification", { connection });
  const nq = new Queue("notification", { connection });
  vq.on("error", (err) => console.warn("[project-service] verificationQueue:", err.message));
  nq.on("error", (err) => console.warn("[project-service] notificationQueue:", err.message));
  verificationQueue = vq;
  notificationQueue = nq;
} catch {
  console.warn("[project-service] Queue init failed — jobs will be skipped (Redis unavailable)");
}

export async function enqueueVerification(payload: {
  projectId: string;
  verificationId: string;
}) {
  if (!verificationQueue) return;
  try {
    await verificationQueue.add("verify-project", payload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });
  } catch (err) {
    console.warn("[project-service] enqueueVerification skipped — Redis unavailable:", (err as Error).message);
  }
}

export async function enqueueNotification(payload: {
  userId: string;
  type: "email" | "sms";
  template: string;
  data: Record<string, unknown>;
}) {
  if (!notificationQueue) return;
  try {
    await notificationQueue.add("send-notification", payload, { attempts: 3 });
  } catch (err) {
    console.warn("[project-service] enqueueNotification skipped — Redis unavailable:", (err as Error).message);
  }
}
