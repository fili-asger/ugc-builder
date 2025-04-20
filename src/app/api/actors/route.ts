import { NextResponse } from "next/server";
import { db } from "@/db";
import { actors, genderEnum, actorTypeEnum } from "@/db/schema";
import { desc } from "drizzle-orm";

// Define the expected shape of the actor data for the list view
export interface ActorListItem {
  actorId: string;
  name: string;
  nationality: string | null; // Nullable based on schema logic
  actorType: "human" | "ai";
  createdAt: Date;
  // Add other fields if needed for the list, e.g., profileImage
  profileImage: string | null;
}

export async function GET(request: Request) {
  try {
    console.log("API: Fetching all actors...");
    // Select specific fields needed for the list
    const allActors: ActorListItem[] = await db
      .select({
        actorId: actors.actorId,
        name: actors.name,
        nationality: actors.nationality,
        actorType: actors.actorType,
        createdAt: actors.createdAt,
        profileImage: actors.profileImage,
      })
      .from(actors)
      .orderBy(desc(actors.createdAt)); // Order by creation date

    console.log(`API: Found ${allActors.length} actors.`);

    return NextResponse.json(allActors, { status: 200 });
  } catch (error) {
    console.error("API Error: Failed to fetch all actors:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Interface for the incoming POST request body
// Should match ActorFormData from the frontend
interface CreateActorPayload {
  name: string;
  profileImage: string;
  visualDescription: string;
  nationality: string;
  gender: (typeof genderEnum.enumValues)[number];
  actorType: (typeof actorTypeEnum.enumValues)[number];
  elevenlabsVoiceId?: string;
}

// POST handler to create a new actor
export async function POST(request: Request) {
  try {
    const body: CreateActorPayload = await request.json();
    console.log("API: Received actor data:", body);

    // Basic Backend Validation (Add more as needed)
    if (
      !body.name ||
      !body.profileImage ||
      !body.visualDescription ||
      !body.gender ||
      !body.actorType
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    // Validate actorType requires nationality (simplified check)
    if (body.actorType === "human" && !body.nationality) {
      return NextResponse.json(
        { error: "Nationality is required for human actors" },
        { status: 400 }
      );
    }
    // Potential validation for URL, elevenlabsVoiceId format, etc.

    // Prepare data for insertion (handle optional fields)
    const dataToInsert = {
      ...body,
      // Ensure optional fields are null if empty string, or handle as needed by DB
      elevenlabsVoiceId: body.elevenlabsVoiceId || null,
      // Nationality check already done, assuming human actors will have it
    };

    console.log("API: Inserting actor into database...");
    const result = await db.insert(actors).values(dataToInsert).returning({
      // Return the fields needed for the list view update
      actorId: actors.actorId,
      name: actors.name,
      nationality: actors.nationality,
      actorType: actors.actorType,
      createdAt: actors.createdAt,
      profileImage: actors.profileImage,
    });

    if (!result || result.length === 0) {
      console.error("API Error: Failed to insert actor or get result back.");
      return NextResponse.json(
        { error: "Database insertion failed." },
        { status: 500 }
      );
    }

    const newActor = result[0];
    console.log(`API: Actor created successfully with ID: ${newActor.actorId}`);

    // Return the newly created actor data (matching ActorListItem structure)
    return NextResponse.json(newActor, { status: 201 }); // 201 Created status
  } catch (error: any) {
    console.error("API Error: Failed to create actor:", error);

    // Check for unique constraint violation (example for elevenlabsVoiceId)
    if (
      error.code === "23505" &&
      error.constraint === "actors_elevenlabs_voice_id_unique"
    ) {
      return NextResponse.json(
        { error: "ElevenLabs Voice ID is already in use." },
        { status: 409 }
      ); // 409 Conflict
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
