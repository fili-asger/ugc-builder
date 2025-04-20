"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image"; // Keep for later

// --- Define interfaces matching the API response ---
interface Visual {
  description: string;
  imageUrl: string; // Will initially be placeholder
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
}

// --- Define Actor Profile Interface ---
interface ActorProfile {
  creatorId: string;
  name: { display: string; first?: string; last?: string };
  handle?: string;
  headshotUrl?: string;
  languages: string[];
  location?: { country?: string; city?: string; timezone?: string };
  primaryPlatform: string;
  platforms?: Array<{
    platform: string;
    handle: string;
    followers: number;
    avgViews?: number;
    engagementRate?: number;
  }>;
  audience: {
    totalFollowers: number;
    topCountries?: string[];
    ageSplit?: Array<{ range: string; percent: number }>;
    genderSplit?: { female?: number; male?: number; other?: number };
  };
  contentStyle?: string[];
  strengths?: string;
  portfolio?: Array<{
    title: string;
    url: string;
    brand?: string;
    date?: string;
  }>;
  availability?: {
    acceptsGifted?: boolean;
    acceptsPaid?: boolean;
    minFee?: { currency: string; amount: number };
    blacklistCategories?: string[];
  };
  contact: {
    email: string;
    phone?: string;
    manager?: string;
    website?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}
// --- END INTERFACES ---

// --- Sample Actor Data ---
const sampleActor: ActorProfile = {
  creatorId: "creator-123",
  name: { display: "Jane Doe", first: "Jane", last: "Doe" },
  handle: "@jane_doe_ugc",
  headshotUrl: "https://via.placeholder.com/150", // Placeholder headshot
  languages: ["en-US", "da"],
  location: {
    country: "DK",
    city: "Copenhagen",
    timezone: "Europe/Copenhagen",
  },
  primaryPlatform: "Instagram",
  platforms: [
    {
      platform: "Instagram",
      handle: "jane_doe_ugc",
      followers: 15000,
      engagementRate: 0.045,
    },
    {
      platform: "TikTok",
      handle: "janedoetok",
      followers: 25000,
      avgViews: 10000,
    },
  ],
  audience: {
    totalFollowers: 40000,
    topCountries: ["DK", "US", "SE"],
    ageSplit: [
      { range: "18-24", percent: 0.4 },
      { range: "25-34", percent: 0.5 },
    ],
    genderSplit: { female: 0.7, male: 0.3 },
  },
  contentStyle: ["Lifestyle", "Beauty", "Food"],
  strengths:
    "Authentic, relatable tone. Great at natural product integration. Experienced with short-form video.",
  portfolio: [
    {
      title: "Skincare Routine Ad",
      url: "https://example.com/portfolio1",
      brand: "GlowCo",
      date: "2024-03-15",
    },
    {
      title: "Cafe Promotion",
      url: "https://example.com/portfolio2",
      brand: "Local Cafe",
      date: "2024-02-10",
    },
  ],
  availability: {
    acceptsGifted: true,
    acceptsPaid: true,
    minFee: { currency: "DKK", amount: 1500 },
    blacklistCategories: ["Gambling"],
  },
  contact: {
    email: "jane.doe.ugc@example.com",
    phone: "+45 12345678",
    website: "https://example.com/ugc",
  },
  createdAt: "2023-11-01T10:00:00Z",
  updatedAt: "2024-04-21T15:30:00Z",
};
// --- END SAMPLE ACTOR DATA ---

// Component to display the brief and actor data
function BriefDisplay() {
  const searchParams = useSearchParams();
  const [briefData, setBriefData] = useState<BriefData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actorData, setActorData] = useState<ActorProfile>(sampleActor); // Use sample data for now

  // State for individual scene image generation
  const [sceneImageUrls, setSceneImageUrls] = useState<Record<number, string>>(
    {}
  );
  const [sceneImageLoading, setSceneImageLoading] = useState<
    Record<number, boolean>
  >({});
  const [sceneImageErrors, setSceneImageErrors] = useState<
    Record<number, string | null>
  >({});

