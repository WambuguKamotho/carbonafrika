import { ethers } from "ethers";

const CARBON_TOKEN_ABI = [
  "function mint(address to, uint256 projectId, uint256 amount, bytes data) external returns (uint256)",
  "function burn(address from, uint256 tokenId, uint256 amount) external",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data) external",
];

const RETIREMENT_CERT_ABI = [
  "function mintCertificate(address to, uint256 projectId, uint256 tons, string memory projectTitle) external returns (uint256)",
];

export function getProvider() {
  return new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
}

export function getSigner() {
  return new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, getProvider());
}

export function getCarbonTokenContract() {
  return new ethers.Contract(process.env.CARBON_TOKEN_ADDRESS!, CARBON_TOKEN_ABI, getSigner());
}

export function getRetirementCertContract() {
  return new ethers.Contract(process.env.RETIREMENT_CERT_ADDRESS!, RETIREMENT_CERT_ABI, getSigner());
}
