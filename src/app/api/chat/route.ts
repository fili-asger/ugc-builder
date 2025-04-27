import OpenAI from "openai";
import { NextResponse } from "next/server";
import { AssistantStream } from "openai/lib/AssistantStream";

// Ensure the OpenAI API key is set in environment variables
if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistantId = "asst_D0KgbCoYYsvNCTiZykBQj77y"; // Your Assistant ID

export async function POST(request: Request) {
  try {
    const { message, threadId: existingThreadId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    let threadId = existingThreadId;

    // If no threadId provided, create a new one
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      console.log("Created new thread:", threadId);
    } else {
      console.log("Using existing thread:", threadId);
    }

    // Add the user's message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });
    console.log("Added user message to thread:", message);

    // Run the assistant
    console.log("Running assistant on thread...");
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      // Explicitly ask for JSON format in the instructions for this run
      instructions: `Please generate or update the brief based on the user's request. Format the output as a JSON object following this structure: 
      {
        "title": "Generated Brief Title String",
        "summaryOfChanges": "A brief summary describing the changes made in this response.",
        "scenes": [
          {
            "sceneNumber": 1, // Ensure this is a number
            "script": "Generated script for scene 1...",
            "tone": "Suggested tone (e.g., 'Excited', 'Informative', null)",
            "durationSeconds": 10, // Optional number
            "visualDescription": "Description of visuals for scene 1... (optional, null)"
          },
          // ... more scenes
        ]
      }
      Ensure the output is ONLY the JSON object, without any surrounding text or markdown formatting. The 'summaryOfChanges' field is mandatory and should concisely explain what was updated.`,
      // Note: If your assistant is *already* configured with instructions to always use JSON,
      // you might alternatively set `response_format: { type: "json_object" }` here,
      // but the instructions approach is often more reliable and explicitly satisfies the error condition.
    });

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    const startTime = Date.now();
    const timeout = 60000; // 60 seconds timeout

    while (
      runStatus.status === "queued" ||
      runStatus.status === "in_progress"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      console.log("Run status:", runStatus.status);

      if (Date.now() - startTime > timeout) {
        console.error("Run timed out.");
        await openai.beta.threads.runs.cancel(threadId, run.id); // Attempt to cancel
        return NextResponse.json(
          { error: "Assistant run timed out" },
          { status: 504 } // Gateway Timeout
        );
      }
    }

    if (runStatus.status !== "completed") {
      console.error("Run failed with status:", runStatus.status);
      console.error("Run details:", runStatus); // Log the full run object for debugging
      const lastError = runStatus.last_error;
      const errorMessage = lastError
        ? `${lastError.code}: ${lastError.message}`
        : `Assistant run failed with status: ${runStatus.status}`;
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    console.log("Run completed successfully.");

    // Retrieve the latest messages from the thread
    const messages = await openai.beta.threads.messages.list(threadId, {
      order: "desc", // Get the most recent messages first
      limit: 1, // We only need the last message (assistant's response)
    });

    const assistantMessage = messages.data.find((m) => m.role === "assistant");

    if (
      !assistantMessage ||
      !assistantMessage.content ||
      assistantMessage.content.length === 0 ||
      assistantMessage.content[0].type !== "text"
    ) {
      console.error("No valid assistant text response found.");
      return NextResponse.json(
        { error: "No valid assistant response found" },
        { status: 500 }
      );
    }

    const assistantResponseText = assistantMessage.content[0].text.value;
    console.log("Assistant Response:", assistantResponseText);

    // Attempt to parse the JSON brief from the response
    let briefData: any = null; // Use 'any' temporarily for parsing flexibility
    let summaryForChat: string | null = null;

    try {
      // Extract JSON part if necessary (assuming it might be wrapped in text or code blocks)
      const jsonMatch = assistantResponseText.match(
        /```json\n?([\s\S]*?)\n?```|({[\s\S]*})/
      );
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[2]; // Get the content within ```json or the standalone JSON
        briefData = JSON.parse(jsonString);
        console.log("Parsed Brief Data:", briefData);

        // Extract summary for chat display
        if (briefData && typeof briefData.summaryOfChanges === "string") {
          summaryForChat = briefData.summaryOfChanges;
        } else {
          console.warn("Parsed JSON missing 'summaryOfChanges' string.");
          summaryForChat = "Assistant updated the brief (summary missing)."; // Fallback summary
        }
      } else {
        console.warn("Could not find JSON structure in assistant response.");
        // Optionally, return the raw text if JSON is not found
        // briefData = { rawResponse: assistantResponseText };
      }
    } catch (parseError) {
      console.error(
        "Failed to parse JSON from assistant response:",
        parseError
      );
      // Optionally, return the raw text if parsing fails
      // briefData = { rawResponse: assistantResponseText };
    }

    // Return the summary for chat and the full parsed brief data
    return NextResponse.json({
      chatResponseText: summaryForChat ?? assistantResponseText, // Use summary if available, else raw text
      briefData: briefData, // This will be null if parsing failed or JSON wasn't found
      threadId: threadId, // Return the threadId for subsequent requests
    });
  } catch (error) {
    console.error("API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Optional: Handle streaming responses if needed in the future
// (Requires changes in the frontend as well)
// export async function POST(request: Request) {
//   const { message, threadId: existingThreadId } = await request.json();
//   let threadId = existingThreadId;
//   if (!threadId) {
//     const thread = await openai.beta.threads.create();
//     threadId = thread.id;
//   }
//   await openai.beta.threads.messages.create(threadId, { role: "user", content: message });
//   const stream = openai.beta.threads.runs.stream(threadId, { assistant_id: assistantId });
//   // Convert the stream to a NextResponse stream
//   const responseStream = AssistantStream.toReadableStream(stream);
//   return new NextResponse(responseStream);
// }
