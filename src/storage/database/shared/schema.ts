import { pgTable, serial, timestamp, index, pgPolicy, text, varchar, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const blogPosts = pgTable("blog_posts", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	summary: text().notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("blog_posts_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	pgPolicy("blog_posts_允许公开删除", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
	pgPolicy("blog_posts_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("blog_posts_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("blog_posts_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password: text("password").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index("users_username_idx").on(table.username),
    index("users_created_at_idx").on(table.createdAt),
  ]
);

export const gameRecords = pgTable(
  "game_records",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    scenario: varchar("scenario", { length: 100 }).notNull(),
    finalScore: integer("final_score").notNull(),
    result: varchar("result", { length: 20 }).notNull(), // 'won' | 'lost' | 'timeout'
    playedAt: timestamp("played_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index("game_records_user_id_idx").on(table.userId),
    index("game_records_played_at_idx").on(table.playedAt),
    pgPolicy("game_records_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("game_records_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
  ]
);
