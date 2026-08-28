import { z } from "zod";
import { ApiClient } from "../http/apiClient";
import { errorResult, jsonResult } from "../util/mcpResult";
import { updateWorkOrder } from "./updateWorkOrder";

export const assignWorkOrderShape = {
  workOrderId: z.number().int().positive(),
  userIds: z.array(z.number().int().positive()).max(200),
  primaryUserId: z.number().int().positive().optional(),
};

type AssignWorkOrderArgs = {
  workOrderId: number;
  userIds: number[];
  primaryUserId?: number;
};

export async function assignWorkOrder(apiClient: ApiClient, args: AssignWorkOrderArgs) {
  const result = await updateWorkOrder(apiClient, {
    workOrderId: args.workOrderId,
    assignedToUserIds: args.userIds,
    ...(args.primaryUserId !== undefined ? { primaryUserId: args.primaryUserId } : {}),
  });

  if (result.isError) {
    return result;
  }

  try {
    const parsed = JSON.parse(result.content[0].text) as { current: { assignedTo: unknown; primaryUser: unknown } };
    return jsonResult({
      workOrderId: args.workOrderId,
      assignedTo: parsed.current.assignedTo,
      primaryUser: parsed.current.primaryUser,
    });
  } catch (err) {
    return errorResult(`Assigned work order but failed to parse confirmation: ${String(err)}`);
  }
}
