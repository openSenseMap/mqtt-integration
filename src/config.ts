import dotenv from "dotenv";
import type { Config } from "./types";

dotenv.config();

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

export const config: Config = {
  API_URL: getEnv("API_URL", "http://localhost:3000"),
  API_SERVICE_KEY: getEnv("API_SERVICE_KEY"),
  PORT: getEnvNumber("PORT", 3001),
  RETRY_ATTEMPTS: getEnvNumber("RETRY_ATTEMPTS", 5),
  RETRY_DELAY_MS: getEnvNumber("RETRY_DELAY_MS", 60000),
  BATCH_SIZE: getEnvNumber("BATCH_SIZE", 50),
  BATCH_INTERVAL_MS: getEnvNumber("BATCH_INTERVAL_MS", 2000),
  CONFIG_POLL_INTERVAL_MS: getEnvNumber("CONFIG_POLL_INTERVAL_MS", 300000),
  LOG_LEVEL: getEnv("LOG_LEVEL", "info"),
};
