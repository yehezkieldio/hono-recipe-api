import authModule from "@/modules/(auth)";
import { ratingsModule } from "@/modules/(rating)";
import { recipesModule } from "@/modules/(recipe)";
import { usersModule } from "@/modules/(user)";
import { Hono } from "hono";
import { logger } from "hono/logger";

const app = new Hono();
app.use(logger());

app.route("/", authModule);
app.route("/users", usersModule);
app.route("/recipes", recipesModule);
app.route("/ratings", ratingsModule);

export default app;
