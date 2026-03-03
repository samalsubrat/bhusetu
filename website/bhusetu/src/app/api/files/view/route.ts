import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "@/lib/config"
import { decrypt } from "@/lib/encryption"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log("[/api/files/view] Request body:", JSON.stringify(body));
        const { id, cid: rawCid, originalName, mimeType } = body;

        if (!rawCid && !id) {
            console.log("[/api/files/view] No CID or ID in body");
            return NextResponse.json({ error: "No CID or file ID provided" }, { status: 400 });
        }

        // If cid is missing or null, resolve it from the file id
        let cid = rawCid;
        if (!cid && id) {
            console.log("[/api/files/view] CID missing, looking up file by id:", id);
            const fileDetails = await pinata.files.private.get(id);
            console.log("[/api/files/view] File details:", JSON.stringify(fileDetails));
            cid = fileDetails.cid;
        }

        if (!cid || cid === "pending") {
            console.log("[/api/files/view] CID is pending or null:", cid);
            return NextResponse.json({ error: "File is still processing, please try again shortly" }, { status: 400 });
        }

        console.log("[/api/files/view] Using CID:", cid);

        // Generate a temporary signed URL to download the encrypted file
        const signedUrl = await pinata.gateways.private.createAccessLink({
            cid,
            expires: 60,
        });

        // Download the encrypted file from Pinata
        const encryptedRes = await fetch(signedUrl);
        if (!encryptedRes.ok) {
            throw new Error("Failed to download encrypted file from Pinata");
        }

        const encryptedBuffer = Buffer.from(await encryptedRes.arrayBuffer());

        // Decrypt the file
        const decrypted = decrypt(encryptedBuffer);

        // Return the decrypted file with proper content type
        const contentType = mimeType || "application/octet-stream";
        const filename = originalName || "document";

        return new NextResponse(decrypted, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `inline; filename="${filename}"`,
                "Content-Length": String(decrypted.length),
            },
        });
    } catch (e) {
        console.error("[/api/files/view] Error:", e);
        return NextResponse.json(
            { error: "Internal Server Error", detail: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}
