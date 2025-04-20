import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";

// Generate a unique filename prefix
const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7
); // 7-character random string

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");

  if (!filename) {
    return NextResponse.json(
      { error: "Missing filename query parameter." },
      { status: 400 }
    );
  }

  if (!request.body) {
    return NextResponse.json({ error: "No file body found." }, { status: 400 });
  }

  // Generate a unique path for the blob
  const uniqueFilename = `${nanoid()}-${filename}`;

  try {
    // `request.body` is already a ReadableStream
    const blob = await put(uniqueFilename, request.body, {
      access: "public", // Make the uploaded file publicly accessible
      // Optional: Add content type if available from client, though Vercel Blob often infers it
      // contentType: request.headers.get('content-type') || undefined,
    });

    // Return the blob object (which includes the URL)
    return NextResponse.json(blob);
  } catch (error) {
    console.error("Error uploading file to Vercel Blob:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json(
      { error: "Failed to upload image.", details: errorMessage },
      { status: 500 }
    );
  }
}
