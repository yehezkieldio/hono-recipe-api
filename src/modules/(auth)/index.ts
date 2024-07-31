import { db } from "@/db/connection";
import { accounts, users } from "@/db/schema";
import { env } from "@/env";
import { authMiddleware } from "@/modules/(auth)/middleware";
import { authUtil } from "@/modules/(auth)/util";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { z } from "zod";

export const authModule = new Hono();

const validateSignin = zValidator(
    "json",
    z.object({
        username: z.string(),
        password: z.string(),
    }),
);

authModule.post("/signin", validateSignin, async (c) => {
    const body = c.req.valid("json");

    const user = await db.query.users.findFirst({
        where: eq(users.username, body.username),
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

    const passwordMatch = await Bun.password.verify(body.password, user.password, "bcrypt");
    if (!passwordMatch) {
        return c.json(
            {
                success: false,
                message: "Password is incorrect",
            },
            401,
        );
    }

    const accessTokenPayload = {
        sub: user.id,
        iat: Math.floor(Date.now() / 1000),
        exp: authUtil.getExpTimestamp(authUtil.ACCESS_TOKEN_EXPIRATION),
    };

    const initialAccessToken = await sign(accessTokenPayload, env.JWT_SECRET);

    await setSignedCookie(c, "access_token", initialAccessToken, env.JWT_SECRET, {
        httpOnly: true,
        secure: true,
        maxAge: authUtil.ACCESS_TOKEN_EXPIRATION,
        sameSite: "strict",
    });

    const refreshTokenPayload = {
        sub: user.id,
        exp: authUtil.getExpTimestamp(authUtil.REFRESH_TOKEN_EXPIRATION),
        iat: Math.floor(Date.now() / 1000),
        jti: authUtil.generateUniqueIdentifier(),
    };

    const initialRefreshToken = await sign(refreshTokenPayload, env.JWT_SECRET);

    await setSignedCookie(c, "refresh_token", initialRefreshToken, env.JWT_SECRET, {
        httpOnly: true,
        secure: true,
        maxAge: authUtil.REFRESH_TOKEN_EXPIRATION,
        sameSite: "strict",
    });

    const account = await db.query.accounts.findFirst({
        where: eq(accounts.userId, user.id),
    });

    if (account) {
        await db
            .update(accounts)
            .set({
                refreshToken: initialRefreshToken,
                accessToken: initialAccessToken,
            })
            .where(eq(accounts.userId, user.id));
    } else {
        await db.insert(accounts).values({
            userId: user.id,
            refreshToken: initialRefreshToken,
            accessToken: initialAccessToken,
        });
    }

    return c.json({
        success: true,
        message: "Sign in successful",
        data: {
            accessToken: initialAccessToken,
            refreshToken: initialRefreshToken,
        },
    });
});

authModule.use(authMiddleware);

authModule.post("/refresh", async (c) => {
    const refreshToken = await getSignedCookie(c, env.JWT_SECRET, "refresh_token");

    if (!refreshToken) {
        return c.json(
            {
                success: false,
                message: "Refresh token is required",
            },
            401,
        );
    }

    const jwtPayload = await verify(refreshToken, env.JWT_SECRET);

    if (!jwtPayload) {
        return c.json(
            {
                success: false,
                message: "Invalid access token",
            },
            401,
        );
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, jwtPayload.sub as string),
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

    const newAccessTokenPayload = {
        sub: user.id,
        iat: Math.floor(Date.now() / 1000),
        exp: authUtil.getExpTimestamp(authUtil.ACCESS_TOKEN_EXPIRATION),
    };

    const newAccessToken = await sign(newAccessTokenPayload, env.JWT_SECRET);

    deleteCookie(c, "access_token");
    await setSignedCookie(c, "access_token", newAccessToken, env.JWT_SECRET, {
        httpOnly: true,
        secure: true,
        maxAge: authUtil.ACCESS_TOKEN_EXPIRATION,
        sameSite: "strict",
    });

    const newRefreshTokenPayload = {
        sub: user.id,
        exp: authUtil.getExpTimestamp(authUtil.REFRESH_TOKEN_EXPIRATION),
        iat: Math.floor(Date.now() / 1000),
        jti: authUtil.generateUniqueIdentifier(),
    };

    const newRefreshToken = await sign(newRefreshTokenPayload, env.JWT_SECRET);

    deleteCookie(c, "refresh_token");
    await setSignedCookie(c, "refresh_token", newRefreshToken, env.JWT_SECRET, {
        httpOnly: true,
        secure: true,
        maxAge: authUtil.REFRESH_TOKEN_EXPIRATION,
        sameSite: "strict",
    });

    await db
        .update(accounts)
        .set({
            refreshToken: newRefreshToken,
            accessToken: newAccessToken,
        })
        .where(eq(accounts.userId, user.id));

    return c.json({
        success: true,
        message: "Tokens refreshed",
        data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        },
    });
});

export default authModule;
