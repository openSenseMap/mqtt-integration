import * as dotenv from "dotenv";
import  { type Config } from "drizzle-kit";
dotenv.config();

export default {
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.MQTT_DATABASE_URL!,
  },
} satisfies Config;
