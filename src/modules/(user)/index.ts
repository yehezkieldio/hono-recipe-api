import { db } from "@/db/connection";
import { authMiddleware } from "@/modules/(auth)/middleware";
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

export default usersModule;
