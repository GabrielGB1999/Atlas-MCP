import crypto from "crypto";
import express, { Express, NextFunction, Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Config } from "./config";
import { ApiClient } from "./http/apiClient";
import { Logger } from "./util/logger";
import { createServer } from "./mcpServer";

/** Constant-time string compare so a wrong token can't be brute-forced via response timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison of equal-length buffers so this branch doesn't
    // return measurably faster than a real mismatch.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireBearerToken(config: Config, logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!config.mcpAuthToken) {
      // No token configured: local/dev mode, already loudly warned about at startup.
      next();
      return;
    }

    const header = req.header("authorization") ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token || !safeEqual(token, config.mcpAuthToken)) {
      logger.warn("Rejected /mcp request with missing or invalid bearer token", {
        path: req.path,
        ip: req.ip,
      });
      res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized: missing or invalid bearer token." },
        id: null,
      });
      return;
    }
    next();
  };
}

/**
 * Hosts the MCP over Streamable HTTP in stateless mode: each POST /mcp
 * request gets its own McpServer + transport pair, so no session state is
 * kept between requests. Simpler and safe for multi-instance deployments;
 * the tradeoff is no server-initiated notifications between calls, which
 * none of these tools need.
 */
export function buildApp(config: Config, apiClient: ApiClient, logger: Logger): Express {
  const app = express();
  app.use(express.json());

  if (!config.mcpAuthToken) {
    logger.warn(
      "MCP_AUTH_TOKEN is not set — the /mcp endpoint is unauthenticated. " +
        "This is fine for local development but must never be exposed on a public network as-is.",
    );
  }

  // /health intentionally stays open (no bearer check) so container/orchestrator
  // health probes don't need the secret.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const authGate = requireBearerToken(config, logger);

  app.post("/mcp", authGate, async (req, res) => {
    try {
      const server = createServer(apiClient, logger);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      logger.error("Unhandled error servicing /mcp request", { error: String(err) });
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const methodNotAllowed = (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed in stateless mode." },
      id: null,
    });
  };
  app.get("/mcp", authGate, methodNotAllowed);
  app.delete("/mcp", authGate, methodNotAllowed);

  return app;
}
