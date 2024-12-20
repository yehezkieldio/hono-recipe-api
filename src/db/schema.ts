import { cuid2 } from "drizzle-cuid2/postgres";
import { relations } from "drizzle-orm";
import { index, pgTable, pgTableCreator, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM.
 * Use the same database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `elysia-boilerplate_${name}`);

export const users = pgTable(
    "user",
    {
        id: cuid2("id").defaultRandom().primaryKey(),
        username: varchar("username").notNull(),
        password: text("password").notNull(),
        role: varchar("role").notNull(),
    },
    (user) => ({
        usernameUidx: uniqueIndex("user_username_uidx").on(user.username),
    }),
);

export const accounts = pgTable(
    "account",
    {
        id: cuid2("id").defaultRandom().primaryKey(),
        userId: cuid2("user_id")
            .notNull()
            .references(() => users.id),
        refreshToken: text("refresh_token").notNull(),
        accessToken: text("access_token").notNull(),
    },
    (account) => ({
        userIdUidx: uniqueIndex("account_user_id_uidx").on(account.userId),
        accessTokenIdx: index("account_access_token_idx").on(account.accessToken),
    }),
);

export const recipes = pgTable(
    "recipe",
    {
        id: cuid2("id").defaultRandom().primaryKey(),
        title: text("title"),
        content: text("content"),
        ingredients: text("ingredients"),
        instructions: text("instructions"),
        category: text("category"),
        userId: cuid2("user_id")
            .notNull()
            .references(() => users.id),
    },
    (recipe) => ({
        userIdUidx: uniqueIndex("recipe_user_id_uidx").on(recipe.userId),
    }),
);

export const ratings = pgTable(
    "rating",
    {
        id: cuid2("id").defaultRandom().primaryKey(),
        rating: text("rating"),
        userId: cuid2("user_id")
            .notNull()
            .references(() => users.id),
        recipeId: cuid2("recipe_id")
            .notNull()
            .references(() => recipes.id),
    },
    (rating) => ({
        recipeIdUidx: uniqueIndex("rating_recipe_id_uidx").on(rating.recipeId),
        userIdUidx: uniqueIndex("rating_user_id_uidx").on(rating.userId),
    }),
);

/* ------------------------------ RELATIONSHIP ------------------------------ */

export const usersRelations = relations(users, ({ one, many }) => ({
    account: one(accounts, {
        fields: [users.id],
        references: [accounts.userId],
    }),
    recipes: many(recipes),
    ratings: many(ratings),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
    user: one(users, {
        fields: [recipes.userId],
        references: [users.id],
    }),
    ratings: many(ratings),
}));

export const ratingsRelations = relations(ratings, ({ one, many }) => ({
    user: one(users, {
        fields: [ratings.userId],
        references: [users.id],
    }),
    recipe: one(recipes, {
        fields: [ratings.recipeId],
        references: [recipes.id],
    }),
}));
