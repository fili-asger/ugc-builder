// File: ugc-builder/src/app/api/generate-image/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/db";
import { asset, actor } from "@/db/schema";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

// Ensure OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

// Ensure Vercel Blob token is set
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
if (!blobToken) {
  throw new Error("Missing BLOB_READ_WRITE_TOKEN environment variable");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define expected request body schema using Zod
const generateImageSchema = z.object({
  script: z.string().optional().nullable(),
  visualDescription: z.string().min(1, "Visual description is required"),
  actorId: z.string().uuid("Invalid Actor ID format").optional().nullable(),
  // Add sceneNumber or other context if needed for filename/prompt later
});

interface ActorInfo {
  firstName: string;
  lastName: string;
  headshotUrl: string | null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = generateImageSchema.safeParse(body);
    if (!validation.success) {
      console.error("API Validation Error:", validation.error.flatten());
      return NextResponse.json(
        { error: "Invalid input data", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    const { script, visualDescription, actorId } = validation.data;

    console.log("API: Received request to generate image:", validation.data);

    let actorInfo: ActorInfo | null = null;
    // Fetch actor info if actorId is provided
    if (actorId) {
      console.log(`API: Fetching actor details for ID: ${actorId}`);
      const actorResult = await db
        .select({
          firstName: actor.firstName,
          lastName: actor.lastName,
          headshotUrl: asset.storageKey, // storageKey is the headshot URL
        })
        .from(actor)
        .leftJoin(asset, eq(actor.headshotAssetId, asset.id))
        .where(eq(actor.id, actorId))
        .limit(1);

      if (actorResult.length > 0 && actorResult[0]) {
        actorInfo = actorResult[0];
        console.log(
          `API: Found actor: ${actorInfo.firstName} ${actorInfo.lastName}, Headshot URL: ${actorInfo.headshotUrl}`
        );
      } else {
        console.warn(`API: Actor with ID ${actorId} not found.`);
        // Decide if you want to proceed without actor info or return an error
      }
    }

    // --- Construct the Prompt for DALL-E 3 ---
    let prompt = visualDescription;
    if (script) {
      prompt += `\n\nScene Script Context: ${script}`; // Add script for context
    }
    if (actorInfo) {
      prompt += `\n\nFeaturing actor: ${actorInfo.firstName} ${actorInfo.lastName}.`;
      if (actorInfo.headshotUrl) {
        // DALL-E 3 doesn't directly take image URLs in the prompt API call like vision models.
        // Instead, describe the actor based on the visual description and name.
        // For more advanced likeness, techniques like fine-tuning or Dreambooth would be needed,
        // which are beyond the scope of a single API call.
        prompt += ` The actor should resemble the person described in the visual details.`;
        // Consider adding more descriptive details if available in actor profile
      } else {
        prompt += ` (No headshot provided for reference).`;
      }
    }
    prompt +=
      "\n\nGenerate an image suitable for a vertical video (9:16 aspect ratio).";

    console.log(`API: Generated DALL-E Prompt: ${prompt}`);

    // --- Generate Image with OpenAI (gpt-image-1) ---
    let imageBase64: string;
    const outputFormat = "png"; // Explicitly setting to png for base64

    try {
      console.log(
        "API: Calling OpenAI images.generate (gpt-image-1)...",
        prompt
      );
      const imageResponse = await openai.images.generate({
        model: "gpt-image-1", // Using gpt-image-1 model
        prompt: prompt,
        n: 1,
        size: "1024x1536", // 9:16 aspect ratio for gpt-image-1
        // response_format: "b64_json", // Implicit for gpt-image-1
        quality: "high", // Use quality parameter supported by gpt-image-1
        output_format: outputFormat, // Specify output format for base64
        // style: "vivid", // Style not supported by gpt-image-1
      });

      // Check if data exists before accessing it
      if (!imageResponse.data || imageResponse.data.length === 0) {
        console.error("API Error: OpenAI response data is empty.");
        throw new Error("No image data received from OpenAI.");
      }

      const b64_json = imageResponse.data[0]?.b64_json;
      if (!b64_json) {
        console.error("API Error: No base64 image data received from OpenAI.");
        throw new Error("Failed to retrieve base64 image data from OpenAI.");
      }
      imageBase64 = b64_json;
      console.log(`API: OpenAI Image generated (received base64 data).`);
    } catch (openaiError) {
      console.error("API Error: OpenAI image generation failed:", openaiError);
      if (openaiError instanceof OpenAI.APIError) {
        return NextResponse.json(
          {
            error: `OpenAI Image API Error: ${openaiError.status} ${openaiError.message}`,
          },
          { status: openaiError.status || 500 }
        );
      }
      throw new Error("Failed to generate image via OpenAI.");
    }

    // --- Decode Base64 and Create Blob ---
    let imageBlob: Blob;
    const contentType = `image/${outputFormat}`; // e.g., image/png
    try {
      console.log("API: Decoding base64 image data...");
      // Convert base64 string to Buffer
      const buffer = Buffer.from(imageBase64, "base64");
      // Create Blob from Buffer
      imageBlob = new Blob([buffer], { type: contentType });
      console.log(
        `API: Image data decoded. Size: ${imageBlob.size}, Type: ${contentType}`
      );
    } catch (decodeError) {
      console.error("API Error: Failed to decode base64 image:", decodeError);
      const errorMessage =
        decodeError instanceof Error
          ? decodeError.message
          : "Failed to process generated image data.";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // --- Upload Image to Vercel Blob ---
    let finalBlobUrl: string;
    const filename = `scene-asset-${uuidv4()}.${outputFormat}`;
    try {
      console.log("API: Uploading generated image to Vercel Blob...");
      const blobPathname = `scene-assets/${filename}`;
      const blob = await put(blobPathname, imageBlob, {
        access: "public",
        token: blobToken,
        contentType: contentType,
      });
      finalBlobUrl = blob.url;
      console.log(`API: Image uploaded to Vercel Blob: ${finalBlobUrl}`);
    } catch (uploadError) {
      console.error("API Error: Failed to upload image to Blob:", uploadError);
      const errorMessage =
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload image to storage.";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // --- Save Asset Record to Database ---
    let newAssetId: string;
    try {
      console.log("API: Creating asset record in database...");
      // TODO: Get actual logged-in user ID from auth context/session
      const placeholderUserId = "00000000-0000-0000-0000-000000000000"; // Replace with real user ID

      const newAssetResult = await db
        .insert(asset)
        .values({
          filename: filename,
          storageKey: finalBlobUrl, // Store the final public URL
          mimeType: contentType,
          fileSizeBytes: imageBlob.size,
          uploadedBy: placeholderUserId, // Use actual user ID
          description: visualDescription, // Use visual desc as description
          altText: `AI generated image for scene: ${
            script?.substring(0, 50) || visualDescription.substring(0, 50)
          }...`, // Generate alt text
        })
        .returning({ id: asset.id });

      if (!newAssetResult || newAssetResult.length === 0) {
        // Consider deleting from blob storage if DB insert fails
        // await del(finalBlobUrl, { token: blobToken });
        throw new Error("Failed to create asset record after upload.");
      }
      newAssetId = newAssetResult[0].id;
      console.log(`API: Asset record created with ID: ${newAssetId}`);
    } catch (dbError) {
      console.error("API Error: Failed to save asset to DB:", dbError);
      const errorMessage =
        dbError instanceof Error
          ? dbError.message
          : "Failed to save asset metadata.";
      // Consider deleting uploaded blob file here
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // --- Return Success Response ---
    console.log("API: Image generation process completed successfully.");
    return NextResponse.json(
      {
        message: "Image generated and saved successfully",
        assetId: newAssetId,
        assetUrl: finalBlobUrl, // Return the final URL
      },
      { status: 201 }
    );
  } catch (error) {
    // Catch any unhandled errors during the process
    console.error(
      "API Error: Unhandled error in POST /api/generate-image:",
      error
    );
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
