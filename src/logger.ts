import { config } from "./config";

type LogLevel = "debug" | "info" | "warn" | "error";

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private minLevel: number;

  constructor(level: LogLevel = "info") {
    this.minLevel = levels[level] || levels.info;
  }

  private log(level: LogLevel, message: string, meta?: any) {
    if (levels[level] < this.minLevel) return;

    const timestamp = new Date().toISOString();
    const emoji = {
      debug: "🔍",
      info: "ℹ️",
      warn: "⚠️",
      error: "🚨",
    }[level];

    const logData = {
      timestamp,
      level,
      message,
      ...(meta && { meta }),
    };

    console.log(`${emoji} [${timestamp}] ${level.toUpperCase()}: ${message}`);
    if (meta) {
      console.log(JSON.stringify(logData, null, 2));
    }
  }

  debug(message: string, meta?: any) {
    this.log("debug", message, meta);
  }

  info(message: string, meta?: any) {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: any) {
    this.log("warn", message, meta);
  }

  error(message: string, meta?: any) {
    this.log("error", message, meta);
  }
}

export const logger = new Logger(config.LOG_LEVEL as LogLevel);
