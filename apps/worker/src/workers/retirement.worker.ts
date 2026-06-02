import { Worker, type Job } from "bullmq";
import { prisma } from "@carbonafrika/db";
import { getCarbonTokenContract, getRetirementCertContract } from "../lib/blockchain";

interface RetirementPayload {
  purchaseId: string;
}

export function startRetirementWorker(connection: { url: string }) {
  const worker = new Worker<RetirementPayload>(
    "retirement",
    async (job: Job<RetirementPayload>) => {
      const { purchaseId } = job.data;

      const purchase = await prisma.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          listing: {
            include: {
              credit: {
                include: { project: { select: { title: true, onChainId: true } } },
              },
            },
          },
          buyer: { select: { walletAddress: true } },
        },
      });

      if (!purchase) return;
      // retirementTxHash being set means the blockchain step already ran — skip to avoid double-burn
      if (purchase.retirementTxHash) return;
      if (!purchase.buyer.walletAddress) throw new Error("Buyer has no wallet address");

      const tokenContract = getCarbonTokenContract();
      const certContract = getRetirementCertContract();

      // Burn the carbon credit tokens
      const amountInWei = BigInt(Math.floor(purchase.totalTons * 1e18));
      const burnTx = await tokenContract.burn(
        purchase.buyer.walletAddress,
        purchase.listing.credit.tokenId,
        amountInWei
      );
      const burnReceipt = await burnTx.wait();

      // Mint retirement certificate NFT
      const projectOnChainId = BigInt(purchase.listing.credit.project.onChainId ?? "0");
      const certTx = await certContract.mintCertificate(
        purchase.buyer.walletAddress,
        projectOnChainId,
        BigInt(Math.floor(purchase.totalTons)),
        purchase.listing.credit.project.title
      );
      const certReceipt = await certTx.wait();
      const nftTokenId = certReceipt.logs[0]?.topics?.[3] ?? "0";

      await prisma.purchase.update({
        where: { id: purchaseId },
        data: {
          // retired was already set true by the endpoint — just add blockchain proof
          retirementTxHash: burnReceipt.hash,
          nftTokenId: nftTokenId.toString(),
        },
      });

      // Phase C: if all purchases across all listings for this credit are retired, mark the credit RETIRED
      const creditId = purchase.listing.creditId;
      const openPurchases = await prisma.purchase.count({
        where: { listing: { creditId }, retired: false },
      });
      if (openPurchases === 0) {
        await prisma.carbonCredit.update({
          where: { id: creditId },
          data: { status: "RETIRED" },
        });
      }

      console.log(`[retirement] Purchase ${purchaseId} retired. NFT: ${nftTokenId}`);
    },
    { connection, concurrency: 1, drainDelay: 30000, stalledInterval: 30000 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[retirement] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
