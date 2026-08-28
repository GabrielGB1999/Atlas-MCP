import { LogLevel } from "../config";

const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/** Field names whose values must never reach a log line. */
const SENSITIVE_KEYS = new Set([
  "password",
  "apipassword",
  "accesstoken",
  "access_token",
  "authorization",
  "signature",
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : redact(val);
    }
    return out;
  }
  return value;
}

export class Logger {
  constructor(private readonly level: LogLevel) {}

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) return;
    const entry = {
      time: new Date().toISOString(),
      level,
      message,
      ...(context ? { context: redact(context) } : {}),
    };
    const line = JSON.stringify(entry);
    if (level === "ERROR") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log("DEBUG", message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log("INFO", message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log("WARN", message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log("ERROR", message, context);
  }
}
