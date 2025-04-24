"use client"; // Or remove if server component initially

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  PlusCircle,
  Trash2,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandSelectItem } from "@/app/api/brands/route"; // Adjust path if needed
// Assuming actor route exports a similar type, adjust if needed
// We might need to define this explicitly if not exported
interface ActorSelectItem {
  actorId: string;
  name: string;
  // Add other fields if the API returns more and they are needed for display potentially
}
// Explicitly import enum values from schema (adjust path as necessary)
import { briefStatusEnum } from "@/db/schema";

// Removed tempId
interface SceneData {
  sceneNumber: number;
  script: string;
  tone: string | null;
  durationSeconds: number | null;
  visualDescription: string | null;
  mediaAssetId?: string | null; // Added for future asset selection
}

export default function CreateBriefPage() {
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState("");
  const [brandId, setBrandId] = useState<string | undefined>(undefined);
  const [actorId, setActorId] = useState<string | undefined>(undefined);
  const [information, setInformation] = useState("");
  const [status, setStatus] = useState<string>(briefStatusEnum.enumValues[0]); // Default to 'draft'
  const [deliverableType, setDeliverableType] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [scenes, setScenes] = useState<SceneData[]>([
    // Initial scene without tempId
    {
      sceneNumber: 1,
      script: "",
      tone: null,
      durationSeconds: null,
      visualDescription: null,
      mediaAssetId: null,
    },
  ]);

  // Data Fetching State
  const [brands, setBrands] = useState<BrandSelectItem[]>([]);
  const [actors, setActors] = useState<ActorSelectItem[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingActors, setLoadingActors] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch Brands and Actors
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchError(null);
        // Fetch Brands
        setLoadingBrands(true);
        const brandsRes = await fetch("/api/brands");
        if (!brandsRes.ok) throw new Error("Failed to fetch brands");
        const brandsData: BrandSelectItem[] = await brandsRes.json();
        setBrands(brandsData);
        setLoadingBrands(false);

        // Fetch Actors
        setLoadingActors(true);
        const actorsRes = await fetch("/api/actors");
        if (!actorsRes.ok) throw new Error("Failed to fetch actors");
        // TODO: Define ActorSelectItem based on actual API response if needed
        const actorsData: ActorSelectItem[] = await actorsRes.json(); // Assuming API returns this structure
        setActors(actorsData);
        setLoadingActors(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setFetchError(
          error instanceof Error ? error.message : "An error occurred"
        );
        setLoadingBrands(false);
        setLoadingActors(false);
      }
    };
    fetchData();
  }, []);

  // Scene Management Functions
  const addScene = () => {
    setScenes((prevScenes) => [
      ...prevScenes,
      {
        // Removed tempId
        sceneNumber: prevScenes.length + 1, // Auto-increment scene number
        script: "",
        tone: null,
        durationSeconds: null,
        visualDescription: null,
        mediaAssetId: null, // Initialize new scene asset id
      },
    ]);
  };

  // Use index to remove scene
  const removeScene = (indexToRemove: number) => {
    setScenes((prevScenes) => {
      const filteredScenes = prevScenes.filter(
        (_, index) => index !== indexToRemove
      );
      // Renumber scenes after removal
      return filteredScenes.map((scene, index) => ({
        ...scene,
        sceneNumber: index + 1,
      }));
    });
  };

  // Use index to handle change
  const handleSceneChange = (
    indexToChange: number,
    field: keyof Omit<SceneData, "sceneNumber">, // Exclude sceneNumber as it's managed
    value: string | number | null
  ) => {
    setScenes((prevScenes) =>
      prevScenes.map((scene, index) => {
        if (index === indexToChange) {
          // Handle number conversion for duration
          const updatedValue =
            field === "durationSeconds"
              ? value === "" || value === null
                ? null
                : Number(value)
              : value;
          return { ...scene, [field]: updatedValue };
        }
        return scene;
      })
    );
  };

  // Form Submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    // Basic Validation (more robust validation can be added)
    if (!title || !brandId) {
      setSubmitError("Title and Brand are required.");
      setIsSubmitting(false);
      return;
    }
    if (scenes.some((scene) => !scene.script)) {
      setSubmitError("All scenes must have a script.");
      setIsSubmitting(false);
      return;
    }
    if (
      scenes.some(
        (scene) =>
          scene.durationSeconds !== null && isNaN(scene.durationSeconds)
      )
    ) {
      setSubmitError("Scene duration must be a valid number.");
      setIsSubmitting(false);
      return;
    }

    // Prepare payload for API
    const payload = {
      title,
      brandId,
      actorId: actorId || null, // Send null if not selected
      information: information || null,
      status,
      deliverableType: deliverableType || null,
      // Send date as UTC ISO string if selected, otherwise null
      dueDate: dueDate ? dueDate.toISOString() : null,
      // Map scene data (tempId is already gone)
      scenes: scenes.map((scene) => ({
        ...scene,
        // Ensure duration is number or null
        durationSeconds:
          scene.durationSeconds === null ? null : Number(scene.durationSeconds),
        mediaAssetId: scene.mediaAssetId || null, // Include mediaAssetId
      })),
    };

    console.log("Submitting payload:", payload);

    try {
      const response = await fetch("/api/briefs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Submission Error Response:", errorData);
        throw new Error(errorData.error || "Failed to create brief");
      }

      const result = await response.json();
      console.log("Brief created successfully:", result);
      // Redirect to the main briefs page after successful creation
      router.push("/briefs");
    } catch (error) {
      console.error("Submission failed:", error);
      setSubmitError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-8">
      <div className="flex items-center mb-4">
        <h1 className="font-semibold text-lg md:text-2xl">Create New Brief</h1>
      </div>

      {fetchError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {fetchError}. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* --- Basic Brief Details Card --- */}
        <Card>
          <CardHeader>
            <CardTitle>Brief Details</CardTitle>
            <CardDescription>
              Provide the main information for this brief.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g., Summer Campaign UGC Video"
                disabled={isSubmitting}
              />
            </div>

            {/* Brand */}
            <div className="space-y-1.5">
              <Label htmlFor="brand">Brand *</Label>
              <Select
                value={brandId}
                onValueChange={setBrandId}
                required
                disabled={loadingBrands || isSubmitting}
              >
                <SelectTrigger id="brand">
                  <SelectValue
                    placeholder={loadingBrands ? "Loading..." : "Select brand"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {!loadingBrands && brands.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No brands found.
                    </div>
                  )}
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actor (Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="actor">Actor</Label>
              <Select
                value={actorId}
                onValueChange={setActorId}
                disabled={loadingActors || isSubmitting}
              >
                <SelectTrigger id="actor">
                  <SelectValue
                    placeholder={
                      loadingActors ? "Loading..." : "Select actor (optional)"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {!loadingActors && actors.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No actors found.
                    </div>
                  )}
                  {actors.map((actor) => (
                    <SelectItem key={actor.actorId} value={actor.actorId}>
                      {actor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={setStatus}
                disabled={isSubmitting}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {briefStatusEnum.enumValues.map((statusValue) => (
                    <SelectItem
                      key={statusValue}
                      value={statusValue}
                      className="capitalize"
                    >
                      {statusValue.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date (Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                    disabled={isSubmitting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? (
                      format(dueDate, "PPP")
                    ) : (
                      <span>Pick a date (optional)</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Deliverable Type (Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="deliverableType">Deliverable Type</Label>
              <Input
                id="deliverableType"
                value={deliverableType}
                onChange={(e) => setDeliverableType(e.target.value)}
                placeholder="e.g., TikTok Video (optional)"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* --- Information Card --- */}
        <Card>
          <CardHeader>
            <CardTitle>Information / Notes</CardTitle>
            <CardDescription>
              Add any relevant background, instructions, or context (optional).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="information"
              value={information}
              onChange={(e) => setInformation(e.target.value)}
              placeholder="Voice & Tone: Upbeat and authentic...
Key Message: Product X helps you save time...
Mandatories: Show product packaging clearly."
              rows={5}
              disabled={isSubmitting}
            />
          </CardContent>
        </Card>

        {/* --- Scenes Card --- */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Scenes</CardTitle>
                <CardDescription>
                  Define the individual scenes for this brief. Add at least one.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addScene}
                disabled={isSubmitting}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Scene
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {scenes.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Scenes Yet</AlertTitle>
                <AlertDescription>
                  Please add at least one scene to the brief using the button
                  above.
                </AlertDescription>
              </Alert>
            )}

            {/* Scene Items */}
            {scenes.map((scene, index) => (
              <Card key={index} className="bg-muted/30 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/50 px-4 py-2 border-b">
                  <CardTitle className="text-sm font-medium">
                    Scene {scene.sceneNumber}
                  </CardTitle>
                  {scenes.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeScene(index)}
                      disabled={isSubmitting}
                      aria-label="Remove Scene"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Scene Details */}
                  <div className="space-y-4">
                    {/* Script */}
                    <div className="space-y-1.5">
                      <Label htmlFor={`scene-${index}-script`}>Script *</Label>
                      <Textarea
                        id={`scene-${index}-script`}
                        value={scene.script}
                        onChange={(e) =>
                          handleSceneChange(index, "script", e.target.value)
                        }
                        required
                        placeholder={`Enter script...`}
                        rows={4}
                        disabled={isSubmitting}
                        className="min-h-[100px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Tone */}
                      <div className="space-y-1.5">
                        <Label htmlFor={`scene-${index}-tone`}>Tone</Label>
                        <Input
                          id={`scene-${index}-tone`}
                          value={scene.tone ?? ""}
                          onChange={(e) =>
                            handleSceneChange(
                              index,
                              "tone",
                              e.target.value || null
                            )
                          }
                          placeholder="e.g., Energetic"
                          disabled={isSubmitting}
                        />
                      </div>
                      {/* Duration */}
                      <div className="space-y-1.5">
                        <Label htmlFor={`scene-${index}-duration`}>
                          Duration (sec)
                        </Label>
                        <Input
                          id={`scene-${index}-duration`}
                          type="number"
                          min="0"
                          step="0.1"
                          value={scene.durationSeconds ?? ""}
                          onChange={(e) =>
                            handleSceneChange(
                              index,
                              "durationSeconds",
                              e.target.value
                            )
                          }
                          placeholder="e.g., 5.5"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* Visual Description */}
                    <div className="space-y-1.5">
                      <Label htmlFor={`scene-${index}-visuals`}>
                        Visual Description
                      </Label>
                      <Textarea
                        id={`scene-${index}-visuals`}
                        value={scene.visualDescription ?? ""}
                        onChange={(e) =>
                          handleSceneChange(
                            index,
                            "visualDescription",
                            e.target.value || null
                          )
                        }
                        placeholder="Describe camera angles, setting, on-screen text..."
                        rows={3}
                        disabled={isSubmitting}
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>

                  {/* Right Column: Asset Selection Placeholder */}
                  <div className="space-y-1.5 flex flex-col">
                    <Label htmlFor={`scene-${index}-asset`}>
                      Inspiration Asset
                    </Label>
                    <div className="flex-grow aspect-video border rounded-md flex items-center justify-center bg-background text-muted-foreground">
                      <div className="text-center p-4">
                        <ImageIcon className="mx-auto h-10 w-10 mb-2" />
                        <p className="text-sm mb-1">
                          Select Asset (Coming Soon)
                        </p>
                        <p className="text-xs">
                          Choose an existing image, video, or GIF.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled
                      className="mt-2"
                    >
                      Select Asset...
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* --- Submission Area --- */}
        <div className="flex justify-end items-center gap-4 pt-4">
          {submitError && (
            <Alert variant="destructive" className="flex-1 mr-4 p-2 text-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Submission Error</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              loadingBrands ||
              loadingActors ||
              scenes.length === 0
            }
          >
            {isSubmitting ? "Creating..." : "Create Brief"}
          </Button>
        </div>
      </form>
    </main>
  );
}