  useEffect(() => {
    const fetchBriefData = async () => {
      setLoading(true);
      setError(null);
      setBriefData(null); // Clear previous data

      const briefId = searchParams.get("id");

      if (briefId) {
        try {
          const response = await fetch(`/api/get-brief/${briefId}`);
          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Failed to parse error response" }));
            throw new Error(
              errorData.error || `Failed to fetch brief: ${response.status}`
            );
          }
          const parsedData: BriefData = await response.json();

          // Basic validation (can be enhanced)
          if (!parsedData.title || !parsedData.scenes) {
            throw new Error("Invalid brief data received from API.");
          }
          setBriefData(parsedData);
        } catch (e) {
          console.error("Failed to fetch or parse brief data:", e);
          setError(
            e instanceof Error ? e.message : "Failed to load brief data."
          );
        }
      } else {
        setError("No brief ID found in URL.");
      }
      setLoading(false);
    };

    fetchBriefData();
  }, [searchParams]);

  // --- Function to handle individual image generation ---
  const handleGenerateImage = async (sceneIndex: number) => {
    if (!briefData) return;
    const scene = briefData.scenes[sceneIndex];
    const sceneNum = scene.sceneNumber;

    setSceneImageLoading((prev) => ({ ...prev, [sceneNum]: true }));
    setSceneImageErrors((prev) => ({ ...prev, [sceneNum]: null }));

    const imagePrompt = `UGC ad style visual for scene ${sceneNum}: ${scene.visual.description}. Style: realistic, modern, relatable. Aspect ratio 9:16.`;

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: imagePrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Failed to parse error from image generation server.",
        }));
        throw new Error(
          errorData.error || `Image generation failed: ${response.status}`
        );
      }

      const data = await response.json();
      if (data.imageUrl) {
        setSceneImageUrls((prev) => ({ ...prev, [sceneNum]: data.imageUrl }));
      } else {
        throw new Error("No image URL received from API.");
      }
    } catch (err) {
      console.error(`Error generating image for scene ${sceneNum}:`, err);
      setSceneImageErrors((prev) => ({
        ...prev,
        [sceneNum]: err instanceof Error ? err.message : "Unknown error",
      }));
    } finally {
      setSceneImageLoading((prev) => ({ ...prev, [sceneNum]: false }));
    }
  };
  // --- End image generation function ---

  // --- SKELETON LOADER ---
  if (loading) {
    return (
      <div className="w-full max-w-5xl space-y-8 animate-pulse">
        <Skeleton className="h-10 w-3/4 mb-6" /> {/* Title Skeleton */}
        <Skeleton className="h-10 w-48 mb-4" /> {/* Tabs List Skeleton */}
        {/* Can add more specific skeletons for tab content if needed */}
        <Card className="overflow-hidden shadow-md">
          <Skeleton className="h-12 w-full" />
          <div className="p-4">
            <Skeleton className="h-48 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-lg">{error}</p>;
  }

  if (!briefData) {
    return <p className="text-muted-foreground">Could not load brief.</p>;
  }

  // --- BRIEF & ACTOR DISPLAY with TABS ---
  return (
    <div className="w-full max-w-5xl space-y-6">
      <h2 className="text-3xl font-semibold text-left">{briefData.title}</h2>

      <Tabs defaultValue="brief" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="brief">Brief</TabsTrigger>
          <TabsTrigger value="actor">Actor</TabsTrigger>
        </TabsList>

        {/* --- BRIEF TAB CONTENT --- */}
        <TabsContent value="brief" className="mt-4">
          <div className="space-y-6">
            {briefData.scenes.map((scene, index) => {
              const sceneNum = scene.sceneNumber;
              const currentImageUrl = sceneImageUrls[sceneNum];
              const isLoadingImage = sceneImageLoading[sceneNum];
              const imageError = sceneImageErrors[sceneNum];

              return (
                <Card key={sceneNum} className="overflow-hidden shadow-md">
                  {/* Scene Title Bar */}
                  <div className="bg-amber-100 dark:bg-amber-900/30 p-3 border-b">
                    <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                      #{sceneNum} Scene: {scene.sceneTitle}
                    </h3>
                  </div>
                  {/* Scene Content Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-4">
                    {/* Left Column: Details */}
                    <div className="space-y-3">
                      <div className="flex flex-row">
                        <p className="font-semibold w-20 flex-shrink-0">
                          Manus
                        </p>
                        <p className="text-muted-foreground">{scene.script}</p>
                      </div>
                      <div className="flex flex-row items-center">
                        <p className="font-semibold w-20 flex-shrink-0">Tone</p>
                        <div className="flex flex-wrap gap-1">
                          {scene.tone.map((t) => (
                            <Badge key={t} variant="secondary">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-row">
                        <p className="font-semibold w-20 flex-shrink-0">Time</p>
                        <p className="text-muted-foreground">
                          {scene.timeSeconds} sekunder
                        </p>
                      </div>
                      <div className="flex flex-row">
                        <p className="font-semibold w-20 flex-shrink-0">
                          Visual
                        </p>
                        <p className="text-muted-foreground">
                          {scene.visual.description}
                        </p>
                      </div>
                    </div>
                    {/* Right Column: Image Display Logic */}
                    <div className="flex flex-col items-center justify-center space-y-2 min-h-[333px] bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                      {isLoadingImage ? (
                        <div className="flex flex-col items-center justify-center w-[500px] max-w-full h-[333px]">
                          <Skeleton className="h-full w-full rounded-lg" />
                          <p className="text-sm text-muted-foreground mt-2">
                            Generating image...
                          </p>
                        </div>
                      ) : currentImageUrl ? (
                        <Image
                          src={currentImageUrl}
                          alt={`Generated visual for Scene ${sceneNum}: ${scene.sceneTitle}`}
                          width={500}
                          height={333}
                          className="rounded-lg object-cover border shadow-sm"
                          priority={sceneNum === 1}
                        />
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground text-center">
                            Click button to generate image
                          </p>
                          <Button
                            onClick={() => handleGenerateImage(index)}
                            disabled={isLoadingImage}
                          >
                            Generate Image
                          </Button>
                          {imageError && (
                            <p className="text-xs text-red-500 text-center pt-1">
                              Error: {imageError}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* --- ACTOR TAB CONTENT --- */}
        <TabsContent value="actor" className="mt-4">
          {/* Display Actor Information - Example Structure */}
          <Card className="p-6">
            <CardHeader className="flex flex-row items-center gap-4 p-0 pb-4 mb-4 border-b">
              {actorData.headshotUrl && (
                <Image
                  src={actorData.headshotUrl}
                  alt={actorData.name.display}
                  width={80}
                  height={80}
                  className="rounded-full border"
                />
              )}
              <div>
                <CardTitle className="text-2xl">
                  {actorData.name.display}
                </CardTitle>
                {actorData.handle && (
                  <CardDescription>{actorData.handle}</CardDescription>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {actorData.languages.map((lang) => (
                    <Badge key={lang} variant="outline">
                      {lang}
                    </Badge>
                  ))}
                  {actorData.location?.city && (
                    <Badge variant="outline">
                      {actorData.location.city}, {actorData.location.country}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-0">
              <div>
                <h4 className="font-semibold mb-1">Primary Platform:</h4>
                <Badge>{actorData.primaryPlatform}</Badge> (
                {actorData.audience.totalFollowers.toLocaleString()} followers)
              </div>
              {actorData.platforms && actorData.platforms.length > 1 && (
                <div>
                  <h4 className="font-semibold mb-1">Other Platforms:</h4>
                  {/* Display other platforms - could be a list or table */}
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {actorData.platforms
                      .filter((p) => p.platform !== actorData.primaryPlatform)
                      .map((p) => (
                        <li key={p.platform}>
                          {p.platform}: {p.handle} (
                          {p.followers.toLocaleString()} followers)
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {actorData.contentStyle && (
                <div>
                  <h4 className="font-semibold mb-1">Content Style:</h4>
                  <div className="flex flex-wrap gap-1">
                    {actorData.contentStyle.map((style) => (
                      <Badge key={style} variant="secondary">
                        {style}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {actorData.strengths && (
                <div>
                  <h4 className="font-semibold">Strengths:</h4>
                  <p className="text-sm text-muted-foreground">
                    {actorData.strengths}
                  </p>
                </div>
              )}
              {/* Add more sections for Audience, Portfolio, Availability, Contact as needed */}
              <div>
                <h4 className="font-semibold">Contact:</h4>
                <p className="text-sm text-muted-foreground">
                  {actorData.contact.email}
                </p>
                {/* Add other contact details */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Main Page component using Suspense for searchParams
export default function BriefPage() {
  return (
    <Suspense fallback={<BriefDisplay />}>
      {" "}
      {/* Render BriefDisplay directly, it handles its own loading based on params */}
      <main className="flex min-h-screen flex-col items-center p-4 md:p-16 space-y-8 bg-slate-50 dark:bg-slate-950">
        <BriefDisplay />
      </main>
    </Suspense>
  );
}
