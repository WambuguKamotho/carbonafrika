import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const PINATA_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyJWT(token: string, secret: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [header, payload, signature] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return false;
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (exp && Date.now() / 1000 > exp) return false;
  } catch {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  const jwtSecret = process.env.JWT_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  const cookieToken = req.cookies.get("ca_token")?.value ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : cookieToken;

  if (!jwtSecret || !token || !verifyJWT(token, jwtSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey    = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return NextResponse.json({ error: "IPFS upload not configured" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // 50 MB limit
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 50 MB)" }, { status: 413 });
  }

  const pinataForm = new FormData();
  pinataForm.append("file", file);
  pinataForm.append(
    "pinataMetadata",
    JSON.stringify({ name: file.name }),
  );

  const pinataRes = await fetch(PINATA_URL, {
    method: "POST",
    headers: {
      pinata_api_key: apiKey,
      pinata_secret_api_key: secretKey,
    },
    body: pinataForm,
  });

  if (!pinataRes.ok) {
    const text = await pinataRes.text();
    console.error("[ipfs/upload] Pinata error:", text);
    return NextResponse.json({ error: "Upload to IPFS failed" }, { status: 502 });
  }

  const result = await pinataRes.json() as { IpfsHash: string; PinSize: number };
  return NextResponse.json({ hash: `ipfs://${result.IpfsHash}`, cid: result.IpfsHash });
}
