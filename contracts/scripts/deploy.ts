import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MATIC");

  // 1. Deploy CarbonCreditToken
  const CarbonCreditToken = await ethers.getContractFactory("CarbonCreditToken");
  const carbonToken = await CarbonCreditToken.deploy(deployer.address);
  await carbonToken.waitForDeployment();
  const carbonTokenAddress = await carbonToken.getAddress();
  console.log("CarbonCreditToken deployed:", carbonTokenAddress);

  // 2. Deploy ProjectRegistry
  const ProjectRegistry = await ethers.getContractFactory("ProjectRegistry");
  const registry = await ProjectRegistry.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("ProjectRegistry deployed:", registryAddress);

  // 3. Deploy Marketplace
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(carbonTokenAddress, deployer.address);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("Marketplace deployed:", marketplaceAddress);

  // 4. Deploy RetirementCertificate
  const RetirementCertificate = await ethers.getContractFactory("RetirementCertificate");
  const retirementCert = await RetirementCertificate.deploy(deployer.address);
  await retirementCert.waitForDeployment();
  const retirementCertAddress = await retirementCert.getAddress();
  console.log("RetirementCertificate deployed:", retirementCertAddress);

  // Write addresses to a JSON file for the services to consume
  const deployments = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    carbonToken: carbonTokenAddress,
    projectRegistry: registryAddress,
    marketplace: marketplaceAddress,
    retirementCertificate: retirementCertAddress,
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(deployments, null, 2));
  console.log("\nDeployment addresses saved to contracts/deployments.json");
  console.log("\nAdd these to your .env:");
  console.log(`CARBON_TOKEN_ADDRESS=${carbonTokenAddress}`);
  console.log(`PROJECT_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`MARKETPLACE_ADDRESS=${marketplaceAddress}`);
  console.log(`RETIREMENT_CERT_ADDRESS=${retirementCertAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
