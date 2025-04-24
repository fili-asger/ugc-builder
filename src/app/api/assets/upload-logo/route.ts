import { NextResponse } from "next/server";
import { db } from "@/db";
import { asset } from "@/db/schema";
import { put } from "@vercel/blob"; // Import put from Vercel Blob SDK
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    console.error("Missing BLOB_READ_WRITE_TOKEN environment variable.");
    return NextResponse.json(
      { error: "Server configuration error: Blob storage token missing." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("logo") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No logo file provided." },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, GIF, WEBP allowed." },
        { status: 400 }
      );
    }

    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSizeMB}MB limit.` },
        { status: 400 }
      );
    }

    console.log("API: Uploading logo to Vercel Blob...");
    // Generate a unique pathname (optional, but good practice)
    const blobPathname = `logos/${uuidv4()}-${file.name}`;

    // --- Vercel Blob Upload ---
    const blob = await put(blobPathname, file, {
      access: "public",
      token: blobToken, // Pass the token
    });
    // --- End Blob Upload ---

    console.log(`API: Blob uploaded successfully. URL: ${blob.url}`);

    console.log("API: Creating asset record in database...");
    // --- Database Insertion ---
    const newAssetResult = await db
      .insert(asset)
      .values({
        filename: file.name,
        storageKey: blob.url, // Store the PUBLIC URL from Vercel Blob
        mimeType: file.type,
        fileSizeBytes: file.size,
        // uploadedBy: Omitted (nullable)
      })
      .returning({ id: asset.id });

    if (!newAssetResult || newAssetResult.length === 0) {
      // TODO: Consider deleting from blob storage if DB insert fails
      // await del(blob.url, { token: blobToken });
      throw new Error(
        "Failed to create asset record in database after upload."
      );
    }
    const newAsset = newAssetResult[0];

    console.log(`API: Logo asset created with ID: ${newAsset.id}`);
    return NextResponse.json({ assetId: newAsset.id }, { status: 201 });
  } catch (error: any) {
    console.error("API Error: Failed to upload logo:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
