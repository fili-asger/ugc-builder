"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { AlertCircle, ExternalLink } from "lucide-react";

// Use the interface defined in the API route
import type { BriefListItem } from "../api/briefs/route";

export default function BriefsListPage() {
  const [briefs, setBriefs] = useState<BriefListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBriefs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/briefs");
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to parse error" }));
          throw new Error(
            errorData.error || `Failed to fetch briefs: ${response.status}`
          );
        }
        const data: BriefListItem[] = await response.json();
        setBriefs(data);
      } catch (err) {
        console.error("Failed to fetch briefs:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
      }
      setLoading(false);
    };

    fetchBriefs();
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Briefs</h1>
      </div>
      <div className="border shadow-sm rounded-lg">
        <Table>
          <TableCaption>
            {loading
              ? "Loading briefs..."
              : error
              ? ""
              : "A list of your generated briefs."}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Title</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Source URL</TableHead>
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
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[50px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-[60px] float-right" />
                  </TableCell>
                </TableRow>
              ))}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-red-500">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Error loading briefs: {error}</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && briefs.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No briefs generated yet.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              !error &&
              briefs.map((brief) => (
                <TableRow key={brief.id}>
                  <TableCell className="font-medium truncate max-w-[250px]">
                    {brief.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{brief.language}</Badge>
                  </TableCell>
                  <TableCell>
                    {brief.sourceUrl ? (
                      <Link
                        href={brief.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
                      >
                        <span>
                          {brief.sourceUrl.length > 40
                            ? brief.sourceUrl.substring(0, 40) + "..."
                            : brief.sourceUrl}
                          <ExternalLink className="h-3 w-3 flex-shrink-0 ml-1" />
                        </span>
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(brief.createdAt).toLocaleDateString()}{" "}
                    {new Date(brief.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/brief?id=${brief.id}`}
                      passHref
                      legacyBehavior
                    >
                      <Button variant="outline" size="sm" asChild>
                        <a>View</a>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
