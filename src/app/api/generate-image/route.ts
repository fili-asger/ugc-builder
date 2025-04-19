// File: ugc-builder/src/app/api/generate-image/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RequestBody {
  prompt: string;
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required and must be a string" },
        { status: 400 }
      );
    }

    console.log(
      `API: Received request to generate image for prompt: ${prompt.substring(
        0,
        80
      )}...`
    );

    try {
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt, // Use the prompt directly from the request
        n: 1,
        size: "1024x1792", // 9:16 aspect ratio
        response_format: "url",
      });

      const imageUrl = imageResponse.data[0]?.url;

      if (!imageUrl) {
        console.error("API Error: No image URL received from OpenAI.");
        throw new Error("Failed to retrieve image URL from OpenAI.");
      }

      console.log("API: Image generated successfully.");
      return NextResponse.json({ imageUrl: imageUrl }, { status: 200 });
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
  } catch (error) {
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
