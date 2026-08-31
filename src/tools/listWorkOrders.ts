import { z } from "zod";
import { ApiClient } from "../http/apiClient";
import { PageResponse, SearchCriteria, WorkOrderShowDTO } from "../atlasTypes";
import { errorResult, jsonResult } from "../util/mcpResult";
import { displayId, formatMiniRef, formatUserRef, formatUserRefs } from "../util/format";
import { STATUS_VALUES, PRIORITY_VALUES } from "./enums";

export const listWorkOrdersShape = {
  status: z.array(z.enum(STATUS_VALUES)).optional().describe("Filter to these statuses"),
  priority: z.array(z.enum(PRIORITY_VALUES)).optional().describe("Filter to these priorities"),
  assignedToUserId: z.number().int().positive().optional(),
  locationId: z.number().int().positive().optional(),
  teamId: z.number().int().positive().optional(),
  pageNum: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortField: z.string().default("id"),
  direction: z.enum(["ASC", "DESC"]).default("ASC"),
};

type ListWorkOrdersArgs = {
  status?: (typeof STATUS_VALUES)[number][];
  priority?: (typeof PRIORITY_VALUES)[number][];
  assignedToUserId?: number;
  locationId?: number;
  teamId?: number;
  pageNum: number;
  pageSize: number;
  sortField: string;
  direction: "ASC" | "DESC";
};

function buildSearchCriteria(args: ListWorkOrdersArgs): SearchCriteria {
  const filterFields: SearchCriteria["filterFields"] = [];

  // Enum columns (status/priority) are stored as ordinals; the "eq" operation
  // compares the raw value against the column with no string->enum
  // conversion and silently matches nothing. The API's own frontend instead
  // uses "in" with `enumName` set, which routes through
  // Status/Priority.getXFromString on the server. Mirror that here.
  if (args.status && args.status.length > 0) {
    filterFields.push({ field: "status", value: "", operation: "in", values: args.status, enumName: "STATUS" });
  }
  if (args.priority && args.priority.length > 0) {
    filterFields.push({ field: "priority", value: "", operation: "in", values: args.priority, enumName: "PRIORITY" });
  }
  // assignedTo is a collection (List<OwnUser>); a to-many field can only be
  // filtered via a join, which is what the "inm" (IN_MANY_TO_MANY) operation
  // does server-side. location/team are to-one relations, filtered by
  // plain "in" over the entity id (see WrapperSpecification's IN branch,
  // which resolves the entity's id path automatically).
  if (args.assignedToUserId !== undefined) {
    filterFields.push({
      field: "assignedTo",
      operation: "inm",
      joinType: "LEFT",
      value: "",
      values: [args.assignedToUserId],
    });
  }
  if (args.locationId !== undefined) {
    filterFields.push({ field: "location", operation: "in", value: "", values: [args.locationId] });
  }
  if (args.teamId !== undefined) {
    filterFields.push({ field: "team", operation: "in", value: "", values: [args.teamId] });
  }

  return {
    filterFields,
    direction: args.direction,
    pageNum: args.pageNum,
    pageSize: args.pageSize,
    sortField: args.sortField,
  };
}

export async function listWorkOrders(apiClient: ApiClient, args: ListWorkOrdersArgs) {
  try {
    const criteria = buildSearchCriteria(args);
    const page = await apiClient.post<PageResponse<WorkOrderShowDTO>>("/work-orders/search", criteria);

    const items = page.content.map((wo) => ({
      id: displayId(wo.customId, wo.id),
      workOrderId: wo.id,
      title: wo.title,
      description: wo.description ?? null,
      status: wo.status,
      priority: wo.priority,
      // primaryWorker is the main/responsible worker (frontend's "Primary Worker" field);
      // assignedTo is the separate list of additional workers ("Assigned To" in the frontend).
      primaryWorker: formatUserRef(wo.primaryUser),
      assignedTo: formatUserRefs(wo.assignedTo),
      location: formatMiniRef(wo.location),
      asset: formatMiniRef(wo.asset),
      dueDate: wo.dueDate ?? null,
      estimatedDuration: wo.estimatedDuration,
    }));

    return jsonResult({
      workOrders: items,
      pagination: {
        pageNumber: page.number,
        pageSize: page.size,
        totalElements: page.totalElements,
        totalPages: page.totalPages,
      },
    });
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}
