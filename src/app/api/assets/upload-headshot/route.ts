import { NextResponse } from "next/server";
import { db } from "@/db";
import { asset } from "@/db/schema";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return NextResponse.json(
      { error: "Server configuration error: Blob storage token missing." },
      { status: 500 }
    );
  }

  try {
    // Directly get the file from the request body
    // Vercel Edge functions can sometimes handle this directly
    const file = request.body ? await request.blob() : null;
    const filename =
      request.headers.get("x-vercel-filename") || "unknown-headshot";
    const contentType =
      request.headers.get("content-type") || "application/octet-stream";

    if (!file || file.size === 0) {
      // Fallback for standard environments (like local Node.js)
      try {
        const formData = await request.formData();
        const formFile = formData.get("headshot") as File | null;
        if (!formFile) {
          return NextResponse.json(
            { error: "No headshot file provided in form data." },
            { status: 400 }
          );
        }
        // Use the file from form data if direct body reading fails
        return uploadFile(formFile, formFile.name, formFile.type, blobToken);
      } catch (formError) {
        console.warn(
          "Could not read request body directly or parse FormData, error:",
          formError
        );
        return NextResponse.json(
          { error: "No headshot file data received." },
          { status: 400 }
        );
      }
    }

    // If direct body read worked, proceed with that file
    return uploadFile(file, filename, contentType, blobToken);
  } catch (error: any) {
    console.error(
      "API Error: Failed to process headshot upload request:",
      error
    );
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Helper function to handle the actual upload and DB insertion
async function uploadFile(
  file: Blob,
  filename: string,
  contentType: string,
  blobToken: string
) {
  try {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, GIF, WEBP allowed." },
        { status: 400 }
      );
    }

    // Validate file size (e.g., 5MB limit)
    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSizeMB}MB limit.` },
        { status: 400 }
      );
    }

    console.log("API: Uploading headshot to Vercel Blob...");
    const blobPathname = `headshots/${uuidv4()}-${filename}`;

    const blob = await put(blobPathname, file, {
      access: "public",
      token: blobToken,
      contentType: contentType, // Pass content type
    });

    console.log(`API: Headshot Blob uploaded successfully. URL: ${blob.url}`);

    console.log("API: Creating headshot asset record in database...");
    const newAssetResult = await db
      .insert(asset)
      .values({
        filename: filename,
        storageKey: blob.url, // Store the public URL
        mimeType: contentType,
        fileSizeBytes: file.size,
      })
      .returning({ id: asset.id });

    if (!newAssetResult || newAssetResult.length === 0) {
      // Consider deleting from blob storage if DB insert fails
      throw new Error(
        "Failed to create asset record in database after upload."
      );
    }
    const newAsset = newAssetResult[0];

    console.log(`API: Headshot asset created with ID: ${newAsset.id}`);
    return NextResponse.json({ assetId: newAsset.id }, { status: 201 });
  } catch (error: any) {
    console.error("API Error in uploadFile helper:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred during upload.";
    // Ensure proper JSON response even from helper error
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
