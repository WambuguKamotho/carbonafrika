import "dotenv/config";
import { redisConnectionOptions } from "@carbonafrika/types";
import { startMintingWorker } from "./workers/minting.worker";
import { startVerificationWorker } from "./workers/verification.worker";
import { startRetirementWorker } from "./workers/retirement.worker";
import { startSettlementWorker } from "./workers/settlement.worker";
import { startNotificationWorker } from "./workers/notification.worker";

const connection = redisConnectionOptions("worker");

const mintingWorker      = startMintingWorker(connection);
const verificationWorker = startVerificationWorker(connection);
const retirementWorker   = startRetirementWorker(connection);
const settlementWorker   = startSettlementWorker(connection);
const notificationWorker = startNotificationWorker(connection);

console.log("CarbonAfrika workers started");
console.log("  - minting worker");
console.log("  - verification worker");
console.log("  - retirement worker");
console.log("  - settlement worker");
console.log("  - notification worker");

const shutdown = async () => {
  console.log("Shutting down workers...");
  await Promise.all([
    mintingWorker.close(),
    verificationWorker.close(),
    retirementWorker.close(),
    settlementWorker.close(),
    notificationWorker.close(),
  ]);
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
