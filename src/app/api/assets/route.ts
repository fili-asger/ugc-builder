import { NextResponse } from "next/server";
import { db } from "@/db";
import { asset } from "@/db/schema";
import { desc } from "drizzle-orm";

// Define the expected shape for the asset dropdown items
export interface AssetSelectItem {
  id: string;
  filename: string;
  // Add mimeType if needed for filtering/display
  mimeType: string;
  url: string; // Added storageKey as url
}

export async function GET(request: Request) {
  try {
    console.log("API: Fetching assets for select...");
    // Fetch only id, filename, mimeType for selection purposes
    // Optionally add filtering here (e.g., by mimeType for images)
    const assets: AssetSelectItem[] = await db
      .select({
        id: asset.id,
        filename: asset.filename,
        mimeType: asset.mimeType,
        url: asset.storageKey, // Select storageKey as url
      })
      .from(asset)
      .orderBy(desc(asset.uploadedAt)); // Order by upload date, newest first

    console.log(`API: Found ${assets.length} assets.`);
    return NextResponse.json(assets, { status: 200 });
  } catch (error) {
    console.error("API Error: Failed to fetch assets:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
