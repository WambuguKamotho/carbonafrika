import { Worker, type Job } from "bullmq";
import { prisma } from "@carbonafrika/db";
import type { VerificationJobPayload } from "@carbonafrika/types";

// In production: integrate with Verra API, Google Earth Engine, or Chainlink oracle
// For MVP: simulate a 30-second automated pre-check, then flag for human verifier
export function startVerificationWorker(connection: { url: string }) {
  const worker = new Worker<VerificationJobPayload>(
    "verification",
    async (job: Job<VerificationJobPayload>) => {
      const { projectId, verificationId } = job.data;
      console.log(`[verification] Pre-checking project ${projectId}`);

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new Error(`Project ${projectId} not found`);

      // Automated pre-check: validate coordinates land in Africa
      const inAfrica = project.lat >= -35 && project.lat <= 37 && project.lng >= -18 && project.lng <= 52;
      if (!inAfrica) {
        await prisma.verification.update({
          where: { id: verificationId },
          data: { status: "REJECTED", notes: "Project coordinates outside Africa" },
        });
        await prisma.project.update({ where: { id: projectId }, data: { status: "REJECTED" } });
        return;
      }

      // Mark as pending human review — a verifier picks it up via the API
      await prisma.verification.update({
        where: { id: verificationId },
        data: { status: "PENDING", notes: "Automated pre-check passed. Awaiting verifier assignment." },
      });

      await prisma.jobLog.create({
        data: {
          jobId: job.id!,
          queue: "verification",
          status: "completed",
          payload: job.data as never,
          result: { preCheckPassed: true },
        },
      });

      console.log(`[verification] Pre-check done for ${projectId}`);
    },
    { connection, concurrency: 5 }
  );

  worker.on("failed", async (job, err) => {
    console.error(`[verification] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
