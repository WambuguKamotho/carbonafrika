import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { Queue } from "bullmq";
import { prisma } from "@carbonafrika/db";
import { redisConnectionOptions } from "@carbonafrika/types";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { generateNonce, buildSignMessage, recoverAddress } from "../lib/wallet";
import { authenticate } from "../middleware/authenticate";
import { encryptBankFields, decryptBankFields } from "../lib/crypto";

let notificationQueue: Queue | null = null;
try {
  const connection = redisConnectionOptions("auth-service.auth");
  const nq = new Queue("notification", { connection });
  nq.on("error", (err) => console.warn("[auth] notificationQueue:", err.message));
  notificationQueue = nq;
} catch {
  console.warn("[auth] notification queue init failed — Redis unavailable");
}

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts — try again in 15 minutes" },
});

const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many inquiries from this IP — please email us instead" },
});

const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many subscriptions from this IP" },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many registrations from this IP" },
});

const nonceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Rate limit exceeded — slow down" },
});

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  // Only LANDOWNER may self-register. BUYER and COMMUNITY_PARTNER come through
  // their respective application flows; VERIFIER, ADMIN, and VIEWER are created
  // by admin promotion (PATCH /admin/users/:id). Anything else is ignored.
  role: z.enum(["LANDOWNER"]).optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Email/password register
