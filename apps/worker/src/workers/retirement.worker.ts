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

      if (!purchase || purchase.retired) return;
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
          retired: true,
          retirementTxHash: burnReceipt.hash,
          nftTokenId: nftTokenId.toString(),
        },
      });

      console.log(`[retirement] Purchase ${purchaseId} retired. NFT: ${nftTokenId}`);
    },
    { connection, concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[retirement] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
