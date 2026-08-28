import express, { Express } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ApiClient } from "./http/apiClient";
import { Logger } from "./util/logger";
import { createServer } from "./mcpServer";

/**
 * Hosts the MCP over Streamable HTTP in stateless mode: each POST /mcp
 * request gets its own McpServer + transport pair, so no session state is
 * kept between requests. Simpler and safe for multi-instance deployments;
 * the tradeoff is no server-initiated notifications between calls, which
 * none of these tools need.
 */
export function buildApp(apiClient: ApiClient, logger: Logger): Express {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/mcp", async (req, res) => {
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

  const methodNotAllowed = (_req: express.Request, res: express.Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed in stateless mode." },
      id: null,
    });
  };
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  return app;
}
