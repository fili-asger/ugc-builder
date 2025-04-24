import {
  pgTable,
  text,
  timestamp,
  varchar,
  uuid,
  pgEnum,
  index,
  primaryKey,
  decimal,
  integer,
  smallint,
  date,
  bigint,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- ENUM Types ---
export const briefStatusEnum = pgEnum("brief_status", [
  "draft",
  "review",
  "approved",
  "in_production",
  "completed",
]);

export const availabilityStatusEnum = pgEnum("availability_status", [
  "available",
  "unavailable",
]);

// --- Tables (Define ALL tables first) ---

// Assets / Files (Define early as many tables reference it)
export const asset = pgTable("asset", {
  id: uuid("id").defaultRandom().primaryKey(),
  filename: varchar("filename").notNull(),
  storageKey: varchar("storage_key").notNull(),
  mimeType: varchar("mime_type").notNull(),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  uploadedBy: uuid("uploaded_by"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  description: text("description"),
  altText: text("alt_text"),
});

// Admin users
export const adminUser = pgTable("admin_user", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email").notNull().unique(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profilePictureAssetId: uuid("profile_picture_asset_id").references(
    () => asset.id
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Brands
export const brand = pgTable("brand", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  website: varchar("website"),
  logoAssetId: uuid("logo_asset_id").references(() => asset.id),
  primaryContactName: varchar("primary_contact_name"),
  primaryContactEmail: varchar("primary_contact_email"),
});

// Actors
export const actor = pgTable("actor", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  portfolioWebsite: varchar("portfolio_website"),
  personalWebsite: varchar("personal_website"),
  pricePerVideo: decimal("price_per_video", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }),
  nationality: varchar("nationality"),
  rating: smallint("rating"),
  notes: text("notes"),
  headshotAssetId: uuid("headshot_asset_id").references(() => asset.id),
  demoReelAssetId: uuid("demo_reel_asset_id").references(() => asset.id),
  agencyName: varchar("agency_name"),
  agencyContactName: varchar("agency_contact_name"),
  agencyContactEmail: varchar("agency_contact_email"),
  availabilityStatus: availabilityStatusEnum("availability_status")
    .default("available")
    .notNull(),
});

// Languages
export const language = pgTable("language", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull().unique(),
});

// Actor-Language Join Table
export const actorLanguage = pgTable(
  "actor_language",
  {
    actorId: uuid("actor_id")
      .notNull()
      .references(() => actor.id, { onDelete: "cascade" }),
    languageId: uuid("language_id")
      .notNull()
      .references(() => language.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.actorId, table.languageId] }),
  })
);

// Actor Social Media Links
export const actorSocialMedia = pgTable("actor_social_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => actor.id, { onDelete: "cascade" }),
  platform: varchar("platform").notNull(),
  handle: varchar("handle"),
  url: varchar("url").notNull(),
});

// Tags
export const tag = pgTable("tag", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull().unique(),
});

// Asset-Tag Join Table
export const assetTag = pgTable(
  "asset_tag",
  {
    assetId: uuid("asset_id")
      .notNull()
      .references(() => asset.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.assetId, table.tagId] }),
  })
);

// Briefs
export const brief = pgTable("brief", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title").notNull(),
  information: text("information"),
  status: briefStatusEnum("status").default("draft").notNull(),
  deliverableType: varchar("deliverable_type"),
  dueDate: date("due_date"),
  chatThreadId: varchar("chat_thread_id"),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brand.id),
  actorId: uuid("actor_id").references(() => actor.id),
  createdBy: uuid("created_by").references(() => adminUser.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Brief Deliverables
export const briefDeliverable = pgTable("brief_deliverable", {
  id: uuid("id").defaultRandom().primaryKey(),
  briefId: uuid("brief_id")
    .notNull()
    .references(() => brief.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => asset.id),
  format: varchar("format").notNull(),
});

// Brief Assets
export const briefAsset = pgTable("brief_asset", {
  id: uuid("id").defaultRandom().primaryKey(),
  briefId: uuid("brief_id")
    .notNull()
    .references(() => brief.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => asset.id),
  usageType: varchar("usage_type"),
});

// Scenes
export const scene = pgTable(
  "scene",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    briefId: uuid("brief_id")
      .notNull()
      .references(() => brief.id, { onDelete: "cascade" }),
    sceneNumber: integer("scene_number").notNull(),
    script: text("script").notNull(),
    tone: varchar("tone"),
    durationSeconds: integer("duration_seconds"),
    visualDescription: text("visual_description"),
    mediaAssetId: uuid("media_asset_id").references(() => asset.id),
  },
  (table) => ({
    sceneOrderIndex: index("scene_brief_id_scene_number_idx").on(
      table.briefId,
      table.sceneNumber
    ),
  })
);

