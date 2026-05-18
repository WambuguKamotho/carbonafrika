import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@carbonafrika/db";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { generateNonce, buildSignMessage, recoverAddress } from "../lib/wallet";
import { authenticate } from "../middleware/authenticate";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["LANDOWNER", "BUYER", "VERIFIER"]).optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Email/password register
router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { name, email, password, role, country, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role ?? "LANDOWNER", country, phone },
  });

  const payload = { sub: user.id, role: user.role };
  res.status(201).json({
    success: true,
    data: {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
  });
});

// Email/password login
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    res.status(401).json({ success: false, error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ success: false, error: "Invalid credentials" });
    return;
  }

  const payload = { sub: user.id, role: user.role, walletAddress: user.walletAddress ?? undefined };
  res.json({
    success: true,
    data: {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role, walletAddress: user.walletAddress },
    },
  });
});

// Wallet: get nonce to sign
router.post("/wallet/nonce", async (req, res) => {
  const { address } = req.body as { address?: string };
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    res.status(400).json({ success: false, error: "Invalid wallet address" });
    return;
  }

  const nonce = generateNonce();
  const normalizedAddress = address.toLowerCase();

  await prisma.user.upsert({
    where: { walletAddress: normalizedAddress },
    create: { walletAddress: normalizedAddress, walletNonce: nonce, name: `User_${normalizedAddress.slice(2, 8)}` },
    update: { walletNonce: nonce },
  });

  res.json({
    success: true,
    data: { message: buildSignMessage(normalizedAddress, nonce), nonce },
  });
});

// Wallet: verify signature and issue JWT
router.post("/wallet/verify", async (req, res) => {
  const { address, signature } = req.body as { address?: string; signature?: string };
  if (!address || !signature) {
    res.status(400).json({ success: false, error: "address and signature required" });
    return;
  }

  const normalizedAddress = address.toLowerCase();
  const user = await prisma.user.findUnique({ where: { walletAddress: normalizedAddress } });

  if (!user || !user.walletNonce) {
    res.status(400).json({ success: false, error: "Request a nonce first" });
    return;
  }

  const message = buildSignMessage(normalizedAddress, user.walletNonce);
  const recovered = recoverAddress(message, signature).toLowerCase();

  if (recovered !== normalizedAddress) {
    res.status(401).json({ success: false, error: "Signature verification failed" });
    return;
  }

  // Rotate nonce after successful verification
  await prisma.user.update({
    where: { id: user.id },
    data: { walletNonce: generateNonce() },
  });

  const payload = { sub: user.id, role: user.role, walletAddress: user.walletAddress ?? undefined };
  res.json({
    success: true,
    data: {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: { id: user.id, name: user.name, role: user.role, walletAddress: user.walletAddress },
    },
  });
});

// Refresh token
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ success: false, error: "Refresh token required" });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({ success: false, error: "User not found" });
      return;
    }
    const newPayload = { sub: user.id, role: user.role, walletAddress: user.walletAddress ?? undefined };
    res.json({
      success: true,
      data: { accessToken: signAccessToken(newPayload) },
    });
  } catch {
    res.status(401).json({ success: false, error: "Invalid refresh token" });
  }
});

// Get current user
router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { id: true, name: true, email: true, role: true, walletAddress: true, country: true, phone: true, kycVerified: true, createdAt: true },
  });

  if (!user) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  res.json({ success: true, data: user });
});

// Update profile
router.patch("/me", authenticate, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    country: z.string().optional(),
    bio: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.user!.sub },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, walletAddress: true, country: true, phone: true },
  });

  res.json({ success: true, data: user });
});

export default router;
