"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, PlusCircle, UserCircle2, Upload, X } from "lucide-react";
import { ActorTableItem } from "@/app/api/actors/route";
import { availabilityStatusEnum } from "@/db/schema";
import { cn } from "@/lib/utils";

export default function ActorsPage() {
  const [actors, setActors] = useState<ActorTableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [availability, setAvailability] = useState<string>(
    availabilityStatusEnum.enumValues[0]
  );
  const [headshotFile, setHeadshotFile] = useState<File | null>(null);
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(null);

  const fetchActors = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/actors");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch actors");
      }
      const data: ActorTableItem[] = await response.json();
      setActors(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActors();
  }, []);

  const resetModal = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setNationality("");
    setAvailability(availabilityStatusEnum.enumValues[0]);
    setHeadshotFile(null);
    setHeadshotPreview(null);
    setModalError(null);
    setIsSubmitting(false);
    setUploadProgress(null);
  };

  const handleModalChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      resetModal();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        setModalError("Invalid file type selected (JPG, PNG, GIF, WEBP).");
        setHeadshotFile(null);
        setHeadshotPreview(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setModalError("File size exceeds 5MB.");
        setHeadshotFile(null);
        setHeadshotPreview(null);
        return;
      }
      setHeadshotFile(file);
      setModalError(null);
      setHeadshotPreview(URL.createObjectURL(file));
    } else {
      setHeadshotFile(null);
      setHeadshotPreview(null);
    }
  };

  const clearHeadshotFile = () => {
    setHeadshotFile(null);
    setHeadshotPreview(null);
    const fileInput = document.getElementById(
      "headshot-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleCreateActor = async () => {
    if (!firstName || !lastName) {
      setModalError("First and Last name are required.");
      return;
    }
    setIsSubmitting(true);
    setModalError(null);
    setUploadProgress(null);
    let uploadedAssetId: string | null = null;

    try {
      if (headshotFile) {
        setUploadProgress(0);

        const uploadResponse = await fetch("/api/assets/upload-headshot", {
          method: "POST",
          headers: {
            "x-vercel-filename": headshotFile.name,
            "content-type": headshotFile.type,
          },
          body: headshotFile,
        });

        await new Promise((res) => setTimeout(res, 300));
        setUploadProgress(50);
        await new Promise((res) => setTimeout(res, 300));
        setUploadProgress(100);

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Headshot upload failed");
        }
        const uploadResult = await uploadResponse.json();
        uploadedAssetId = uploadResult.assetId;
        if (!uploadedAssetId) {
          throw new Error(
            "Headshot upload succeeded but no Asset ID was returned."
          );
        }
      }

      const payload = {
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        nationality: nationality || null,
        headshotAssetId: uploadedAssetId,
        availabilityStatus: availability,
      };

      const createResponse = await fetch("/api/actors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        const details = errorData.details
          ? JSON.stringify(errorData.details)
          : "";
        throw new Error(
          `${errorData.error || "Failed to create actor"}${
            details ? `: ${details}` : ""
          }`
        );
      }
      const createdActor: ActorTableItem = await createResponse.json();
      setActors((prev) =>
        [createdActor, ...prev].sort((a, b) => a.name.localeCompare(b.name))
      );
      handleModalChange(false);
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      console.error("Create actor error:", err);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-8">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Actors</h1>
        <Dialog open={isModalOpen} onOpenChange={handleModalChange}>
          <DialogTrigger asChild>
            <Button size="sm" className="ml-auto">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Actor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Actor</DialogTitle>
              <DialogDescription>
                Enter the details for the new actor. First and last name are
                required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {modalError && (
                <Alert variant="destructive" className="text-xs p-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{modalError}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="(Optional)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="(Optional)"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="(Optional)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="availability">Availability</Label>
                  <Select
                    value={availability}
                    onValueChange={setAvailability}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="availability">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {availabilityStatusEnum.enumValues.map((status) => (
                        <SelectItem
                          key={status}
                          value={status}
                          className="capitalize"
                        >
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="headshot-upload">Headshot</Label>
                <Input
                  id="headshot-upload"
                  type="file"
                  accept="image/png, image/jpeg, image/gif, image/webp"
                  onChange={handleFileChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  disabled={isSubmitting}
                />
                {headshotPreview && (
                  <div className="mt-2 relative w-24 h-24 border rounded-full overflow-hidden bg-muted">
                    <Image
                      src={headshotPreview}
                      alt="Headshot preview"
                      layout="fill"
                      objectFit="cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-0 right-0 h-5 w-5 rounded-full"
                      onClick={clearHeadshotFile}
                      disabled={isSubmitting}
                      aria-label="Remove image"
                    >
                      {" "}
                      <X className="h-3 w-3" />{" "}
                    </Button>
                  </div>
                )}
                {!headshotPreview && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a PNG, JPG, GIF, or WEBP (Max 5MB).
                  </p>
                )}
                {uploadProgress !== null && (
                  <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-linear"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={handleCreateActor}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? uploadProgress !== null
                    ? `Uploading...`
                    : "Saving..."
                  : "Create Actor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Actors</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="border shadow-sm rounded-lg">
        <Table>
          <TableCaption>
            {loading
              ? "Loading actors..."
              : actors.length === 0
              ? "No actors found."
              : "A list of registered actors."}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]"></TableHead>
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="w-[120px]">Nationality</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell>
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-3/4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-[60px] float-right" />
                  </TableCell>
                </TableRow>
              ))}
            {!loading &&
              actors.map((actor) => (
                <TableRow key={actor.id}>
                  <TableCell>
                    {actor.headshotUrl ? (
                      <Image
                        src={actor.headshotUrl}
                        alt={`${actor.name} headshot`}
                        width={40}
                        height={40}
                        className="rounded-full object-cover border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border">
                        <UserCircle2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{actor.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{actor.email || "-"}</div>
                    <div className="text-xs">{actor.phone || "-"}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {actor.nationality || "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        actor.availabilityStatus === "available"
                          ? "default"
                          : "secondary"
                      }
                      className={cn(
                        actor.availabilityStatus === "available"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
                        "capitalize"
                      )}
                    >
                      {actor.availabilityStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" disabled>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