// --- Relations (Define ALL relations at the end) ---

export const adminUserRelations = relations(adminUser, ({ many, one }) => ({
  uploadedAssets: many(asset),
  createdBriefs: many(brief),
  profilePicture: one(asset, {
    fields: [adminUser.profilePictureAssetId],
    references: [asset.id],
    relationName: "profilePicture",
  }),
}));

export const assetRelations = relations(asset, ({ one, many }) => ({
  uploader: one(adminUser, {
    fields: [asset.uploadedBy],
    references: [adminUser.id],
  }),
  briefDeliverables: many(briefDeliverable),
  briefAssets: many(briefAsset),
  scenes: many(scene),
  tags: many(assetTag),
}));

export const brandRelations = relations(brand, ({ one, many }) => ({
  logo: one(asset, {
    fields: [brand.logoAssetId],
    references: [asset.id],
  }),
  briefs: many(brief),
}));

export const actorRelations = relations(actor, ({ one, many }) => ({
  headshot: one(asset, {
    fields: [actor.headshotAssetId],
    references: [asset.id],
    relationName: "headshot",
  }),
  demoReel: one(asset, {
    fields: [actor.demoReelAssetId],
    references: [asset.id],
    relationName: "demoReel",
  }),
  languages: many(actorLanguage),
  socialMediaLinks: many(actorSocialMedia),
  briefs: many(brief),
}));

export const languageRelations = relations(language, ({ many }) => ({
  actors: many(actorLanguage),
}));

export const actorLanguageRelations = relations(actorLanguage, ({ one }) => ({
  actor: one(actor, {
    fields: [actorLanguage.actorId],
    references: [actor.id],
  }),
  language: one(language, {
    fields: [actorLanguage.languageId],
    references: [language.id],
  }),
}));

export const actorSocialMediaRelations = relations(
  actorSocialMedia,
  ({ one }) => ({
    actor: one(actor, {
      fields: [actorSocialMedia.actorId],
      references: [actor.id],
    }),
  })
);

export const tagRelations = relations(tag, ({ many }) => ({
  assets: many(assetTag),
}));

export const assetTagRelations = relations(assetTag, ({ one }) => ({
  asset: one(asset, {
    fields: [assetTag.assetId],
    references: [asset.id],
  }),
  tag: one(tag, {
    fields: [assetTag.tagId],
    references: [tag.id],
  }),
}));

export const briefRelations = relations(brief, ({ one, many }) => ({
  brand: one(brand, {
    fields: [brief.brandId],
    references: [brand.id],
  }),
  actor: one(actor, {
    fields: [brief.actorId],
    references: [actor.id],
  }),
  creator: one(adminUser, {
    fields: [brief.createdBy],
    references: [adminUser.id],
  }),
  deliverables: many(briefDeliverable),
  assets: many(briefAsset),
  scenes: many(scene),
}));

export const briefDeliverableRelations = relations(
  briefDeliverable,
  ({ one }) => ({
    brief: one(brief, {
      fields: [briefDeliverable.briefId],
      references: [brief.id],
    }),
    asset: one(asset, {
      fields: [briefDeliverable.assetId],
      references: [asset.id],
    }),
  })
);

export const briefAssetRelations = relations(briefAsset, ({ one }) => ({
  brief: one(brief, {
    fields: [briefAsset.briefId],
    references: [brief.id],
  }),
  asset: one(asset, {
    fields: [briefAsset.assetId],
    references: [asset.id],
  }),
}));

export const sceneRelations = relations(scene, ({ one }) => ({
  brief: one(brief, {
    fields: [scene.briefId],
    references: [brief.id],
  }),
  mediaAsset: one(asset, {
    fields: [scene.mediaAssetId],
    references: [asset.id],
    relationName: "mediaAsset", // Added relationName for clarity
  }),
}));
