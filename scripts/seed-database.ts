import { db } from "@/db/connection";
import { users } from "@/db/schema";

const data = [
    {
        username: "admin",
        role: "admin",
        password: await Bun.password.hash("admin", {
            algorithm: "bcrypt",
            cost: 10,
        }),
    },
    {
        username: "user",
        role: "user",
        password: await Bun.password.hash("user", {
            algorithm: "bcrypt",
            cost: 10,
        }),
    },
];

export const seed = async () => {
    await db.insert(users).values(data);
    console.log("Seeded users");
};

void seed().then(() => process.exit(0));
