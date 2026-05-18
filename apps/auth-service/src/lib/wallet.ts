import { ethers } from "ethers";
import crypto from "crypto";

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function buildSignMessage(address: string, nonce: string): string {
  return `Welcome to CarbonAfrika!\n\nSign this message to verify your wallet.\n\nWallet: ${address}\nNonce: ${nonce}`;
}

export function recoverAddress(message: string, signature: string): string {
  return ethers.verifyMessage(message, signature);
}
