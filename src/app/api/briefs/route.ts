import { NextResponse } from "next/server";
import { db } from "@/db";
import { brief, scene, briefStatusEnum, brand } from "@/db/schema";
import { desc } from "drizzle-orm";
import { z } from "zod";

// Define the expected shape of the brief data returned by this endpoint
// Include only the fields needed for the list view
export interface BriefListItem {
  id: string;
  title: string;
  createdAt: Date; // Drizzle converts timestamp to Date
}

// Define Zod schema for scene validation
const sceneSchema = z.object({
  sceneNumber: z.number().int().positive("Scene number must be positive"),
  script: z.string().min(1, "Script cannot be empty"),
  tone: z.string().optional().nullable(), // Allow null or string
  durationSeconds: z
    .number()
    .int()
    .positive("Duration must be positive")
    .optional()
    .nullable(),
  visualDescription: z.string().optional().nullable(),
  // mediaAssetId is optional and typically not set during initial brief creation
});

// Define Zod schema for brief creation payload validation
const createBriefSchema = z.object({
  title: z.string().min(1, "Title is required"),
  brandId: z.string().uuid("Invalid Brand ID format"),
  actorId: z.string().uuid("Invalid Actor ID format").optional().nullable(), // Actor is optional
  information: z.string().optional().nullable(),
  status: z.enum(briefStatusEnum.enumValues).default("draft").optional(),
  deliverableType: z.string().optional().nullable(),
  dueDate: z
    .string()
    .datetime({ message: "Invalid datetime string. Must be UTC ISO 8601" })
    .optional()
    .nullable(), // Expecting ISO string date from frontend e.g. Zod Date wasn't working
  // createdBy will be handled later (e.g., from auth)
  scenes: z.array(sceneSchema).min(1, "At least one scene is required"),
});

export async function GET(request: Request) {
  try {
    console.log("API: Fetching all briefs...");
    const allBriefs: BriefListItem[] = await db
      .select({
        id: brief.id,
        title: brief.title,
        createdAt: brief.createdAt,
      })
      .from(brief)
      .orderBy(desc(brief.createdAt)); // Order by creation date, newest first

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("API: Received brief data:", body);

    // Validate payload against Zod schema
    const validation = createBriefSchema.safeParse(body);
    if (!validation.success) {
      console.error("API Validation Error:", validation.error.flatten());
      return NextResponse.json(
        { error: "Invalid input data", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    const { scenes: scenesData, ...briefData } = validation.data;

    console.log("API: Inserting brief and scenes into database...");

    // Use a transaction to ensure brief and scenes are created together
    const newBriefResult = await db.transaction(async (tx) => {
      // Helper function to format Date to YYYY-MM-DD
      const formatDate = (
        dateString: string | null | undefined
      ): string | null => {
        if (!dateString) return null;
        try {
          // Parse the ISO string received from validation
          const d = new Date(dateString);
          if (isNaN(d.getTime())) {
            // Check if date is valid after parsing
            console.error("Invalid date string received:", dateString);
            throw new Error("Invalid date format received."); // Throw error to stop transaction
          }
          const year = d.getFullYear();
          const month = (d.getMonth() + 1).toString().padStart(2, "0");
          const day = d.getDate().toString().padStart(2, "0");
          return `${year}-${month}-${day}`;
        } catch (e) {
          console.error("Error formatting date:", e);
          throw new Error("Failed to format date."); // Throw error to stop transaction
        }
      };

      // 1. Create the Brief
      const briefInsertResult = await tx
        .insert(brief) // Use correct table name 'brief'
        .values({
          ...briefData,
          // Convert validated ISO string date to YYYY-MM-DD string if provided, otherwise null
          dueDate: formatDate(briefData.dueDate), // Use the helper function
          // createdBy: userId, // TODO: Get user ID from auth session later
          // Ensure updatedAt is set if your schema requires it (or has defaultNow())
          updatedAt: new Date(), // Explicitly set updatedAt
        })
        .returning({ id: brief.id, title: brief.title }); // Return ID and title

      if (!briefInsertResult || briefInsertResult.length === 0) {
        console.error("API Error: Brief insert returned empty result.");
        throw new Error("Failed to create brief record.");
      }
      const newBrief = briefInsertResult[0];
      console.log(`API: Brief created with ID: ${newBrief.id}`);

      // 2. Create the Scenes associated with the Brief
      const sceneInsertPromises = scenesData.map((singleSceneData) =>
        tx
          .insert(scene)
          .values({
            ...singleSceneData,
            briefId: newBrief.id,
          })
          .returning({ id: scene.id })
      );
      const insertedScenes = await Promise.all(sceneInsertPromises);

      console.log(
        `API: Brief '${newBrief.title}' and ${insertedScenes.length} scenes created successfully.`
      );
      return newBrief;
    });

    // Return the main brief data (ID and title)
    return NextResponse.json(newBriefResult, { status: 201 });
  } catch (error: any) {
    console.error("API Error: Failed to create brief:", error);
    if (error.message) {
      console.error("Error message:", error.message);
    }
    if (error.stack) {
      console.error("Error stack:", error.stack);
    }
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    if (error.code) {
      console.error("Database Error Code:", error.code);
    }
    return NextResponse.json(
      { error: "Failed to create brief.", details: errorMessage },
      { status: 500 }
    );
  }
}
