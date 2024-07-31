import { db } from "@/db/connection";
import { accounts } from "@/db/schema";
import { env } from "@/env";
import { eq } from "drizzle-orm";
import { getSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";

export const authMiddleware = createMiddleware(async (c, next) => {
    const accessToken = await getSignedCookie(c, env.JWT_SECRET, "access_token");

    if (!accessToken) {
        return c.json(
            {
                success: false,
                message: "Access token is required",
            },
            401,
        );
    }

    const jwtPayload = await verify(accessToken, env.JWT_SECRET);

    if (!jwtPayload) {
        return c.json(
            {
                success: false,
                message: "Invalid access token",
            },
            401,
        );
    }

    const account = await db.query.accounts.findFirst({
        where: eq(accounts.userId, jwtPayload.sub as string),
    });

    if (!account) {
        return c.json(
            {
                success: false,
                message: "Account not found",
            },
            404,
        );
    }

    if (jwtPayload.exp && jwtPayload.exp < Date.now() / 1000) {
        return c.json(
            {
                success: false,
                message: "Access token is expired",
            },
            401,
        );
    }

    await next();
});