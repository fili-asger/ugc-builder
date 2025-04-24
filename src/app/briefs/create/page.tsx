"use client"; // Or remove if server component initially

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  Check,
  ChevronsUpDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandListItem } from "@/app/api/brands/route";
import { ActorTableItem as ActorSelectItem } from "@/app/api/actors/route"; // Use the table item type alias
import { briefStatusEnum, availabilityStatusEnum } from "@/db/schema";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

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
  const [brands, setBrands] = useState<BrandListItem[]>([]);
  const [actors, setActors] = useState<ActorSelectItem[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingActors, setLoadingActors] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Combobox Popover State
  const [brandPopoverOpen, setBrandPopoverOpen] = useState(false);
  const [actorPopoverOpen, setActorPopoverOpen] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Create Brand Modal State
  const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
  const [isSubmittingBrand, setIsSubmittingBrand] = useState(false);
  const [brandModalError, setBrandModalError] = useState<string | null>(null);
  const [createBrandName, setCreateBrandName] = useState("");
  const [createBrandDesc, setCreateBrandDesc] = useState("");
  const [createBrandWebsite, setCreateBrandWebsite] = useState("");
  const [createBrandContactName, setCreateBrandContactName] = useState("");
  const [createBrandContactEmail, setCreateBrandContactEmail] = useState("");
  const [createBrandLogoFile, setCreateBrandLogoFile] = useState<File | null>(
    null
  );
  const [createBrandLogoPreview, setCreateBrandLogoPreview] = useState<
    string | null
  >(null);
  const [brandUploadProgress, setBrandUploadProgress] = useState<number | null>(
    null
  );

  // Create Actor Modal State
  const [showCreateActorModal, setShowCreateActorModal] = useState(false);
  const [isSubmittingActor, setIsSubmittingActor] = useState(false);
  const [actorModalError, setActorModalError] = useState<string | null>(null);
  const [actorUploadProgress, setActorUploadProgress] = useState<number | null>(
    null
  );
  const [createActorFirstName, setCreateActorFirstName] = useState("");
  const [createActorLastName, setCreateActorLastName] = useState("");
  const [createActorEmail, setCreateActorEmail] = useState("");
  const [createActorPhone, setCreateActorPhone] = useState("");
  const [createActorNationality, setCreateActorNationality] = useState("");
  const [createActorAvailability, setCreateActorAvailability] =
    useState<string>(availabilityStatusEnum.enumValues[0]);
  const [createActorHeadshotFile, setCreateActorHeadshotFile] =
    useState<File | null>(null);
  const [createActorHeadshotPreview, setCreateActorHeadshotPreview] = useState<
    string | null
  >(null);

  // Fetch Brands and Actors
  const fetchBrands = async () => {
    setLoadingBrands(true);
    setFetchError(null); // Clear general error before specific fetch
    try {
      const brandsRes = await fetch("/api/brands");
      if (!brandsRes.ok)
        throw new Error(`Failed to fetch brands: ${brandsRes.statusText}`);
      const brandsData: BrandListItem[] = await brandsRes.json();
      setBrands(brandsData);
    } catch (error) {
      console.error("Error fetching brands:", error);
      // Set general error if specific fetch fails
      setFetchError(
        error instanceof Error ? error.message : "Failed to load brands"
      );
    } finally {
      setLoadingBrands(false);
    }
  };

  const fetchActors = async () => {
    setLoadingActors(true);
    setFetchError(null); // Clear general error before specific fetch
    try {
      const actorsRes = await fetch("/api/actors");
      if (!actorsRes.ok)
        throw new Error(`Failed to fetch actors: ${actorsRes.statusText}`);
      const actorsData: ActorSelectItem[] = await actorsRes.json();
      setActors(actorsData);
    } catch (error) {
      console.error("Error fetching actors:", error);
      // Set general error if specific fetch fails
      setFetchError(
        error instanceof Error ? error.message : "Failed to load actors"
      );
    } finally {
      setLoadingActors(false);
    }
  };

  useEffect(() => {
    // Initial fetch on mount
    fetchBrands();
    fetchActors();
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

  // Modal Reset Functions
  const resetBrandModal = () => {
    setCreateBrandName("");
    setCreateBrandDesc("");
    setCreateBrandWebsite("");
    setCreateBrandContactName("");
    setCreateBrandContactEmail("");
    setCreateBrandLogoFile(null);
    setCreateBrandLogoPreview(null);
    setBrandModalError(null);
    setIsSubmittingBrand(false);
    setBrandUploadProgress(null);
  };

  const resetActorModal = () => {
    setCreateActorFirstName("");
    setCreateActorLastName("");
    setCreateActorEmail("");
    setCreateActorPhone("");
    setCreateActorNationality("");
    setCreateActorAvailability(availabilityStatusEnum.enumValues[0]);
    setCreateActorHeadshotFile(null);
    setCreateActorHeadshotPreview(null);
    setActorModalError(null);
    setIsSubmittingActor(false);
    setActorUploadProgress(null);
  };

  // Modal Open/Close Handlers
  const handleBrandModalChange = (open: boolean) => {
    setShowCreateBrandModal(open);
    if (!open) resetBrandModal();
  };

  const handleActorModalChange = (open: boolean) => {
    setShowCreateActorModal(open);
    if (!open) resetActorModal();
  };

  // File Handlers (Brand Logo)
  const handleBrandLogoFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setCreateBrandLogoFile(file);
      setBrandModalError(null);
      setCreateBrandLogoPreview(URL.createObjectURL(file));
    } else {
      setCreateBrandLogoFile(null);
      setCreateBrandLogoPreview(null);
    }
  };

  const clearBrandLogoFile = () => {
    setCreateBrandLogoFile(null);
    setCreateBrandLogoPreview(null);
    const fileInput = document.getElementById(
      "create-brand-logo-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  // File Handlers (Actor Headshot)
  const handleActorHeadshotFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setCreateActorHeadshotFile(file);
      setActorModalError(null);
      setCreateActorHeadshotPreview(URL.createObjectURL(file));
    } else {
      setCreateActorHeadshotFile(null);
      setCreateActorHeadshotPreview(null);
    }
  };

  const clearActorHeadshotFile = () => {
    setCreateActorHeadshotFile(null);
    setCreateActorHeadshotPreview(null);
    const fileInput = document.getElementById(
      "create-actor-headshot-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  // Modal Submission Handlers
  const handleBrandModalCreate = async () => {
    if (!createBrandName) {
      setBrandModalError("Brand name is required.");
      return;
    }
    setIsSubmittingBrand(true);
    setBrandModalError(null);
    setBrandUploadProgress(null);
    let uploadedAssetId: string | null = null;
    try {
      // 1. Upload Logo
      if (createBrandLogoFile) {
        setBrandUploadProgress(0);
        const formData = new FormData();
        formData.append("logo", createBrandLogoFile);
        const uploadResponse = await fetch("/api/assets/upload-logo", {
          method: "POST",
          body: formData,
        });
        setBrandUploadProgress(100);
        if (!uploadResponse.ok) {
          const d = await uploadResponse.json();
          throw new Error(d.error || "Logo upload failed");
        }
        const upRes = await uploadResponse.json();
        uploadedAssetId = upRes.assetId;
        if (!uploadedAssetId)
          throw new Error("No Asset ID returned from upload.");
      }
      // 2. Create Brand
      const payload = {
        name: createBrandName,
        description: createBrandDesc || null,
        website: createBrandWebsite || null,
        primaryContactName: createBrandContactName || null,
        primaryContactEmail: createBrandContactEmail || null,
        logoAssetId: uploadedAssetId,
      };
      const createResponse = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!createResponse.ok) {
        const d = await createResponse.json();
        const details = d.details ? JSON.stringify(d.details) : "";
        throw new Error(
          `${d.error || "Failed to create brand"}${
            details ? `: ${details}` : ""
          }`
        );
      }
      const createdBrand: BrandListItem = await createResponse.json();
      // --- SUCCESS ---
      handleBrandModalChange(false); // Close modal
      await fetchBrands(); // Refetch brands
      setBrandId(createdBrand.id); // Select newly created brand
    } catch (err) {
      setBrandModalError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsSubmittingBrand(false);
      setBrandUploadProgress(null);
    }
  };

  const handleActorModalCreate = async () => {
    if (!createActorFirstName || !createActorLastName) {
      setActorModalError("First and Last name are required.");
      return;
    }
    setIsSubmittingActor(true);
    setActorModalError(null);
    setActorUploadProgress(null);
    let uploadedAssetId: string | null = null;
    try {
      // 1. Upload Headshot
      if (createActorHeadshotFile) {
        setActorUploadProgress(0);
        const uploadResponse = await fetch("/api/assets/upload-headshot", {
          method: "POST",
          headers: {
            "x-vercel-filename": createActorHeadshotFile.name,
            "content-type": createActorHeadshotFile.type,
          },
          body: createActorHeadshotFile,
        });
        setActorUploadProgress(100);
        if (!uploadResponse.ok) {
          const d = await uploadResponse.json();
          throw new Error(d.error || "Headshot upload failed");
        }
        const upRes = await uploadResponse.json();
        uploadedAssetId = upRes.assetId;
        if (!uploadedAssetId)
          throw new Error("No Asset ID returned from upload.");
      }
      // 2. Create Actor
      const payload = {
        firstName: createActorFirstName,
        lastName: createActorLastName,
        email: createActorEmail || null,
        phone: createActorPhone || null,
        nationality: createActorNationality || null,
        headshotAssetId: uploadedAssetId,
        availabilityStatus: createActorAvailability,
      };
      const createResponse = await fetch("/api/actors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!createResponse.ok) {
        const d = await createResponse.json();
        const details = d.details ? JSON.stringify(d.details) : "";
        throw new Error(
          `${d.error || "Failed to create actor"}${
            details ? `: ${details}` : ""
          }`
        );
      }
      const createdActor: ActorSelectItem = await createResponse.json();
      // --- SUCCESS ---
      handleActorModalChange(false); // Close modal
      await fetchActors(); // Refetch actors
      setActorId(createdActor.id); // Select newly created actor
    } catch (err) {
      setActorModalError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsSubmittingActor(false);
      setActorUploadProgress(null);
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
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
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

            {/* Brand ComboBox with Create Button */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="brand">Brand *</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => handleBrandModalChange(true)}
                  disabled={isSubmitting}
                >
                  Create New
                </Button>
              </div>
              <Popover
                open={brandPopoverOpen}
                onOpenChange={setBrandPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={brandPopoverOpen}
                    className="w-full justify-between font-normal"
                    disabled={loadingBrands || isSubmitting}
                  >
                    {brandId
                      ? brands.find((brand) => brand.id === brandId)?.name
                      : loadingBrands
                      ? "Loading..."
                      : "Select brand..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search brand..." />
                    <CommandList>
                      <CommandEmpty>No brand found.</CommandEmpty>
                      <CommandGroup>
                        {brands.map((brand) => (
                          <CommandItem
                            key={brand.id}
                            value={brand.name}
                            onSelect={(currentValue) => {
                              const selectedBrand = brands.find(
                                (b) =>
                                  b.name.toLowerCase() ===
                                  currentValue.toLowerCase()
                              );
                              setBrandId(
                                selectedBrand ? selectedBrand.id : undefined
                              );
                              setBrandPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                brandId === brand.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {brand.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Actor ComboBox with Create Button */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="actor">Actor</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => handleActorModalChange(true)}
                  disabled={isSubmitting}
                >
                  Create New
                </Button>
              </div>
              <Popover
                open={actorPopoverOpen}
                onOpenChange={setActorPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={actorPopoverOpen}
                    className="w-full justify-between font-normal"
                    disabled={loadingActors || isSubmitting}
                  >
                    {actorId
                      ? actors.find((actor) => actor.id === actorId)?.name
                      : loadingActors
                      ? "Loading..."
                      : "Select actor (optional)..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search actor..." />
                    <CommandList>
                      <CommandEmpty>No actor found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__NONE__"
                          onSelect={() => {
                            setActorId(undefined);
                            setActorPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !actorId ? "opacity-100" : "opacity-0"
                            )}
                          />
                          -- None --
                        </CommandItem>
                        {actors.map((actor) => (
                          <CommandItem
                            key={actor.id}
                            value={actor.name}
                            onSelect={(currentValue) => {
                              const selectedActor = actors.find(
                                (a) =>
                                  a.name.toLowerCase() ===
                                  currentValue.toLowerCase()
                              );
                              setActorId(
                                selectedActor ? selectedActor.id : undefined
                              );
                              setActorPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                actorId === actor.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {actor.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Status */}
            <div className="space-y-1.5 flex flex-col">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={setStatus}
                disabled={isSubmitting}
              >
                <SelectTrigger id="status" className="w-full font-normal">
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

      {/* --- Create Brand Dialog --- */}
      <Dialog open={showCreateBrandModal} onOpenChange={handleBrandModalChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Create New Brand</DialogTitle>
            <DialogDescription>Enter brand details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {brandModalError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{brandModalError}</AlertDescription>
              </Alert>
            )}
            {/* Brand Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-brand-name" className="text-right">
                Name *
              </Label>
              <Input
                id="create-brand-name"
                value={createBrandName}
                onChange={(e) => setCreateBrandName(e.target.value)}
                className="col-span-3"
                required
                disabled={isSubmittingBrand}
              />
            </div>
            {/* Brand Logo Upload */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label
                htmlFor="create-brand-logo-upload"
                className="text-right pt-2"
              >
                Logo
              </Label>
              <div className="col-span-3">
                <Input
                  id="create-brand-logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleBrandLogoFileChange}
                  disabled={isSubmittingBrand}
                  className="file:text-sm ..."
                />
                {createBrandLogoPreview && (
                  <div className="mt-2 relative w-20 h-20 border rounded overflow-hidden bg-muted">
                    <Image
                      src={createBrandLogoPreview}
                      alt="Preview"
                      layout="fill"
                      objectFit="contain"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-0 right-0 h-5 w-5"
                      onClick={clearBrandLogoFile}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {brandUploadProgress !== null && (
                  <div className="mt-2 h-2">
                    <div style={{ width: `${brandUploadProgress}%` }}></div>
                  </div>
                )}
              </div>
            </div>
            {/* Other Brand Fields (Description, Website, Contact) */}
            <div className="space-y-1.5">
              <Label htmlFor="create-brand-description">Description</Label>
              <Textarea
                id="create-brand-description"
                value={createBrandDesc}
                onChange={(e) => setCreateBrandDesc(e.target.value)}
                className="col-span-3"
                required
                disabled={isSubmittingBrand}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-brand-website">Website</Label>
              <Input
                id="create-brand-website"
                value={createBrandWebsite}
                onChange={(e) => setCreateBrandWebsite(e.target.value)}
                className="col-span-3"
                required
                disabled={isSubmittingBrand}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-brand-contact-name">Contact Name</Label>
              <Input
                id="create-brand-contact-name"
                value={createBrandContactName}
                onChange={(e) => setCreateBrandContactName(e.target.value)}
                className="col-span-3"
                required
                disabled={isSubmittingBrand}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-brand-contact-email">Contact Email</Label>
              <Input
                id="create-brand-contact-email"
                value={createBrandContactEmail}
                onChange={(e) => setCreateBrandContactEmail(e.target.value)}
                className="col-span-3"
                required
                disabled={isSubmittingBrand}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmittingBrand}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleBrandModalCreate}
              disabled={isSubmittingBrand}
            >
              {isSubmittingBrand
                ? brandUploadProgress !== null
                  ? `Uploading...`
                  : "Creating..."
                : "Create Brand"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Create Actor Dialog --- */}
      <Dialog open={showCreateActorModal} onOpenChange={handleActorModalChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Actor</DialogTitle>
            <DialogDescription>Enter actor details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {actorModalError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{actorModalError}</AlertDescription>
              </Alert>
            )}
            {/* Actor Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-actor-firstName">First Name *</Label>
                <Input
                  id="create-actor-firstName"
                  value={createActorFirstName}
                  onChange={(e) => setCreateActorFirstName(e.target.value)}
                  required
                  disabled={isSubmittingActor}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-actor-lastName">Last Name *</Label>
                <Input
                  id="create-actor-lastName"
                  value={createActorLastName}
                  onChange={(e) => setCreateActorLastName(e.target.value)}
                  required
                  disabled={isSubmittingActor}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-actor-email">Email</Label>
              <Input
                id="create-actor-email"
                value={createActorEmail}
                onChange={(e) => setCreateActorEmail(e.target.value)}
                className="col-span-3"
                disabled={isSubmittingActor}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-actor-phone">Phone</Label>
              <Input
                id="create-actor-phone"
                value={createActorPhone}
                onChange={(e) => setCreateActorPhone(e.target.value)}
                className="col-span-3"
                disabled={isSubmittingActor}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-actor-nationality">Nationality</Label>
              <Input
                id="create-actor-nationality"
                value={createActorNationality}
                onChange={(e) => setCreateActorNationality(e.target.value)}
                className="col-span-3"
                disabled={isSubmittingActor}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-actor-availability">Availability</Label>
              <Select
                value={createActorAvailability}
                onValueChange={setCreateActorAvailability}
                disabled={isSubmittingActor}
              >
                <SelectTrigger
                  id="create-actor-availability"
                  className="w-full font-normal"
                >
                  <SelectValue placeholder="Select availability" />
                </SelectTrigger>
                <SelectContent>
                  {availabilityStatusEnum.enumValues.map((statusValue) => (
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
            <div className="space-y-1.5">
              <Label htmlFor="create-actor-headshot-upload">Headshot</Label>
              <Input
                id="create-actor-headshot-upload"
                type="file"
                accept="image/*"
                onChange={handleActorHeadshotFileChange}
                disabled={isSubmittingActor}
                className="file:text-sm ..."
              />
              {createActorHeadshotPreview && (
                <div className="mt-2 relative w-20 h-20 border rounded-full overflow-hidden bg-muted">
                  <Image
                    src={createActorHeadshotPreview}
                    alt="Preview"
                    layout="fill"
                    objectFit="cover"
                    className="rounded-full"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-0 right-0 h-5 w-5"
                    onClick={clearActorHeadshotFile}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {actorUploadProgress !== null && (
                <div className="mt-2 h-2">
                  <div style={{ width: `${actorUploadProgress}%` }}></div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmittingActor}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleActorModalCreate}
              disabled={isSubmittingActor}
            >
              {isSubmittingActor
                ? actorUploadProgress !== null
                  ? `Uploading...`
                  : "Saving..."
                : "Create Actor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