router.post("/register", registerLimiter, async (req, res) => {
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

  if (notificationQueue) {
    notificationQueue.add("send-notification", {
      userId: user.id,
      type: "email",
      template: "welcome",
      data: { name: user.name },
    }, { attempts: 3 }).catch((err: Error) => console.warn("[auth] welcome email enqueue failed:", err.message));
  }

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

// Public buyer access request — every buyer comes through this funnel.
// Lands in the BuyerInquiry table; admin reviews and either approves
// (creates a User + emails magic link) or rejects.
router.post("/inquiry", inquiryLimiter, async (req, res) => {
  const schema = z.object({
    companyName:  z.string().min(2).max(200),
    contactName:  z.string().min(2).max(120),
    email:        z.string().email().max(200),
    phone:        z.string().max(40).optional(),
    country:      z.string().max(100).optional(),
    estimatedAnnualTons: z.number().positive().max(1_000_000).optional(),
    useCase:      z.string().max(200).optional(),
    message:      z.string().max(5000).optional(),
    source:       z.string().max(200).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  // Soft-dedup: if a PENDING inquiry already exists for this email, just refresh
  // it rather than create another row. Keeps the admin queue clean.
  const existing = await prisma.buyerInquiry.findFirst({
    where: { email: parsed.data.email.toLowerCase(), status: "PENDING" },
    select: { id: true },
  });

  const inquiry = existing
    ? await prisma.buyerInquiry.update({
        where: { id: existing.id },
        data:  { ...parsed.data, email: parsed.data.email.toLowerCase() },
      })
    : await prisma.buyerInquiry.create({
        data:  { ...parsed.data, email: parsed.data.email.toLowerCase() },
      });

  res.status(201).json({
    success: true,
    data: { id: inquiry.id, status: inquiry.status },
    message: "Thanks — our team will reach out within 1–2 business days.",
  });
});

// Public community-partner application — every prospective partner comes
// through this funnel. Admin reviews and approves, which creates a user with
// role COMMUNITY_PARTNER and an invite token redeemable at /redeem-invite.
router.post("/partner-application", inquiryLimiter, async (req, res) => {
  const schema = z.object({
    fullName:          z.string().min(2).max(120),
    email:             z.string().email().max(200),
    phone:             z.string().max(40).optional(),
    country:           z.string().min(2).max(100),
    region:            z.string().max(100).optional(),
    organization:      z.string().max(200).optional(),
    yearsExperience:   z.number().int().min(0).max(60).optional(),
    communitiesServed: z.string().max(2000).optional(),
    message:           z.string().max(5000).optional(),
    source:            z.string().max(200).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  // Soft-dedup on a PENDING application for the same email.
  const existing = await prisma.partnerApplication.findFirst({
    where: { email: parsed.data.email.toLowerCase(), status: "PENDING" },
    select: { id: true },
  });

  const application = existing
    ? await prisma.partnerApplication.update({
        where: { id: existing.id },
        data:  { ...parsed.data, email: parsed.data.email.toLowerCase() },
      })
    : await prisma.partnerApplication.create({
        data:  { ...parsed.data, email: parsed.data.email.toLowerCase() },
      });

  res.status(201).json({
    success: true,
    data: { id: application.id, status: application.status },
    message: "Thanks — our team will reach out within 1–2 business days.",
  });
});

// Public newsletter signup. Idempotent — re-subscribing is a no-op.
router.post("/newsletter", newsletterLimiter, async (req, res) => {
  const schema = z.object({
    email:  z.string().email().max(200),
    source: z.string().max(200).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  await prisma.newsletterSubscriber.upsert({
    where:  { email: parsed.data.email.toLowerCase() },
    create: { email: parsed.data.email.toLowerCase(), source: parsed.data.source },
    update: { source: parsed.data.source ?? undefined },
  });

  res.status(201).json({ success: true, message: "You're subscribed." });
});

// Redeem an admin-issued invite token: set a password, log the user in.
router.post("/redeem-invite", async (req, res) => {
  const schema = z.object({
    token:    z.string().min(20),
    password: z.string().min(8).max(128),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { inviteToken: parsed.data.token },
  });
  if (!user) {
    res.status(404).json({ success: false, error: "Invalid invite link" });
    return;
  }
  if (user.inviteTokenExpiry && user.inviteTokenExpiry < new Date()) {
    res.status(410).json({ success: false, error: "Invite link has expired — ask the team to resend" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      inviteToken:       null,
      inviteTokenExpiry: null,
    },
    select: { id: true, name: true, email: true, role: true, walletAddress: true },
  });

  const payload = { sub: updated.id, role: updated.role, walletAddress: updated.walletAddress ?? undefined };
  res.json({
    success: true,
    data: {
      accessToken:  signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: updated,
    },
  });
});

// Lookup invite metadata (used by the redeem-invite page before showing the form,
// so we can pre-fill the company / contact name).
router.get("/redeem-invite/:token", async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { inviteToken: req.params.token },
    select: { name: true, email: true, inviteTokenExpiry: true },
  });
  if (!user) {
    res.status(404).json({ success: false, error: "Invalid invite link" });
    return;
  }
  const expired = !!(user.inviteTokenExpiry && user.inviteTokenExpiry < new Date());
  res.json({
    success: true,
    data: { name: user.name, email: user.email, expired },
  });
});

// Email/password login
router.post("/login", loginLimiter, async (req, res) => {
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
router.post("/wallet/nonce", nonceLimiter, async (req, res) => {
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

// Common select shape — keep /me GET and PATCH consistent so the frontend
// can always cleanly re-hydrate from either response.
const meSelect = {
  id: true, name: true, email: true, role: true, walletAddress: true,
  country: true, phone: true, bio: true, avatarUrl: true,
  kycVerified: true, kycRequestedAt: true, kycSubmissionNote: true,
  bankAccountName: true, bankName: true, bankAccountNumber: true,
  bankIban: true, bankSwiftBic: true, bankCountry: true,
  createdAt: true,
} as const;

// Get current user
router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: meSelect,
  });

  if (!user) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  res.json({ success: true, data: decryptBankFields(user) });
});

// Update profile
router.patch("/me", authenticate, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    country: z.string().optional(),
    bio: z.string().optional(),
    avatarUrl: z.string().url().max(2000).optional(),

    // Bank payout details — collected for the future fiat phase
    // (Kabon.Africa as intermediary). Stored on User and shown to admins on payout.
    bankAccountName:   z.string().min(2).max(120).optional(),
    bankName:          z.string().min(2).max(120).optional(),
    bankAccountNumber: z.string().min(4).max(40).optional(),
    bankIban:          z.string().min(8).max(40).optional(),
    bankSwiftBic:      z.string().min(8).max(20).optional(),
    bankCountry:       z.string().min(2).max(60).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.user!.sub },
    data: encryptBankFields(parsed.data),
    select: meSelect,
  });

  res.json({ success: true, data: decryptBankFields(user) });
});

// Community-partner dashboard data — the partner's projects + earnings ledger.
// Only the partner themselves (or an admin) can fetch this.
router.get("/me/partner-projects", authenticate, async (req, res) => {
  if (req.user!.role !== "COMMUNITY_PARTNER" && req.user!.role !== "ADMIN") {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }
  const projects = await prisma.project.findMany({
    where: { partnerId: req.user!.sub },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, country: true, status: true,
      projectType: true, landType: true, energyType: true,
      hectares: true, estimatedTons: true, createdAt: true,
      partnerRoyaltyPercent: true,
      owner: { select: { id: true, name: true } },
      methodology: { select: { code: true, name: true } },
      _count: { select: { credits: true } },
    },
  });
  res.json({ success: true, data: projects });
});

