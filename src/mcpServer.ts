import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiClient } from "./http/apiClient";
import { Logger } from "./util/logger";

import { listWorkOrders, listWorkOrdersShape } from "./tools/listWorkOrders";
import { getWorkOrder, getWorkOrderShape } from "./tools/getWorkOrder";
import { createWorkOrder, createWorkOrderShape } from "./tools/createWorkOrder";
import { updateWorkOrder, updateWorkOrderShape } from "./tools/updateWorkOrder";
import { changeWorkOrderStatus, changeWorkOrderStatusShape } from "./tools/changeWorkOrderStatus";
import { assignWorkOrder, assignWorkOrderShape } from "./tools/assignWorkOrder";
import { generateWeeklyWorkOrderReport, weeklyReportShape } from "./tools/weeklyReport";

export function createServer(apiClient: ApiClient, logger: Logger): McpServer {
  const server = new McpServer({ name: "atlas-mcp", version: "0.1.0" });

  server.tool(
    "list-work-orders",
    "List work orders with optional filtering by status, priority, assignee, location, or team, plus pagination.",
    listWorkOrdersShape,
    async (args) => listWorkOrders(apiClient, args),
  );

  server.tool(
    "get-work-order",
    "Retrieve full details of a single work order by ID.",
    getWorkOrderShape,
    async (args) => getWorkOrder(apiClient, args),
  );

  server.tool(
    "create-work-order",
    "Create a new work order.",
    createWorkOrderShape,
    async (args) => createWorkOrder(apiClient, args),
  );

  server.tool(
    "update-work-order",
    "Update fields on an existing work order. Only the fields you pass are changed.",
    updateWorkOrderShape,
    async (args) => updateWorkOrder(apiClient, args),
  );

  server.tool(
    "change-work-order-status",
    "Change a work order's status, optionally attaching completion feedback or a signature. " +
      "Note: who completed it and when are set by the API itself, not by this call.",
    changeWorkOrderStatusShape,
    async (args) => changeWorkOrderStatus(apiClient, args),
  );

  server.tool(
    "assign-work-order",
    "Assign (or unassign) users on a work order, optionally setting the primary assignee.",
    assignWorkOrderShape,
    async (args) => assignWorkOrder(apiClient, args),
  );

  server.tool(
    "generate-weekly-work-order-report",
    "Generate an executive summary of work orders due within a given week (by dueDate).",
    weeklyReportShape,
    async (args) => generateWeeklyWorkOrderReport(apiClient, logger, args),
  );

  return server;
}
