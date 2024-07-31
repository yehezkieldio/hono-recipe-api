import { db } from "@/db/connection";
import { users } from "@/db/schema";
import { authMiddleware } from "@/modules/(auth)/middleware";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

export const usersModule = new Hono();

usersModule.use(authMiddleware);

usersModule.get("/", async (c) => {
    const users = await db.query.users.findMany({
        columns: {
            password: false,
        },
    });

    return c.json(users);
});

usersModule.get("/:id", async (c) => {
    const id = c.req.param("id");
    if (!id) {
        return c.json(
            {
                success: false,
                message: "ID is required",
            },
            400,
        );
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: {
            password: false,
        },
    });

    if (!user) {
        return c.json(
            {
                success: false,
                message: "User not found",
            },
            404,
        );
    }

    return c.json(user);
});

export default usersModule;
