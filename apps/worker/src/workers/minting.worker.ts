import { Worker, type Job } from "bullmq";
import { prisma } from "@carbonafrika/db";
import { getCarbonTokenContract } from "../lib/blockchain";
import type { MintingJobPayload } from "@carbonafrika/types";

export function startMintingWorker(connection: { url: string }) {
  const worker = new Worker<MintingJobPayload>(
    "minting",
    async (job: Job<MintingJobPayload>) => {
      const { projectId, verificationId, carbonTons, ownerWallet } = job.data;

      console.log(`[minting] Minting ${carbonTons} credits for project ${projectId}`);

      const contract = getCarbonTokenContract();

      // Use numeric projectId (hash the string id to a uint256)
      const projectIdHash = BigInt("0x" + Buffer.from(projectId).toString("hex").slice(0, 16));
      const amountInWei = BigInt(Math.floor(carbonTons * 1e18));

      const tx = await contract.mint(ownerWallet, projectIdHash, amountInWei, "0x");
      const receipt = await tx.wait();

      // Extract tokenId from the Transfer event
      const tokenId = receipt.logs[0]?.topics?.[3] ?? "0";

      await prisma.carbonCredit.create({
        data: {
          projectId,
          tokenId: tokenId.toString(),
          amount: carbonTons,
          status: "AVAILABLE",
          mintTxHash: receipt.hash,
        },
      });

      await prisma.jobLog.create({
        data: {
          jobId: job.id!,
          queue: "minting",
          status: "completed",
          payload: job.data as never,
          result: { txHash: receipt.hash, tokenId: tokenId.toString() },
        },
      });

      console.log(`[minting] Done. tx: ${receipt.hash}`);
    },
    { connection, concurrency: 2 }
  );

  worker.on("failed", async (job, err) => {
    console.error(`[minting] Job ${job?.id} failed:`, err.message);
    if (job) {
      await prisma.jobLog.create({
        data: {
          jobId: job.id!,
          queue: "minting",
          status: "failed",
          payload: job.data as never,
          error: err.message,
        },
      });
    }
  });

  return worker;
}
