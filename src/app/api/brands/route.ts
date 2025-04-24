import { NextResponse } from "next/server";
import { db } from "@/db";
import { brand, asset } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

// Define the expected shape for the brand list view items
export interface BrandListItem {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  logoAssetId?: string | null;
  logoUrl?: string | null;
}

// Define Zod schema for brand creation payload validation
const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  description: z.string().optional().nullable(),
  website: z.string().url("Invalid URL format").optional().nullable(),
  primaryContactName: z.string().optional().nullable(),
  primaryContactEmail: z
    .string()
    .email("Invalid email format")
    .optional()
    .nullable(),
  logoAssetId: z.string().uuid("Invalid Asset ID format").optional().nullable(),
});

export async function GET(request: Request) {
  try {
    console.log("API: Fetching brands for list view with logos...");

    const brandsData: BrandListItem[] = await db
      .select({
        id: brand.id,
        name: brand.name,
        description: brand.description,
        website: brand.website,
        primaryContactName: brand.primaryContactName,
        primaryContactEmail: brand.primaryContactEmail,
        logoAssetId: brand.logoAssetId,
        logoUrl: asset.storageKey,
      })
      .from(brand)
      .leftJoin(asset, eq(brand.logoAssetId, asset.id))
      .orderBy(desc(brand.name));

    console.log(`API: Found ${brandsData.length} brands.`);
    return NextResponse.json(brandsData, { status: 200 });
  } catch (error) {
    console.error("API Error: Failed to fetch brands:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST handler to create a new brand
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("API: Received brand data:", body);

    // Validate payload against Zod schema
    const validation = createBrandSchema.safeParse(body);
    if (!validation.success) {
      console.error("API Validation Error:", validation.error.flatten());
      return NextResponse.json(
        { error: "Invalid input data", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    const brandData = validation.data;

    console.log("API: Inserting brand into database...");

    // Insert into DB
    const newBrandResult = await db
      .insert(brand)
      .values({
        name: brandData.name,
        description: brandData.description,
        website: brandData.website,
        primaryContactName: brandData.primaryContactName,
        primaryContactEmail: brandData.primaryContactEmail,
        logoAssetId: brandData.logoAssetId,
      })
      .returning({
        id: brand.id,
        name: brand.name,
        description: brand.description,
        website: brand.website,
        primaryContactName: brand.primaryContactName,
        primaryContactEmail: brand.primaryContactEmail,
        logoAssetId: brand.logoAssetId,
      });

    if (!newBrandResult || newBrandResult.length === 0) {
      throw new Error("Failed to create brand record in database.");
    }
    const newBrand = newBrandResult[0];

    // Fetch the full brand data including the potential logo URL to return
    const createdBrandWithLogo = await db
      .select({
        id: brand.id,
        name: brand.name,
        description: brand.description,
        website: brand.website,
        primaryContactName: brand.primaryContactName,
        primaryContactEmail: brand.primaryContactEmail,
        logoAssetId: brand.logoAssetId,
        logoUrl: asset.storageKey,
      })
      .from(brand)
      .leftJoin(asset, eq(brand.logoAssetId, asset.id))
      .where(eq(brand.id, newBrand.id))
      .limit(1);

    const finalBrandData = createdBrandWithLogo[0] ?? null;

    console.log(
      `API: Brand '${finalBrandData?.name ?? "unknown"}' created successfully.`
    );
    return NextResponse.json(finalBrandData, { status: 201 });
  } catch (error: any) {
    console.error("API Error: Failed to create brand:", error);
    if (error.code === "23505" && error.constraint === "brand_name_unique") {
      return NextResponse.json(
        { error: "Brand name already exists." },
        { status: 409 }
      );
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
