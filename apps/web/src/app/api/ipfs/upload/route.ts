import { NextRequest, NextResponse } from "next/server";

const PINATA_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

// App Router handlers parse the body themselves via req.formData() — no
// bodyParser config needed. Force Node runtime + dynamic since we proxy uploads.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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
