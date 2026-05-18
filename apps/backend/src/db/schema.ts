import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export type TodoTheme = "light" | "dark" | "system";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  webflowUserId: varchar("webflow_user_id").notNull().unique(),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  accessToken: varchar("access_token").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  siteId: varchar("site_id").notNull().unique(),
  workspaceId: varchar("workspace_id").notNull(),
  displayName: varchar("display_name").notNull(),
  previewUrl: varchar("preview_url"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const todoSettings = pgTable("todo_settings", {
  id: serial("id").primaryKey(),
  siteId: varchar("site_id").notNull().unique(),
  allowAdd: boolean("allow_add").notNull().default(true),
  allowEdit: boolean("allow_edit").notNull().default(true),
  allowDelete: boolean("allow_delete").notNull().default(true),
  showCompleted: boolean("show_completed").notNull().default(true),
  persistInBrowser: boolean("persist_in_browser").notNull().default(true),
  theme: varchar("theme").notNull().default("system"),
  initialTasks: jsonb("initial_tasks").$type<Array<{ id: string; text: string; completed: boolean }>>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("idx_todo_settings_site_id").on(t.siteId)]);

export const cdnReleases = pgTable("cdn_releases", {
  id: serial("id").primaryKey(),
  version: varchar("version").notNull().unique(),
  hostedLocation: varchar("hosted_location").notNull(),
  integrityHash: varchar("integrity_hash").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sites: many(sites),
}));

export const sitesRelations = relations(sites, ({ one }) => ({
  user: one(users, { fields: [sites.userId], references: [users.id] }),
  todoSettings: one(todoSettings, { fields: [sites.siteId], references: [todoSettings.siteId] }),
}));
