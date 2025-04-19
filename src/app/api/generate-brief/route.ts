import { NextResponse } from "next/server";
import OpenAI from "openai";
import * as cheerio from "cheerio"; // Import cheerio

// Ensure you have OPENAI_API_KEY in your .env.local
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define interfaces matching the final desired structure
interface Visual {
  description: string;
  imageUrl: string;
}
interface Scene {
  sceneNumber: number;
  sceneTitle: string;
  script: string;
  tone: string[];
  timeSeconds: number;
  visual: Visual;
}
interface BriefData {
  title: string;
  language: string;
  scenes: Scene[];
  error?: string; // Allow error property from initial parse
}

// Define the *TARGET* JSON structure based on the user's latest example
const targetBriefSchemaString = `{
  "title": "string (Compelling title based on content)",
  "language": "string (Detected language code, e.g., 'da' or 'en')",
  "scenes": [
    {
      "sceneNumber": "integer (1-5)",
      "sceneTitle": "string (Short, descriptive title)",
      "script": "string (Brief script/action)",
      "tone": ["string (Enum: Relaterende, Spørgende, Forstående, Ægte, Informativ, Positiv, Praktisk, Inspirerende, Opmuntrende, Oprigtig)"],
      "timeSeconds": "number (Estimated duration)",
      "visual": {
        "description": "string (Visual description)",
        "imageUrl": "string (Placeholder URL like https://via.placeholder.com/600x400?text=Scene+[Num]+Visual)"
      }
    }
    // Repeat for 5 scenes total
  ]
}`;

interface RequestBody {
  url: string;
}

// Helper function to extract text content using Cheerio
function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html);
  // Remove script and style tags
  $("script, style").remove();
  // Get text from the body, trying common content containers
  let text = $("article").text() || $("main").text() || $("body").text();
  // Simple cleanup: replace multiple whitespace/newlines with single spaces
  text = text.replace(/\s\s+/g, " ").trim();
  // Limit length to avoid excessive tokens (adjust limit as needed)
  const maxLength = 15000; // Approx 4k tokens
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate URL format (basic check)
    try {
      new URL(url);
    } catch (_) {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    console.log(`API: Received request for URL: ${url}`);

    // --- Fetch and Extract Text ---
    let pageText: string;
    try {
      console.log(`API: Fetching content from ${url}...`);
      const response = await fetch(url, {
        headers: { "User-Agent": "UGC-Builder-Bot/1.0" },
      }); // Add a user-agent
      if (!response.ok) {
        throw new Error(
          `Failed to fetch URL: ${response.status} ${response.statusText}`
        );
      }
      const html = await response.text();
      console.log(`API: Extracting text from HTML...`);
      pageText = extractTextFromHtml(html);
      if (!pageText || pageText.length < 50) {
        // Basic check if extraction yielded anything meaningful
        console.warn(
          `API: Extracted text seems too short or empty from ${url}`
        );
        throw new Error(
          "Could not extract sufficient text content from the provided URL."
        );
      }
      console.log(`API: Extracted text length: ${pageText.length}`);
    } catch (fetchError) {
      console.error(`API: Error fetching or parsing URL ${url}:`, fetchError);
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to fetch or parse content from URL.";
      return NextResponse.json({ error: message }, { status: 500 }); // Use 500 for server-side fetch issues
    }
    // --- End Fetch and Extract ---

    // --- Generate Initial Text Brief ---
    let briefJson: BriefData;
    try {
      const prompt = `You are an expert creative director specializing in User Generated Content (UGC) ads.
    Based *only* on the following text content scraped from a webpage:
    --- START SCRAPED TEXT ---
    ${pageText}
    --- END SCRAPED TEXT ---

    **Task:** Generate a concise 5-scene UGC ad brief.

    **Instructions:**
    1.  Analyze the main topic, product(s), or service described in the scraped text.
    2.  Create a compelling title for the UGC ad brief based on the content.
    3.  Detect the primary language of the text and specify its code (e.g., 'da', 'en').
    4.  Develop a logical 5-scene storyboard for a short video ad (e.g., TikTok, Instagram Reels).
    5.  For each scene, provide: sceneNumber (1-5), sceneTitle, script, tone (choose from: Relaterende, Spørgende, Forstående, Ægte, Informativ, Positiv, Praktisk, Inspirerende, Opmuntrende, Oprigtig), timeSeconds, and visual description.
    6.  For visual imageUrl, use a placeholder like "https://via.placeholder.com/600x400?text=Scene+[Number]+Visual".
    7.  **Crucially:** Format the *entire* output as a single, valid JSON object conforming *exactly* to this structure (do not add any explanations or markdown outside the JSON):
        \`\`\`json
        ${targetBriefSchemaString}
        \`\`\`

    If the provided text is insufficient to generate a meaningful 5-scene brief, return a JSON object with only an "error" key: \`{"error": "Insufficient content provided to generate brief."}\``;

      console.log("API: Calling OpenAI for text brief...");
      const textResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      console.log("API: OpenAI text response received.");
      const messageContent = textResponse.choices[0]?.message?.content;
      if (!messageContent) {
        throw new Error("No text content received from AI model.");
      }

      try {
        briefJson = JSON.parse(messageContent);
        console.log("API: Successfully parsed JSON text brief.");
        if (briefJson.error) {
          throw new Error(briefJson.error);
        } // Throw AI error
        // Validate structure
        if (
          !briefJson.title ||
          !briefJson.language ||
          !briefJson.scenes ||
          briefJson.scenes.length !== 5
        ) {
          throw new Error("Generated text brief structure is invalid.");
        }
      } catch (parseError) {
        console.error(
          "API Error: Failed to parse text JSON:",
          messageContent,
          parseError
        );
        throw new Error(
          "Invalid JSON format received from AI model for text brief."
        );
      }
    } catch (openaiError) {
      console.error("API Error: OpenAI text call failed:", openaiError);
      if (openaiError instanceof OpenAI.APIError) {
        return NextResponse.json(
          {
            error: `OpenAI Text API Error: ${openaiError.status} ${openaiError.message}`,
          },
          { status: openaiError.status || 500 }
        );
      }
      const message =
        openaiError instanceof Error
          ? openaiError.message
          : "Failed to generate text brief via OpenAI.";
      return NextResponse.json({ error: message }, { status: 500 }); // Return error if text gen fails
    }

    // --- Return Final Brief (Text Only) ---
    return NextResponse.json(briefJson, { status: 200 });
  } catch (error) {
    // This catches errors from the main try block, including text gen failures re-thrown or fetch errors
    console.error(
      "API Error: Unhandled error in POST /api/generate-brief:",
      error
    );
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
