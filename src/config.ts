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
  /** Shared secret required on the `/mcp` endpoint as `Authorization: Bearer <token>`.
   * Unset means the endpoint is open to anyone who can reach the port — fine for local
   * dev, never for a publicly reachable deployment. */
  mcpAuthToken: string | null;
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
    mcpAuthToken: process.env.MCP_AUTH_TOKEN?.trim() || null,
  };
}
