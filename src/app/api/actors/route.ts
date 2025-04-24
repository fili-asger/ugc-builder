import { NextResponse } from "next/server";
import { db } from "@/db";
import { actor } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

// Adjust the interface to match the actual available data
export interface ActorListItem {
  actorId: string; // Renamed from 'id'
  name: string; // Combined from firstName and lastName
  nationality: string | null;
  // createdAt: Date; // Removed based on linter error/schema
  // Removed profileImage and actorType as they don't seem to be in the 'actor' table schema
}

export async function GET(request: Request) {
  try {
    console.log("API: Fetching all actors...");

    // Select correct fields based on schema and combine name
    const allActors: ActorListItem[] = await db
      .select({
        actorId: actor.id, // Select 'id' and alias
        // Combine firstName and lastName using sql template literal
        name: sql<string>`concat(${actor.firstName}, \' \', ${actor.lastName})`,
        nationality: actor.nationality,
        // createdAt: actor.createdAt, // Removed - Field doesn't exist
        // actorType: actor.actorType, // Field doesn't seem to exist
        // profileImage: actor.profileImage, // Field doesn't seem to exist
      })
      .from(actor) // Use singular 'actor'
      .orderBy(desc(actor.firstName)); // Order by first name now, as createdAt isn't available

    console.log(`API: Found ${allActors.length} actors.`);

    return NextResponse.json(allActors, { status: 200 });
  } catch (error) {
    console.error("API Error: Failed to fetch all actors:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    // Return 500 status code on error
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Interface for the incoming POST request body - Needs review based on actual schema
interface CreateActorPayload {
  firstName: string; // Corrected field name
  lastName: string; // Corrected field name
  email?: string;
  phone?: string;
  nationality?: string | null;
  // profileImage: string; // Field seems missing in schema
  // visualDescription: string; // Field seems missing in schema
  // gender: (typeof genderEnum.enumValues)[number]; // Field seems missing in schema
  // actorType: (typeof actorTypeEnum.enumValues)[number]; // Field seems missing in schema
  // elevenlabsVoiceId?: string; // Field seems missing in schema
}

// POST handler to create a new actor - Needs significant review/correction
export async function POST(request: Request) {
  // NOTE: This POST handler likely needs significant updates to match the
  // actual 'actor' schema (firstName, lastName, email, phone, etc.)
  // and validation logic needs to be based on the correct fields.
  // Leaving it as is for now as it's not directly causing the GET error,
  // but it will fail if called.

  let errorMessage: string; // Define errorMessage once
  try {
    const body: CreateActorPayload = await request.json();
    console.log(
      "API: Received actor data for POST (NEEDS SCHEMA REVIEW):",
      body
    );

    // !!! IMPORTANT: Validation below is based on outdated schema assumptions !!!
    // It needs to be updated based on the actual 'actor' table schema.
    if (!body.firstName || !body.lastName /* ... other required fields ...*/) {
      return NextResponse.json(
        { error: "Missing required fields (Schema needs review)" },
        { status: 400 }
      );
    }

    // Prepare data for insertion based on the correct schema
    const dataToInsert = {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      nationality: body.nationality,
      // ... map other fields from CreateActorPayload to actor schema fields ...
    };

    console.log("API: Inserting actor into database (NEEDS SCHEMA REVIEW)...");
    const result = await db
      .insert(actor)
      .values(dataToInsert)
      .returning({
        // Return fields based on corrected selection logic (similar to GET)
        actorId: actor.id,
        name: sql<string>`concat(${actor.firstName}, \' \', ${actor.lastName})`,
        nationality: actor.nationality,
        // createdAt: actor.createdAt, // Removed - Field doesn't exist
      });

    if (!result || result.length === 0) {
      console.error("API Error: Failed to insert actor or get result back.");
      return NextResponse.json(
        { error: "Database insertion failed." },
        { status: 500 }
      );
    }

    const newActor = result[0];
    console.log(
      `API: Actor created successfully with ID: ${newActor.actorId} (SCHEMA REVIEW NEEDED)`
    );

    return NextResponse.json(newActor, { status: 201 });
  } catch (error: any) {
    console.error(
      "API Error: Failed to create actor (NEEDS SCHEMA REVIEW):",
      error
    );
    // Specific error handling might need adjustment based on actual schema constraints
    errorMessage = // Assign to existing variable
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