router.get("/me/partner-earnings", authenticate, async (req, res) => {
  if (req.user!.role !== "COMMUNITY_PARTNER" && req.user!.role !== "ADMIN") {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  const [items, pendingAgg, paidAgg] = await Promise.all([
    prisma.partnerEarning.findMany({
      where: { partnerId: req.user!.sub },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        // project may have been deleted; safe to leave nullable
      },
    }),
    prisma.partnerEarning.aggregate({
      where: { partnerId: req.user!.sub, status: "PENDING" },
      _sum:  { amount: true },
    }),
    prisma.partnerEarning.aggregate({
      where: { partnerId: req.user!.sub, status: "PAID" },
      _sum:  { amount: true },
    }),
  ]);

  res.json({
    success: true,
    data: {
      items,
      pending: pendingAgg._sum.amount ?? 0,
      paid:    paidAgg._sum.amount    ?? 0,
    },
  });
});

// Register an Expo push token for this device (idempotent — dedupes).
router.post("/me/push-token", authenticate, async (req, res) => {
  const schema = z.object({ token: z.string().min(10).max(255) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub }, select: { pushTokens: true } });
  if (!user) { res.status(404).json({ success: false, error: "User not found" }); return; }
  if (!user.pushTokens.includes(parsed.data.token)) {
    await prisma.user.update({ where: { id: req.user!.sub }, data: { pushTokens: { push: parsed.data.token } } });
  }
  res.json({ success: true });
});

// Drop a push token (called on sign-out so a shared device stops getting pushes).
router.post("/me/push-token/remove", authenticate, async (req, res) => {
  const schema = z.object({ token: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub }, select: { pushTokens: true } });
  if (user) {
    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { pushTokens: { set: user.pushTokens.filter((t) => t !== parsed.data.token) } },
    });
  }
  res.json({ success: true });
});

// Submit-for-KYC — flags the account for admin review. Idempotent: re-submitting
// just refreshes the timestamp. Already-verified users get a 400.
router.post("/me/kyc/request", authenticate, async (req, res) => {
  const schema = z.object({ note: z.string().max(2000).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { kycVerified: true },
  });
  if (!existing) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }
  if (existing.kycVerified) {
    res.status(400).json({ success: false, error: "Already KYC verified" });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.user!.sub },
    data: {
      kycRequestedAt: new Date(),
      kycSubmissionNote: parsed.data.note?.trim() || null,
    },
    select: meSelect,
  });

  res.json({ success: true, data: decryptBankFields(user) });
});

// Change password — requires current password to prevent session-hijack abuse.
router.post("/me/change-password", authenticate, async (req, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword:     z.string().min(8, "New password must be at least 8 characters"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { id: true, passwordHash: true },
  });
  if (!user?.passwordHash) {
    // Wallet-only accounts have no password to change. They'd add one through
    // a separate "set initial password" flow (not built yet).
    res.status(400).json({ success: false, error: "No password set on this account" });
    return;
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    res.status(401).json({ success: false, error: "Current password is incorrect" });
    return;
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, resetToken: null, resetTokenExpiry: null },
  });

  res.json({ success: true, message: "Password updated" });
});

