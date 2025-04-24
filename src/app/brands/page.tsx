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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLink,
  AlertCircle,
  PlusCircle,
  Upload,
  X,
  Image as ImageIconPlaceholder,
} from "lucide-react";
import { BrandListItem } from "@/app/api/brands/route";

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandDesc, setNewBrandDesc] = useState("");
  const [newBrandWebsite, setNewBrandWebsite] = useState("");
  const [newBrandContactName, setNewBrandContactName] = useState("");
  const [newBrandContactEmail, setNewBrandContactEmail] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Fetch initial brand data
  const fetchBrands = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/brands");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch brands");
      }
      const data: BrandListItem[] = await response.json();
      setBrands(data);
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
    fetchBrands();
  }, []);

  // Reset modal form
  const resetModal = () => {
    setNewBrandName("");
    setNewBrandDesc("");
    setNewBrandWebsite("");
    setNewBrandContactName("");
    setNewBrandContactEmail("");
    setLogoFile(null);
    setLogoPreview(null);
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

  // Handle file selection and preview
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic client-side validation (optional, backend validates too)
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        setModalError("Invalid file type selected.");
        setLogoFile(null);
        setLogoPreview(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setModalError("File size exceeds 5MB.");
        setLogoFile(null);
        setLogoPreview(null);
        return;
      }

      setLogoFile(file);
      setModalError(null);
      // Create object URL for preview
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    } else {
      setLogoFile(null);
      setLogoPreview(null);
    }
  };

  // Clear selected file
  const clearLogoFile = () => {
    setLogoFile(null);
    setLogoPreview(null);
    // Also clear the input value if possible (requires ref)
    const fileInput = document.getElementById(
      "logo-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  // Handle brand creation submission (with upload)
  const handleCreateBrand = async () => {
    if (!newBrandName) {
      setModalError("Brand name is required.");
      return;
    }
    setIsSubmitting(true);
    setModalError(null);
    setUploadProgress(null);
    let uploadedAssetId: string | null = null;

    try {
      // 1. Upload Logo if selected
      if (logoFile) {
        setUploadProgress(0); // Indicate start of upload
        const formData = new FormData();
        formData.append("logo", logoFile);

        // Ideally use fetch with onUploadProgress if needed, basic fetch here
        const uploadResponse = await fetch("/api/assets/upload-logo", {
          method: "POST",
          body: formData,
          // Note: Don't set Content-Type header for FormData, browser handles it
        });

        // Basic progress simulation (replace with actual if possible)
        await new Promise((res) => setTimeout(res, 300)); // Simulate progress
        setUploadProgress(50);
        await new Promise((res) => setTimeout(res, 300));
        setUploadProgress(100);

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Logo upload failed");
        }
        const uploadResult = await uploadResponse.json();
        uploadedAssetId = uploadResult.assetId;
        if (!uploadedAssetId) {
          throw new Error("Upload succeeded but no Asset ID was returned.");
        }
        console.log("Logo uploaded, Asset ID:", uploadedAssetId);
      }

      // 2. Create Brand with (or without) logoAssetId
      const payload = {
        name: newBrandName,
        description: newBrandDesc || null,
        website: newBrandWebsite || null,
        primaryContactName: newBrandContactName || null,
        primaryContactEmail: newBrandContactEmail || null,
        logoAssetId: uploadedAssetId, // Use the ID from upload, or null
      };

      console.log("Creating brand with payload:", payload);
      const createResponse = await fetch("/api/brands", {
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
          `${errorData.error || "Failed to create brand"}${
            details ? `: ${details}` : ""
          }`
        );
      }

      const createdBrand: BrandListItem = await createResponse.json();
      setBrands((prev) =>
        [createdBrand, ...prev].sort((a, b) => a.name.localeCompare(b.name))
      );
      handleModalChange(false); // Close modal
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : "An unknown error occurred during creation"
      );
      console.error("Create brand error:", err);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const truncate = (text: string | null | undefined, length: number) => {
    if (!text) return "N/A";
    return text.length > length ? text.substring(0, length) + "..." : text;
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-8">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Brands</h1>

        {/* Dialog Trigger for Create Brand */}
        <Dialog open={isModalOpen} onOpenChange={handleModalChange}>
          <DialogTrigger asChild>
            <Button size="sm" className="ml-auto">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Brand
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            {" "}
            {/* Increased width slightly */}
            <DialogHeader>
              <DialogTitle>Create New Brand</DialogTitle>
              <DialogDescription>
                Enter the details for the new brand. Name is required.
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
              {/* Form Fields */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name *
                </Label>
                <Input
                  id="name"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="col-span-3"
                  required
                  disabled={isSubmitting}
                />
              </div>
              {/* --- Logo Upload --- */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="logo-upload" className="text-right pt-2">
                  Logo
                </Label>
                <div className="col-span-3">
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    onChange={handleFileChange}
                    className="col-span-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    disabled={isSubmitting}
                  />
                  {logoPreview && (
                    <div className="mt-2 relative w-24 h-24 border rounded overflow-hidden bg-muted">
                      <Image
                        src={logoPreview}
                        alt="Logo preview"
                        layout="fill"
                        objectFit="contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-0 right-0 h-5 w-5 rounded-full"
                        onClick={clearLogoFile}
                        disabled={isSubmitting}
                        aria-label="Remove logo"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {!logoPreview && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a PNG, JPG, GIF, or WEBP (Max 5MB).
                    </p>
                  )}
                  {/* Optional Upload Progress Bar */}
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
              {/* --- End Logo Upload --- */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newBrandDesc}
                  onChange={(e) => setNewBrandDesc(e.target.value)}
                  className="col-span-3"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="website" className="text-right">
                  Website
                </Label>
                <Input
                  id="website"
                  value={newBrandWebsite}
                  onChange={(e) => setNewBrandWebsite(e.target.value)}
                  className="col-span-3"
                  placeholder="https://example.com"
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contactName" className="text-right">
                  Contact Name
                </Label>
                <Input
                  id="contactName"
                  value={newBrandContactName}
                  onChange={(e) => setNewBrandContactName(e.target.value)}
                  className="col-span-3"
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contactEmail" className="text-right">
                  Contact Email
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={newBrandContactEmail}
                  onChange={(e) => setNewBrandContactEmail(e.target.value)}
                  className="col-span-3"
                  placeholder="contact@example.com"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              {/* Submit Button */}
              <Button
                type="button"
                onClick={handleCreateBrand}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? uploadProgress !== null
                    ? `Uploading (${uploadProgress}%)`
                    : "Creating..."
                  : "Create Brand"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* List Error Display */}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Brands</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Brand Table (Consider adding logo display later) */}
      <div className="border shadow-sm rounded-lg">
        <Table>
          <TableCaption>
            {loading
              ? "Loading brands..."
              : brands.length === 0
              ? "No brands found. Use the button above to create one."
              : "A list of your brands."}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Logo</TableHead>
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[200px]">Website</TableHead>
              <TableHead className="w-[200px]">Primary Contact</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell>
                    <Skeleton className="h-10 w-10 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-[60px] float-right" />
                  </TableCell>
                </TableRow>
              ))}
            {!loading &&
              brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    {brand.logoUrl ? (
                      <Image
                        src={brand.logoUrl}
                        alt={`${brand.name} logo`}
                        width={40}
                        height={40}
                        className="rounded object-contain border bg-muted"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center border">
                        <ImageIconPlaceholder className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {truncate(brand.description, 80)}
                  </TableCell>
                  <TableCell>
                    {brand.website ? (
                      <Link
                        href={
                          brand.website.startsWith("http")
                            ? brand.website
                            : `https://${brand.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                      >
                        <span>{truncate(brand.website, 30)}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0 ml-1" />
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {brand.primaryContactName || "N/A"}
                    {brand.primaryContactEmail && (
                      <div className="text-xs text-muted-foreground">
                        {brand.primaryContactEmail}
                      </div>
                    )}
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
