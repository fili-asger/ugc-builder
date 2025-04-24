import { NextResponse } from "next/server";
import { db } from "@/db";
import { actor, asset, availabilityStatusEnum } from "@/db/schema";
import { desc, sql, eq } from "drizzle-orm";
import { z } from "zod";

// Define the interface for the table list items
export interface ActorTableItem {
  id: string; // Changed from actorId to match schema
  name: string; // Combined from firstName and lastName
  email: string | null;
  phone: string | null;
  nationality: string | null;
  availabilityStatus: "available" | "unavailable";
  headshotUrl: string | null; // Added for headshot image
}

// Base URL for assets served (replace if using external storage)
const ASSET_BASE_URL = "/";

export async function GET(request: Request) {
  try {
    console.log("API: Fetching actors for table view...");

    // Select fields needed for the table, join for headshot
    const actorsData = await db
      .select({
        id: actor.id,
        firstName: actor.firstName, // Select first/last to combine later if needed (or use sql)
        lastName: actor.lastName,
        email: actor.email,
        phone: actor.phone,
        nationality: actor.nationality,
        availabilityStatus: actor.availabilityStatus,
        headshotStorageKey: asset.storageKey, // Get the storage key for the headshot
      })
      .from(actor)
      // Left join asset table on headshotAssetId
      .leftJoin(asset, eq(actor.headshotAssetId, asset.id))
      .orderBy(desc(actor.lastName), desc(actor.firstName)); // Order by name

    // Construct name and headshot URL
    const actorsForTable: ActorTableItem[] = actorsData.map((a) => ({
      id: a.id,
      name: `${a.firstName} ${a.lastName}`,
      email: a.email,
      phone: a.phone,
      nationality: a.nationality,
      availabilityStatus: a.availabilityStatus,
      headshotUrl: a.headshotStorageKey
        ? `${ASSET_BASE_URL}${a.headshotStorageKey}`
        : null,
    }));

    console.log(`API: Found ${actorsForTable.length} actors for table.`);
    return NextResponse.json(actorsForTable, { status: 200 });
  } catch (error) {
    console.error("API Error: Failed to fetch actors for table:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Zod schema for actor creation payload
const createActorSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format").optional().nullable(),
  phone: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  // Include optional headshotAssetId (UUID)
  headshotAssetId: z.string().uuid("Invalid Asset ID").optional().nullable(),
  // Availability status defaults in DB, but allow override if needed
  availabilityStatus: z.enum(availabilityStatusEnum.enumValues).optional(),
  // Add other fields from schema as needed (portfolioWebsite, etc.)
});

export async function POST(request: Request) {
  let errorMessage: string;
  try {
    const body = await request.json();
    console.log("API: Received actor data for POST:", body);

    // Validate payload
    const validation = createActorSchema.safeParse(body);
    if (!validation.success) {
      console.error("API Validation Error:", validation.error.flatten());
      return NextResponse.json(
        { error: "Invalid input data", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    const actorData = validation.data;

    // Data to insert (matches schema fields)
    const dataToInsert = {
      firstName: actorData.firstName,
      lastName: actorData.lastName,
      email: actorData.email,
      phone: actorData.phone,
      nationality: actorData.nationality,
      headshotAssetId: actorData.headshotAssetId, // Use validated ID
      availabilityStatus: actorData.availabilityStatus, // Use validated status or let DB default
      // Add other fields here if they are included in the schema/payload
    };

    console.log("API: Inserting actor into database:", dataToInsert);
    const result = await db
      .insert(actor)
      .values(dataToInsert)
      .returning({ id: actor.id });

    if (!result || result.length === 0) {
      throw new Error("Database insertion failed.");
    }
    const newActor = result[0];

    // Fetch the full data including headshot URL to return
    const createdActorData = await db
      .select({
        id: actor.id,
        name: sql<string>`concat(${actor.firstName}, ' ', ${actor.lastName})`,
        email: actor.email,
        phone: actor.phone,
        nationality: actor.nationality,
        availabilityStatus: actor.availabilityStatus,
        headshotUrl: asset.storageKey,
      })
      .from(actor)
      .leftJoin(asset, eq(actor.headshotAssetId, asset.id))
      .where(eq(actor.id, newActor.id))
      .limit(1);

    console.log(
      `API: Actor ${
        createdActorData[0]?.name ?? newActor.id
      } created successfully.`
    );
    return NextResponse.json(createdActorData[0] ?? null, { status: 201 });
  } catch (error: any) {
    console.error("API Error: Failed to create actor:", error);
    // Add specific constraint error checks if needed (e.g., unique email)
    errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
