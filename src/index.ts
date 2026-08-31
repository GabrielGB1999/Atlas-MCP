import axios from "axios";
import { loadConfig } from "./config";
import { Logger } from "./util/logger";
import { AuthManager } from "./auth/authManager";
import { ApiClient } from "./http/apiClient";
import { buildApp } from "./httpHost";

function main() {
  const config = loadConfig();
  const logger = new Logger(config.logLevel);

  const signinHttp = axios.create({ baseURL: config.apiBaseUrl, timeout: 15000 });
  const authManager = new AuthManager(config, logger, signinHttp);
  const apiClient = new ApiClient(config, logger, authManager);

  const app = buildApp(config, apiClient, logger);
  app.listen(config.mcpPort, () => {
    logger.info("Atlas MCP server listening", { port: config.mcpPort, apiBaseUrl: config.apiBaseUrl });
  });
}

main();
