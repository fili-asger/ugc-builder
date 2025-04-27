"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Video, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { type AssetSelectItem } from "@/app/api/assets/route"; // Import the type

interface AssetSelectionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectAsset: (asset: AssetSelectItem) => void;
}

export function AssetSelectionModal({
  isOpen,
  onOpenChange,
  onSelectAsset,
}: AssetSelectionModalProps) {
  const [assets, setAssets] = useState<AssetSelectItem[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetSelectItem | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchAssets = async () => {
        setIsLoading(true);
        setError(null);
        setSelectedAsset(null); // Reset selection when modal opens
        try {
          const response = await fetch("/api/assets");
          if (!response.ok) {
            throw new Error("Failed to fetch assets");
          }
          const data: AssetSelectItem[] = await response.json();
          // Filter for images AND ensure URL is a valid-looking string
          const validImageAssets = data.filter((a) => {
            const isImage = a.mimeType.startsWith("image/");
            const isValidUrl =
              typeof a.url === "string" && a.url.startsWith("http"); // Basic check for absolute URL
            if (isImage && !isValidUrl) {
              console.warn(
                `Asset ID ${a.id} (${a.filename}) has invalid URL:`,
                a.url
              );
            }
            return isImage && isValidUrl;
          });
          setAssets(validImageAssets); // Set only valid assets
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "An unknown error occurred"
          );
        } finally {
          setIsLoading(false);
        }
      };
      fetchAssets();
    }
  }, [isOpen]);

  const handleSelect = () => {
    if (selectedAsset) {
      onSelectAsset(selectedAsset);
      onOpenChange(false); // Close modal on selection
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Asset</DialogTitle>
          <DialogDescription>
            Choose an existing image asset for the scene.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-hidden">
          {" "}
          {/* Container for ScrollArea */}
          <ScrollArea className="h-full pr-4">
            {" "}
            {/* Make ScrollArea fill container */}
            {isLoading && <p className="text-center">Loading assets...</p>}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!isLoading && !error && assets.length === 0 && (
              <p className="text-center text-muted-foreground">
                No image assets found.
              </p>
            )}
            {!isLoading && !error && assets.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 py-4">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={cn(
                      "relative aspect-square border rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      selectedAsset?.id === asset.id
                        ? "ring-2 ring-primary ring-offset-2"
                        : "border-border"
                    )}
                  >
                    <Image
                      src={asset.url} // Use storageKey as URL
                      alt={asset.filename}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform hover:scale-105"
                      onLoad={() => console.log(`Loaded image: ${asset.url}`)}
                      onError={() =>
                        console.error(
                          `Error loading image with URL: ${asset.url}`
                        )
                      }
                    />
                    {/* TODO: Add indicator for video files if needed */}
                    {/* {asset.mimeType.startsWith('video/') && <Video className="absolute bottom-1 right-1 h-4 w-4 text-white bg-black/50 rounded-sm p-0.5" />} */}
                    {selectedAsset?.id === asset.id && (
                      <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-primary-foreground" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                      <p
                        className="text-xs text-white truncate"
                        title={asset.filename}
                      >
                        {asset.filename}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSelect}
            disabled={!selectedAsset}
          >
            Select Asset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
