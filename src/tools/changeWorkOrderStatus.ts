import { z } from "zod";
import { ApiClient } from "../http/apiClient";
import { WorkOrderChangeStatusBody, WorkOrderShowDTO } from "../atlasTypes";
import { errorResult, jsonResult } from "../util/mcpResult";
import { displayId, formatUserRef } from "../util/format";
import { STATUS_VALUES } from "./enums";

export const changeWorkOrderStatusShape = {
  workOrderId: z.number().int().positive(),
  newStatus: z.enum(STATUS_VALUES),
  feedback: z.string().optional(),
  signature: z.string().optional(),
};

type ChangeWorkOrderStatusArgs = {
  workOrderId: number;
  newStatus: (typeof STATUS_VALUES)[number];
  feedback?: string;
  signature?: string;
};

export async function changeWorkOrderStatus(apiClient: ApiClient, args: ChangeWorkOrderStatusArgs) {
  try {
    const body: WorkOrderChangeStatusBody = {
      status: args.newStatus,
      ...(args.feedback !== undefined ? { feedback: args.feedback } : {}),
      ...(args.signature !== undefined ? { signature: args.signature } : {}),
    };

    const updated = await apiClient.patch<WorkOrderShowDTO>(
      `/work-orders/${args.workOrderId}/change-status`,
      body,
    );

    return jsonResult({
      id: displayId(updated.customId, updated.id),
      workOrderId: updated.id,
      status: updated.status,
      completedBy: formatUserRef(updated.completedBy),
      completedOn: updated.completedOn ?? null,
      feedback: updated.feedback ?? null,
    });
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}
