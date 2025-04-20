"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, ExternalLink } from "lucide-react";
import type { PutBlobResult } from "@vercel/blob"; // Import type

// Use the interface defined in the API route
import type { ActorListItem } from "../api/actors/route";
// Import enum values (assuming they are exported from schema)
// If not exported, define them here or import differently
import { genderEnum, actorTypeEnum } from "@/db/schema"; // Adjust path if needed

// Define types for the form data
interface ActorFormData {
  name: string;
  profileImage: string; // Will store the URL after upload
  visualDescription: string;
  nationality: string;
  gender: (typeof genderEnum.enumValues)[number] | ""; // Allow empty initial state
  actorType: (typeof actorTypeEnum.enumValues)[number] | ""; // Allow empty initial state
  elevenlabsVoiceId?: string;
}

const initialFormData: ActorFormData = {
  name: "",
  profileImage: "", // Initially empty URL
  visualDescription: "",
  nationality: "",
  gender: "",
  actorType: "",
  elevenlabsVoiceId: "",
};

export default function ActorsListPage() {
  const [actors, setActors] = useState<ActorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // State for the modal form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<ActorFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // State for file object
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  useEffect(() => {
    const fetchActors = async () => {
      setLoading(true);
      setListError(null);
      try {
        const response = await fetch("/api/actors");
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to parse error" }));
          throw new Error(
            errorData.error || `Failed to fetch actors: ${response.status}`
          );
        }
        const data: ActorListItem[] = await response.json();
        setActors(data);
      } catch (err) {
        console.error("Failed to fetch actors:", err);
        setListError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
      }
      setLoading(false);
    };

    fetchActors();
  }, []);

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFile(e.target.files[0]);
      // Clear any previous URL if a new file is selected
      setFormData((prev) => ({ ...prev, profileImage: "" }));
    }
  };

  // Handle select changes
  const handleSelectChange = (name: keyof ActorFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSaveActor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    // --- File Upload Step ---
    let imageUrl = formData.profileImage; // Use existing URL if no new file selected
    if (selectedFile) {
      try {
        const uploadResponse = await fetch(
          `/api/actors/upload-image?filename=${encodeURIComponent(
            selectedFile.name
          )}`,
          {
            method: "POST",
            body: selectedFile,
            // headers: { 'Content-Type': selectedFile.type }, // Optional: Vercel Blob can often infer
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse
            .json()
            .catch(() => ({ error: "Upload failed, could not parse error" }));
          throw new Error(
            errorData.error || `Image upload failed: ${uploadResponse.status}`
          );
        }

        const newBlob = (await uploadResponse.json()) as PutBlobResult;
        imageUrl = newBlob.url; // Get the URL from Vercel Blob
        console.log("File uploaded successfully:", imageUrl);
      } catch (uploadError) {
        console.error("File upload failed:", uploadError);
        setFormError(
          uploadError instanceof Error
            ? uploadError.message
            : "Failed to upload image."
        );
        setIsSaving(false);
        return; // Stop if upload fails
      }
    }
    // --- End File Upload ---

    // Basic Validation (including checking if we have an image URL now)
    if (
      !formData.name ||
      !imageUrl ||
      !formData.visualDescription ||
      !formData.nationality ||
      !formData.gender ||
      !formData.actorType
    ) {
      setFormError(
        "Please fill in all required fields and ensure an image is uploaded or provided."
      );
      setIsSaving(false);
      return;
    }

    // Prepare final data with potentially new image URL
    const finalFormData = { ...formData, profileImage: imageUrl };

    try {
      console.log("Submitting final actor data:", finalFormData);
      const response = await fetch("/api/actors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalFormData),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to parse error response" }));
        throw new Error(
          errorData.error || `Failed to save actor: ${response.status}`
        );
      }

      // Success
      const newActor = await response.json();
      setActors((prevActors) => [newActor, ...prevActors]);
      setIsModalOpen(false);
      // Form reset happens via useEffect
    } catch (err) {
      console.error("Failed to save actor:", err);
      setFormError(
        err instanceof Error
          ? err.message
          : "An unknown error occurred during save."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Reset form and file input when modal opens/closes
  useEffect(() => {
    if (isModalOpen) {
      setFormData(initialFormData);
      setSelectedFile(null);
      setFormError(null);
      // Reset the file input visually (optional but good UX)
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      // Also reset if modal closes without saving
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isModalOpen]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Actors</h1>
        {/* --- Dialog Trigger Button --- */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="ml-auto" size="sm">
              Add Actor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Actor</DialogTitle>
              <DialogDescription>
                Fill in the details for the new actor.
              </DialogDescription>
            </DialogHeader>
            {/* --- Actor Form --- */}
            <form onSubmit={handleSaveActor} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="profileImageFile" className="text-right">
                  Profile Image
                </Label>
                <Input
                  id="profileImageFile"
                  name="profileImageFile"
                  type="file"
                  onChange={handleFileChange}
                  className="col-span-3"
                  accept="image/*"
                  ref={fileInputRef}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="visualDescription" className="text-right">
                  Visual Description
                </Label>
                <Textarea
                  id="visualDescription"
                  name="visualDescription"
                  value={formData.visualDescription}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                  minLength={10}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nationality" className="text-right">
                  Nationality
                </Label>
                <Input
                  id="nationality"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gender" className="text-right">
                  Gender
                </Label>
                <Select
                  name="gender"
                  value={formData.gender}
                  onValueChange={(value) => handleSelectChange("gender", value)}
                  required
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderEnum.enumValues.map((gender) => (
                      <SelectItem key={gender} value={gender}>
                        {gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="actorType" className="text-right">
                  Actor Type
                </Label>
                <Select
                  name="actorType"
                  value={formData.actorType}
                  onValueChange={(value) =>
                    handleSelectChange("actorType", value)
                  }
                  required
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {actorTypeEnum.enumValues.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="elevenlabsVoiceId" className="text-right">
                  ElevenLabs ID (Opt.)
                </Label>
                <Input
                  id="elevenlabsVoiceId"
                  name="elevenlabsVoiceId"
                  value={formData.elevenlabsVoiceId}
                  onChange={handleInputChange}
                  className="col-span-3"
                  maxLength={32}
                  placeholder="Optional voice ID"
                />
              </div>

              {formError && (
                <p className="text-red-500 text-sm col-span-4 text-center">
                  {formError}
                </p>
              )}

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSaving}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Actor"}
                </Button>
              </DialogFooter>
            </form>
            {/* --- End Actor Form --- */}
          </DialogContent>
        </Dialog>
        {/* --- End Dialog --- */}
      </div>
      <div className="border shadow-sm rounded-lg">
        <Table>
          <TableCaption>
            {loading
              ? "Loading actors..."
              : listError
              ? ""
              : "A list of registered actors."}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Nationality</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              // Skeleton Loader Rows
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell>
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[80px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[50px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-[60px] float-right" />
                  </TableCell>
                </TableRow>
              ))}
            {!loading && listError && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-red-500">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Error loading actors: {listError}</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!loading && !listError && actors.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  No actors found.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              !listError &&
              actors.map((actor) => (
                <TableRow key={actor.actorId}>
                  <TableCell>
                    {actor.profileImage ? (
                      <Image
                        src={actor.profileImage}
                        alt={actor.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover aspect-square"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                        N/A
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{actor.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {actor.nationality || "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        actor.actorType === "ai" ? "secondary" : "outline"
                      }
                    >
                      {actor.actorType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(actor.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Link to a future actor detail page */}
                    {/* <Link href={`/actors/${actor.actorId}`} passHref legacyBehavior> */}
                    <Button variant="outline" size="sm" disabled>
                      {" "}
                      {/* Disable view button for now */}
                      View
                    </Button>
                    {/* </Link> */}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
