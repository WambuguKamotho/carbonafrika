import { Worker, type Job } from "bullmq";
import { prisma } from "@carbonafrika/db";
import { getCarbonTokenContract } from "../lib/blockchain";
import type { MintingJobPayload } from "@carbonafrika/types";

export function startMintingWorker(connection: { url: string }) {
  const worker = new Worker<MintingJobPayload>(
    "minting",
    async (job: Job<MintingJobPayload>) => {
      const { projectId, verificationId, carbonTons, ownerWallet } = job.data as typeof job.data & { verificationId?: string };

      console.log(`[minting] Minting ${carbonTons} credits for project ${projectId}`);

      // Verifier approval now creates the DB credit synchronously. If we find
      // one already minted on-chain (tokenId doesn't start with the kc- prefix),
      // we're done. Otherwise we proceed to mint and update.
      const existingOnChain = await prisma.carbonCredit.findFirst({
        where: { projectId, NOT: { tokenId: { startsWith: "kc-" } } },
        select: { id: true },
      });
      if (existingOnChain) {
        console.log(`[minting] Project ${projectId} already has an on-chain credit ${existingOnChain.id} — skipping`);
        return;
      }

      const contract = getCarbonTokenContract();

      // Use numeric projectId (hash the string id to a uint256)
      const projectIdHash = BigInt("0x" + Buffer.from(projectId).toString("hex").slice(0, 16));
      const amountInWei = BigInt(Math.floor(carbonTons * 1e18));

      const tx = await contract.mint(ownerWallet, projectIdHash, amountInWei, "0x");
      const receipt = await tx.wait();

      // Extract tokenId from the Transfer event
      const tokenId = receipt.logs[0]?.topics?.[3] ?? "0";

      // If verifier approval already created a simulated credit (kc-* tokenId),
      // upgrade it with the real on-chain tokenId + mintTxHash instead of
      // duplicating. Otherwise create a fresh one (legacy path).
      void verificationId;
      const simCredit = await prisma.carbonCredit.findFirst({
        where: { projectId, tokenId: { startsWith: "kc-" } },
        select: { id: true, amount: true, bufferTons: true, vintageYear: true },
      });

      if (simCredit) {
        await prisma.carbonCredit.update({
          where: { id: simCredit.id },
          data:  { tokenId: tokenId.toString(), mintTxHash: receipt.hash },
        });
        console.log(`[minting] Upgraded sim credit ${simCredit.id} with on-chain tx ${receipt.hash}`);
        return;
      }

      // Legacy fallback: nothing exists yet, create both credit + buffer pool entry.
      let vintageYear = new Date().getFullYear();
      const project = await prisma.project.findUnique({
        where:  { id: projectId },
        select: { methodology: { select: { code: true, bufferPercent: true } } },
      });
      const bufferPercent  = project?.methodology?.bufferPercent ?? 15;
      const bufferTons     = parseFloat((carbonTons * bufferPercent / 100).toFixed(4));
      const tradeableTons  = parseFloat((carbonTons - bufferTons).toFixed(4));

      const credit = await prisma.$transaction(async (tx) => {
        const c = await tx.carbonCredit.create({
          data: {
            projectId,
            tokenId: tokenId.toString(),
            amount:  tradeableTons,
            bufferTons,
            vintageYear,
            status: "AVAILABLE",
            mintTxHash: receipt.hash,
          },
        });

        // Find-or-create the singleton pool. The seed script creates it, but
        // a fresh install might not have run that step yet.
        let pool = await tx.bufferPool.findFirst();
        if (!pool) pool = await tx.bufferPool.create({ data: {} });

        if (bufferTons > 0) {
          await tx.bufferContribution.create({
            data: {
              poolId: pool.id,
              creditId: c.id,
              tonnes: bufferTons,
              reason: "issuance",
            },
          });
          await tx.bufferPool.update({
            where: { id: pool.id },
            data:  { totalReserved: { increment: bufferTons } },
          });
        }

        return c;
      });

      console.log(`[minting] Credit ${credit.id}: ${tradeableTons} t tradeable + ${bufferTons} t to buffer (${bufferPercent}% per ${project?.methodology?.code ?? "default"})`);

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
    { connection, concurrency: 2, drainDelay: 30000, stalledInterval: 30000 }
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
