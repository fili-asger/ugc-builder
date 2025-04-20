"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Import useRouter
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Image from "next/image"; // Import Next.js Image component

// Define types based on the schema for better type safety
interface Product {
  name: string;
  url: string;
}

interface Visual {
  description: string;
  imageUrl: string;
}

interface Scene {
  sceneNumber: number;
  sceneTitle: string;
  script: string; // Manus
  tone: string[];
  timeSeconds: number;
  visual: Visual;
}

// --- UPDATED BriefData interface ---
interface BriefData {
  title: string;
  language: string;
  // notes: { // Removed notes
  //   disclaimer: string;
  // };
  // products: Product[]; // Removed products (now handled in prompt, not returned)
  scenes: Scene[];
  id?: string; // Optional ID
}
// --- END UPDATED INTERFACE ---

// Sample data conforming to the schema (using Danish from image where applicable)
// REMOVING SAMPLE DATA as it's no longer used for display before generation
/* 
const sampleBrief: BriefData = {
  title: "EASIS- Perfekt morgenmad og snacks - gjort nemt!",
  language: "da", // Added language
  scenes: [
    { sceneNumber: 1, sceneTitle: "Den perfekte morgenmad starter her", script: "Har du også svært ved at finde det helt rigtige morgenmadsprodukt, som både er sundere og smager godt?", tone: ["Relaterende", "Spørgende"], timeSeconds: 4, visual: { description: "Tæt på influencerens ansigt i et køkkenmiljø, med en skål yoghurt og EASIS Classic Crunch ved siden af.", imageUrl: "https://via.placeholder.com/600x400/cccccc/969696?text=Scene+1+Visual" } }, 
    // ... other sample scenes ...
  ]
};
*/

export default function Home() {
  const [url, setUrl] = useState("");
  // Remove briefData state from home page
  // const [briefData, setBriefData] = useState<BriefData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); // Initialize router

  const handleGenerateBrief = async () => {
    setIsLoading(true);
    // setBriefData(null); // No longer needed here
    setError(null);

    try {
      if (!url) throw new Error("Please enter a URL.");

      // --- Call the backend API ---
      const response = await fetch("/api/generate-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Failed to parse error response from server.",
        }));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data: BriefData = await response.json();
      // ----

      console.log("Received text brief data:", data);
      // setBriefData(data); // Don't set state here

      // --- Navigate to brief page with ID ---
      if (data.id) {
        // Check if the ID exists in the response
        router.push(`/brief?id=${data.id}`);
      } else {
        // Handle cases where ID might be missing (e.g., DB save failed silently)
        // Option 1: Show error to user
        console.error("Frontend Error: Brief ID not found in response.");
        setError("Failed to get brief ID after generation. Cannot navigate.");
        setIsLoading(false); // Stop loading indicator
        // Option 2: Fallback to old method (if desired, but less ideal)
        // const briefQueryParam = encodeURIComponent(JSON.stringify(data));
        // router.push(`/brief?data=${briefQueryParam}`);
      }
      // --- End Navigation ---
    } catch (err) {
      console.error("Frontend Error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unknown error occurred during brief generation."
      );
      setIsLoading(false); // Ensure loading stops on error
    }
    // Don't set isLoading false here, navigation will happen
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-16 space-y-8 bg-slate-50 dark:bg-slate-950">
      {/* Input Section */}
      {/* Only show this section if not loading (or add other conditions if needed) */}
      {/* {!briefData && ( // Remove briefData condition */}
      <div className="w-full max-w-xl space-y-4 p-6 bg-card text-card-foreground rounded-lg shadow">
        <h1 className="text-3xl font-semibold text-center">UGC Builder</h1>
        <div className="flex w-full items-center space-x-2">
          <Input
            type="url"
            placeholder="Enter landing page URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            className="flex-grow"
          />
          <Button
            onClick={handleGenerateBrief}
            disabled={isLoading}
            className="shrink-0"
          >
            {isLoading ? "Generating..." : "Generate Script"}
          </Button>
        </div>
        {/* Show error only when input is visible */}
        {error && !isLoading && (
          <p className="text-red-500 text-sm text-center pt-2">{error}</p>
        )}
      </div>
      {/* )} // Remove briefData condition */}

      {/* Brief Display Section - REMOVED FROM HOME PAGE */}
    </main>
  );
}
