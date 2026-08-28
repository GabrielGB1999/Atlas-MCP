export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export interface Config {
  apiBaseUrl: string;
  apiEmail: string;
  apiPassword: string;
  mcpPort: number;
  logLevel: LogLevel;
  jwtExpiryBufferMinutes: number;
}

export function loadConfig(): Config {
  const logLevelRaw = (process.env.LOG_LEVEL ?? "INFO").toUpperCase();
  const validLevels: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR"];
  const logLevel = validLevels.includes(logLevelRaw as LogLevel)
    ? (logLevelRaw as LogLevel)
    : "INFO";

  return {
    apiBaseUrl: process.env.API_BASE_URL ?? "http://localhost:8080",
    apiEmail: requireEnv("API_EMAIL"),
    apiPassword: requireEnv("API_PASSWORD"),
    mcpPort: Number(process.env.MCP_PORT ?? 3000),
    logLevel,
    jwtExpiryBufferMinutes: Number(process.env.JWT_EXPIRY_BUFFER_MINUTES ?? 5),
  };
}
