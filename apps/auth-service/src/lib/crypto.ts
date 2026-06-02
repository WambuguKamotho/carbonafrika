import crypto from "crypto";

/**
 * Field-level encryption for PII at rest (bank account details).
 *
 * Uses AES-256-GCM. Stored values are tagged `enc:v1:<base64(iv|tag|ct)>` so we
 * can tell encrypted columns from legacy plaintext and decrypt tolerantly during
 * the migration window.
 *
 * Key: ENCRYPTION_KEY — 64 hex chars (32 bytes). Generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * If ENCRYPTION_KEY is unset (local dev), encryption is a no-op pass-through so
 * the app still runs — but a one-time warning is logged. It MUST be set in
 * production.
 */

const PREFIX = "enc:v1:";
const IV_LEN = 12;   // GCM standard nonce length
const TAG_LEN = 16;

let warned = false;
function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    if (!warned) {
      console.warn("[crypto] ENCRYPTION_KEY not set — PII stored in PLAINTEXT. Set it before production.");
      warned = true;
    }
    return null;
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return key;
}

export function encryptField(plain: string | null | undefined): string | null | undefined {
  if (plain == null || plain === "") return plain;
  const key = getKey();
  if (!key) return plain;                       // dev fallback
  if (plain.startsWith(PREFIX)) return plain;   // already encrypted

  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptField<T extends string | null | undefined>(stored: T): T {
  if (stored == null || typeof stored !== "string") return stored;
  if (!stored.startsWith(PREFIX)) return stored;   // legacy plaintext — return as-is
  const key = getKey();
  if (!key) return stored;                         // can't decrypt without a key

  try {
    const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ct = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
    return out as T;
  } catch {
    // Corrupt or wrong key — fail closed by masking rather than leaking ciphertext.
    return "" as T;
  }
}

// The encrypted bank columns on User.
const BANK_FIELDS = ["bankAccountName", "bankName", "bankAccountNumber", "bankIban", "bankSwiftBic"] as const;

/** Encrypt any bank fields present on a partial update payload (in place-safe copy). */
export function encryptBankFields<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = { ...data };
  for (const f of BANK_FIELDS) {
    if (typeof out[f] === "string") out[f] = encryptField(out[f] as string);
  }
  return out as T;
}

/** Decrypt bank fields on a user object before returning it to the client. */
export function decryptBankFields<T extends Record<string, unknown> | null>(user: T): T {
  if (!user) return user;
  const out: Record<string, unknown> = { ...user };
  for (const f of BANK_FIELDS) {
    if (typeof out[f] === "string") out[f] = decryptField(out[f] as string);
  }
  return out as T;
}
