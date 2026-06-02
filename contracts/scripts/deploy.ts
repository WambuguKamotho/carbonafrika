import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const OUT_PATH = path.join(__dirname, "../deployments.json");

function loadExisting(): Record<string, string> {
  try {
    const d = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
    return d.contracts ?? {};
  } catch {
    return {};
  }
}

async function deployOrReuse(
  factory: Awaited<ReturnType<typeof ethers.getContractFactory>>,
  name: string,
  args: unknown[],
  existing: Record<string, string>,
  key: string,
): Promise<string> {
  if (existing[key]) {
    console.log(`  ${name} already deployed: ${existing[key]} (skipping)`);
    return existing[key];
  }
  console.log(`  Deploying ${name}…`);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log(`  ${name} deployed: ${addr}`);
  return addr;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const existing = loadExisting();

  console.log("=== CarbonAfrika Contract Deployment ===");
  console.log("Network:  ", network.name, `(chainId ${network.chainId})`);
  console.log("Deployer: ", deployer.address);
  console.log("Balance:  ", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MATIC");
  if (Object.keys(existing).length) {
    console.log("Resuming from previous partial deployment.\n");
  }
  console.log("");

  // 1. MockUSDC (testnet only)
  let usdcAddress: string;
  if (network.chainId !== 137n) {
    const F = await ethers.getContractFactory("MockUSDC");
    usdcAddress = await deployOrReuse(F, "MockUSDC", [deployer.address], existing, "mockUsdc");
  } else {
    usdcAddress = process.env.USDC_ADDRESS ?? "";
    console.log("  Mainnet — using existing USDC:", usdcAddress);
  }

  // 2. CarbonCreditToken
  const F2 = await ethers.getContractFactory("CarbonCreditToken");
  const carbonTokenAddress = await deployOrReuse(F2, "CarbonCreditToken", [deployer.address], existing, "carbonToken");

  // 3. ProjectRegistry
  const F3 = await ethers.getContractFactory("ProjectRegistry");
  const registryAddress = await deployOrReuse(F3, "ProjectRegistry", [deployer.address], existing, "projectRegistry");

  // 4. Marketplace
  const F4 = await ethers.getContractFactory("Marketplace");
  const marketplaceAddress = await deployOrReuse(F4, "Marketplace", [carbonTokenAddress, deployer.address], existing, "marketplace");

  // 5. RetirementCertificate
  const F5 = await ethers.getContractFactory("RetirementCertificate");
  const retirementCertAddress = await deployOrReuse(F5, "RetirementCertificate", [deployer.address], existing, "retirementCertificate");

  // Save manifest
  const deployments = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      mockUsdc: usdcAddress,
      carbonToken: carbonTokenAddress,
      projectRegistry: registryAddress,
      marketplace: marketplaceAddress,
      retirementCertificate: retirementCertAddress,
    },
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(deployments, null, 2));

  console.log("\n========================================");
  console.log("  All contracts deployed! Copy into .env:");
  console.log("========================================");
  console.log(`CARBON_TOKEN_ADDRESS=${carbonTokenAddress}`);
  console.log(`PROJECT_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`MARKETPLACE_ADDRESS=${marketplaceAddress}`);
  console.log(`RETIREMENT_CERT_ADDRESS=${retirementCertAddress}`);
  console.log(`USDC_ADDRESS=${usdcAddress}`);
  console.log("========================================");

  const explorer = network.chainId === 137n
    ? "https://polygonscan.com"
    : "https://amoy.polygonscan.com";
  console.log(`\nView on explorer: ${explorer}/address/${deployer.address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