// Bind wallet to the currently signed-in account — different from /wallet/verify
// which LOGS IN as the wallet's user. This one keeps the email-session intact
// and just stores the address on User after verifying the signature.
router.post("/me/wallet/nonce", authenticate, nonceLimiter, async (req, res) => {
  const { address } = req.body as { address?: string };
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    res.status(400).json({ success: false, error: "Invalid wallet address" });
    return;
  }
  const normalized = address.toLowerCase();

  // If another account already owns this wallet, refuse.
  const taken = await prisma.user.findUnique({ where: { walletAddress: normalized }, select: { id: true } });
  if (taken && taken.id !== req.user!.sub) {
    res.status(409).json({ success: false, error: "This wallet is already linked to another account" });
    return;
  }

  const nonce = generateNonce();
  await prisma.user.update({
    where: { id: req.user!.sub },
    data: { walletNonce: nonce },
  });

  res.json({ success: true, data: { message: buildSignMessage(normalized, nonce), nonce } });
});

router.post("/me/wallet/verify", authenticate, async (req, res) => {
  const { address, signature } = req.body as { address?: string; signature?: string };
  if (!address || !signature) {
    res.status(400).json({ success: false, error: "address and signature required" });
    return;
  }
  const normalized = address.toLowerCase();

  const me = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { walletNonce: true },
  });
  if (!me?.walletNonce) {
    res.status(400).json({ success: false, error: "Request a nonce first" });
    return;
  }

  const message = buildSignMessage(normalized, me.walletNonce);
  let recovered: string;
  try {
    recovered = recoverAddress(message, signature).toLowerCase();
  } catch {
    res.status(401).json({ success: false, error: "Signature verification failed" });
    return;
  }
  if (recovered !== normalized) {
    res.status(401).json({ success: false, error: "Signature does not match address" });
    return;
  }

  // Race-check: another account may have grabbed this address since the nonce step.
  const taken = await prisma.user.findUnique({ where: { walletAddress: normalized }, select: { id: true } });
  if (taken && taken.id !== req.user!.sub) {
    res.status(409).json({ success: false, error: "This wallet is already linked to another account" });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.user!.sub },
    data: { walletAddress: normalized, walletNonce: generateNonce() },
    select: meSelect,
  });

  res.json({ success: true, data: decryptBankFields(user) });
});

// Public platform stats — no auth required
router.get("/public-stats", async (_req, res) => {
  const [totalProjects, creditAgg, totalUsers, countries] = await Promise.all([
    prisma.project.count({ where: { status: { in: ["ACTIVE", "VERIFIED"] } } }),
    prisma.carbonCredit.aggregate({ _sum: { amount: true } }),
    prisma.user.count(),
    prisma.project.findMany({ select: { country: true }, distinct: ["country"] }),
  ]);

  res.json({
    success: true,
    data: {
      activeProjects: totalProjects,
      totalCreditsIssued: Math.round(creditAgg._sum.amount ?? 0),
      totalUsers,
      countries: countries.length,
    },
  });
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many password reset requests — try again later" },
});

// Forgot password — send reset link
router.post("/forgot-password", resetLimiter, async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Valid email required" });
    return;
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond with success to avoid user enumeration
  if (!user) {
    res.json({ success: true, data: { message: "If that email is registered you will receive a reset link" } });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  const resetUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
  // In production this would send an email via the notification worker
  console.log(`[auth] Password reset link for ${email}: ${resetUrl}`);

  res.json({ success: true, data: { message: "If that email is registered you will receive a reset link" } });
});

// Reset password — consume token and set new password
router.post("/reset-password", resetLimiter, async (req, res) => {
  const parsed = z.object({
    token:    z.string().min(32),
    password: z.string().min(8).max(128),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { token, password } = parsed.data;
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    res.status(400).json({ success: false, error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });

  res.json({ success: true, data: { message: "Password updated — you can now sign in" } });
});

export default router;
