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

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}
