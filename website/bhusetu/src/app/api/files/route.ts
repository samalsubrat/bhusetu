import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "@/lib/config"
import { encrypt } from "@/lib/encryption"

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file into buffer and encrypt with AES-256-GCM
    const arrayBuffer = await file.arrayBuffer();
    const plaintext = Buffer.from(arrayBuffer);
    const encrypted = encrypt(plaintext);

    // Create a new File from the encrypted buffer
// Create a new File from the encrypted buffer
const encryptedBlob = new Blob([new Uint8Array(encrypted)], { type: "application/octet-stream" });    
const encryptedFile = new File([encryptedBlob], file.name, { type: "application/octet-stream" });

    // Upload encrypted file to Pinata Private IPFS
    const upload = await pinata.upload.private
      .file(encryptedFile)
      .name(file.name)
      .keyvalues({
        originalName: file.name,
        originalType: file.type,
        originalSize: String(file.size),
        encrypted: "aes-256-gcm",
      });

    return NextResponse.json({
      id: upload.id,
      cid: upload.cid,
      name: file.name,            // Return original filename
      size: file.size,             // Return original file size
      mimeType: file.type,         // Return original mime type
    }, { status: 200 });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No file IDs provided" }, { status: 400 });
    }

    await pinata.files.private.delete(ids);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}