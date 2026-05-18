import "dotenv/config";
import { startMintingWorker } from "./workers/minting.worker";
import { startVerificationWorker } from "./workers/verification.worker";
import { startRetirementWorker } from "./workers/retirement.worker";

const connection = { url: process.env.REDIS_URL! };

const mintingWorker = startMintingWorker(connection);
const verificationWorker = startVerificationWorker(connection);
const retirementWorker = startRetirementWorker(connection);

console.log("CarbonAfrika workers started");
console.log("  - minting worker");
console.log("  - verification worker");
console.log("  - retirement worker");

const shutdown = async () => {
  console.log("Shutting down workers...");
  await Promise.all([
    mintingWorker.close(),
    verificationWorker.close(),
    retirementWorker.close(),
  ]);
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
