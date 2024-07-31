import authModule from "@/modules/(auth)";
import { usersModule } from "@/modules/(user)";
import { Hono } from "hono";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());

app.route("/", authModule);
app.route("/users", usersModule);

export default app;
