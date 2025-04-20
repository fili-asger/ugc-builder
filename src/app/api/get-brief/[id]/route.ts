import { NextResponse } from "next/server";
import { db } from "@/db"; // Import Drizzle client (adjust path if needed)
import { briefs } from "@/db/schema"; // Import briefs table schema (adjust path if needed)
import { eq } from "drizzle-orm"; // Import eq operator

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const briefId = params.id;

  if (!briefId) {
    return NextResponse.json(
      { error: "Brief ID is required" },
      { status: 400 }
    );
  }

  try {
    console.log(`API: Fetching brief with ID: ${briefId}`);
    const result = await db
      .select()
      .from(briefs)
      .where(eq(briefs.id, briefId))
      .limit(1);

    if (result.length === 0) {
      console.log(`API: Brief not found with ID: ${briefId}`);
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    const briefData = result[0];
    console.log(`API: Found brief: ${briefData.title}`);

    // The scenes are already stored as JSONB in the DB, so Drizzle should deserialize them automatically.
    return NextResponse.json(briefData, { status: 200 });
  } catch (error) {
    console.error(`API Error: Failed to fetch brief ${briefId}:`, error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
