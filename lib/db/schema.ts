import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import type { EntryDef, OptionDef, SectionRule, RuleTemplates, SubDef } from "@/lib/content/types";

// Mirrors migrations/001_auth.sql (tern owns the DDL; this is for queries only).
const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  approved: boolean("approved").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
});

const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull(),
});

const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export { user, session, account, verification };

// ---- Catalog (mirrors migrations/002_catalog.sql) ----
// jsonb columns are validated with the zod schemas in lib/content/schemas.ts on read.

const cascade = { onDelete: "cascade" } as const;

export const manufacturer = pgTable("manufacturer", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const panelFamily = pgTable("panel_family", {
  id: serial("id").primaryKey(),
  manufacturerId: integer("manufacturer_id").notNull().references(() => manufacturer.id, cascade),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  engineKey: text("engine_key").notNull(),
});

export const panelModel = pgTable("panel_model", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => panelFamily.id, cascade),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  firmware: text("firmware").notNull().default(""),
  installerCodeDefault: text("installer_code_default").notNull(),
  masterCodeDefault: text("master_code_default").notNull(),
  sourceDoc: text("source_doc").notNull().default(""),
});

export const keypadModel = pgTable(
  "keypad_model",
  {
    id: serial("id").primaryKey(),
    familyId: integer("family_id").notNull().references(() => panelFamily.id, cascade),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    componentKey: text("component_key").notNull(),
    description: text("description").notNull().default(""),
    displayType: text("display_type").$type<"text" | "icons" | "lights">().notNull(),
    lightCount: integer("light_count"),
  },
  (t) => [unique().on(t.familyId, t.slug)],
);

export const panelModelKeypad = pgTable(
  "panel_model_keypad",
  {
    panelModelId: integer("panel_model_id").notNull().references(() => panelModel.id, cascade),
    keypadModelId: integer("keypad_model_id").notNull().references(() => keypadModel.id, cascade),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.panelModelId, t.keypadModelId] })],
);

export const menuGroup = pgTable(
  "menu_group",
  {
    id: serial("id").primaryKey(),
    panelModelId: integer("panel_model_id").notNull().references(() => panelModel.id, cascade),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [unique().on(t.panelModelId, t.slug)],
);

export const section = pgTable(
  "section",
  {
    id: serial("id").primaryKey(),
    panelModelId: integer("panel_model_id").notNull().references(() => panelModel.id, cascade),
    groupId: integer("group_id").notNull().references(() => menuGroup.id, cascade),
    slug: text("slug").notNull(),
    num: integer("num"),
    rangeStart: integer("range_start"),
    rangeEnd: integer("range_end"),
    kind: text("kind").$type<"data" | "toggle" | "sub" | "phone" | "action" | "module">().notNull(),
    label: text("label").notNull(),
    description: text("description").notNull().default(""),
    subDigits: integer("sub_digits"),
    rule: jsonb("rule").$type<(SectionRule & RuleTemplates) | null>(),
    entries: jsonb("entries").$type<EntryDef[] | null>(),
    options: jsonb("options").$type<OptionDef[] | null>(),
    subs: jsonb("subs").$type<SubDef[] | null>(),
    tips: jsonb("tips").$type<string[]>().notNull().default([]),
    related: jsonb("related").$type<string[]>().notNull().default([]),
    pages: integer("pages").notNull().default(1),
    confirm: boolean("confirm").notNull().default(false),
    danger: boolean("danger").notNull().default(false),
    verified: boolean("verified").notNull().default(true),
    position: integer("position").notNull(),
  },
  (t) => [unique().on(t.panelModelId, t.slug), index("section_group_idx").on(t.groupId, t.position)],
);

export const keypadCommand = pgTable(
  "keypad_command",
  {
    id: serial("id").primaryKey(),
    panelModelId: integer("panel_model_id").notNull().references(() => panelModel.id, cascade),
    slug: text("slug").notNull(),
    keys: text("keys").notNull(),
    label: text("label").notNull(),
    kind: text("kind").notNull().default("command"),
    description: text("description").notNull().default(""),
    position: integer("position").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [unique().on(t.panelModelId, t.slug)],
);

export const lookup = pgTable(
  "lookup",
  {
    panelModelId: integer("panel_model_id").notNull().references(() => panelModel.id, cascade),
    key: text("key").notNull(),
    values: jsonb("values").$type<Record<string, unknown>>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.panelModelId, t.key] })],
);

export const guide = pgTable(
  "guide",
  {
    id: serial("id").primaryKey(),
    panelModelId: integer("panel_model_id").notNull().references(() => panelModel.id, cascade),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    danger: boolean("danger").notNull().default(false),
    verified: boolean("verified").notNull().default(false),
    position: integer("position").notNull().default(0),
  },
  (t) => [unique().on(t.panelModelId, t.slug)],
);

export const guideStep = pgTable(
  "guide_step",
  {
    id: serial("id").primaryKey(),
    guideId: integer("guide_id").notNull().references(() => guide.id, cascade),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    keys: text("keys").notNull().default(""),
    note: text("note").notNull().default(""),
    warning: text("warning"),
    sectionRef: integer("section_ref"),
  },
  (t) => [unique().on(t.guideId, t.position)],
);

export const userKeypadChoice = pgTable(
  "user_keypad_choice",
  {
    userId: text("user_id").notNull().references(() => user.id, cascade),
    panelModelId: integer("panel_model_id").notNull().references(() => panelModel.id, cascade),
    keypadModelId: integer("keypad_model_id").notNull().references(() => keypadModel.id, cascade),
  },
  (t) => [primaryKey({ columns: [t.userId, t.panelModelId] })],
);
