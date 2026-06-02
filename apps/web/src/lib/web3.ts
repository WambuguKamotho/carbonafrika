"use client";
import { ethers } from "ethers";

export async function connectWallet(): Promise<{ address: string; signer: ethers.Signer }> {
  if (!window.ethereum) throw new Error("No wallet detected. Install MetaMask.");

  await window.ethereum.request({ method: "eth_requestAccounts" });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  // Switch to Polygon Mumbai (testnet) if needed
  const chainId = process.env.NEXT_PUBLIC_POLYGON_CHAIN_ID || "80001";
  const network = await provider.getNetwork();
  if (network.chainId.toString() !== chainId) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${parseInt(chainId).toString(16)}` }],
      });
    } catch {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: `0x${parseInt(chainId).toString(16)}`,
          chainName: "Polygon Mumbai",
          rpcUrls: ["https://rpc-mumbai.maticvigil.com"],
          nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
          blockExplorerUrls: ["https://mumbai.polygonscan.com/"],
        }],
      });
    }
  }

  return { address: address.toLowerCase(), signer };
}

export async function signMessage(signer: ethers.Signer, message: string): Promise<string> {
  return signer.signMessage(message);
}

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function balanceOf(address owner) external view returns (uint256)",
];

/**
 * Buyer signs a USDC approval so the platform treasury can pull the purchase total.
 * Returns the transaction hash once submitted (caller can await receipt or not).
 *
 * The settlement worker re-checks the allowance on-chain before pulling — if the
 * buyer reduces their allowance after this call, the worker will fail safely.
 */
export async function approveUsdcForTreasury(
  signer: ethers.Signer,
  buyerTotal: number,
): Promise<{ txHash: string }> {
  const usdcAddress     = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  const treasuryAddress = process.env.NEXT_PUBLIC_PLATFORM_TREASURY_ADDRESS;

  if (!usdcAddress || !treasuryAddress) {
    throw new Error("On-chain payment is not configured (missing USDC or treasury address).");
  }

  const usdc = new ethers.Contract(usdcAddress, USDC_ABI, signer);
  const decimals: number = await usdc.decimals();
  const buyer = await signer.getAddress();

  // Skip the approve tx if the wallet already has enough headroom — saves gas.
  const currentAllowance: bigint = await usdc.allowance(buyer, treasuryAddress);
  const requiredUnits: bigint = ethers.parseUnits(buyerTotal.toFixed(6), decimals);
  if (currentAllowance >= requiredUnits) {
    return { txHash: "" };  // empty hash → caller knows no tx was needed
  }

  // Also sanity-check the balance so the user gets a clear error here rather than
  // a cryptic settlement failure later.
  const balance: bigint = await usdc.balanceOf(buyer);
  if (balance < requiredUnits) {
    throw new Error(
      `Insufficient USDC. You need ${buyerTotal} USDC but only have ${ethers.formatUnits(balance, decimals)}.`,
    );
  }

  const tx = await (usdc as ethers.Contract).approve!(treasuryAddress, requiredUnits);
  return { txHash: tx.hash as string };
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}
