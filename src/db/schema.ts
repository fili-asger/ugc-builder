import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  varchar,
  uuid,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

// Define the structure for the 'scenes' JSONB column
// We can reuse the interfaces if needed, but for schema, defining structure inline is fine
const sceneSchema = {
  sceneNumber: "integer",
  sceneTitle: "string",
  script: "string",
  tone: "array<string>",
  timeSeconds: "number",
  visual: {
    description: "string",
    imageUrl: "string", // Will store placeholder or generated URL
  },
};

export const briefs = pgTable("briefs", {
  id: uuid("id").defaultRandom().primaryKey(), // Use UUID for primary key
  title: text("title").notNull(),
  language: varchar("language", { length: 10 }).notNull(), // e.g., 'da', 'en-US'
  sourceUrl: text("source_url"), // Store the URL used for generation
  scenes: jsonb("scenes").$type<Array<typeof sceneSchema>>().notNull(), // Store the array of scenes
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  // Optional: Add userId or actorId later
  // userId: text('user_id'),
});

// --- Actors Table --- //

// 1. Enumerated types
export const genderEnum = pgEnum("gender_enum", [
  "female",
  "male",
  "non-binary",
  "transgender",
  "agender",
  "prefer_not_to_say",
  "other",
]);

export const actorTypeEnum = pgEnum("actor_type_enum", ["human", "ai"]);

// 2. Main table
export const actors = pgTable(
  "actors",
  {
    // core profile
    actorId: uuid("actor_id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    profileImage: text("profile_image").notNull(), // CHECK constraint (URL pattern) may need manual migration
    visualDescription: text("visual_description").notNull(), // CHECK constraint (length) may need manual migration
    nationality: text("nationality").notNull(), // Complex CHECK constraint will need manual migration
    gender: genderEnum("gender").notNull(),
    actorType: actorTypeEnum("actor_type").notNull(),

    // optional voice
    elevenlabsVoiceId: varchar("elevenlabs_voice_id", { length: 32 }).unique(), // CHECK constraint (regex) may need manual migration

    // bookkeeping
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      // .$onUpdate(() => new Date()) // Drizzle's way, simpler than trigger but less robust
      // OR rely on the manual trigger you defined in SQL
      .notNull(),
  },
  (table) => {
    return {
      // 4. Index
      elevenlabsVoiceIdIndex: index("idx_actors_voice_id").on(
        table.elevenlabsVoiceId
      ),
      // Note: Complex CHECK constraints (like the one involving nationality and actor_type)
      // are not directly definable here and would need a separate SQL migration step.
    };
  }
);

// Note: The trigger function and trigger creation (trg_set_updated_at)
// must be applied manually via SQL after the table is created.

// You can define other tables like actors here later
// export const actors = pgTable(...)
