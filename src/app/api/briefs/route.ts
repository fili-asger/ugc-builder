import { NextResponse } from "next/server";
import { db } from "@/db";
import { briefs } from "@/db/schema";
import { desc } from "drizzle-orm";

// Define the expected shape of the brief data returned by this endpoint
// Include only the fields needed for the list view
export interface BriefListItem {
  id: string;
  title: string;
  language: string;
  sourceUrl: string | null; // It can be null based on schema
  createdAt: Date; // Drizzle converts timestamp to Date
}

export async function GET(request: Request) {
  try {
    console.log("API: Fetching all briefs...");
    const allBriefs: BriefListItem[] = await db
      .select({
        id: briefs.id,
        title: briefs.title,
        language: briefs.language,
        sourceUrl: briefs.sourceUrl,
        createdAt: briefs.createdAt,
      })
      .from(briefs)
      .orderBy(desc(briefs.createdAt)); // Order by creation date, newest first

    console.log(`API: Found ${allBriefs.length} briefs.`);

    return NextResponse.json(allBriefs, { status: 200 });
  } catch (error) {
    console.error("API Error: Failed to fetch all briefs:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
