import { z } from "zod";
import { ApiClient } from "../http/apiClient";
import { WorkOrderPatchBody, WorkOrderShowDTO } from "../atlasTypes";
import { errorResult, jsonResult } from "../util/mcpResult";
import { displayId, formatMiniRef, formatUserRef, formatUserRefs } from "../util/format";
import { PRIORITY_VALUES } from "./enums";

const isoDate = z.string().datetime({ offset: true });

export const updateWorkOrderShape = {
  workOrderId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  priority: z.enum(PRIORITY_VALUES).optional(),
  dueDate: isoDate.optional(),
  estimatedDuration: z.number().nonnegative().optional(),
  estimatedStartDate: isoDate.optional(),
  requiredSignature: z.boolean().optional(),
  locationId: z.number().int().positive().optional(),
  teamId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  assetId: z.number().int().positive().optional(),
  primaryUserId: z.number().int().positive().optional(),
  assignedToUserIds: z.array(z.number().int().positive()).max(200).optional(),
  archived: z.boolean().optional(),
};

export type UpdateWorkOrderArgs = {
  workOrderId: number;
  title?: string;
  description?: string;
  priority?: (typeof PRIORITY_VALUES)[number];
  dueDate?: string;
  estimatedDuration?: number;
  estimatedStartDate?: string;
  requiredSignature?: boolean;
  locationId?: number;
  teamId?: number;
  categoryId?: number;
  assetId?: number;
  primaryUserId?: number;
  assignedToUserIds?: number[];
  archived?: boolean;
};

/**
 * Builds the PATCH body containing only the fields the caller actually set.
 * WorkOrderPatchDTO has no null-value-ignore strategy (see CLAUDE.md), so any
 * key we DON'T include here is a key MapStruct will never touch — omission,
 * not `null`, is what keeps unrelated fields intact.
 */
export function buildPatchBody(args: UpdateWorkOrderArgs): WorkOrderPatchBody {
  const body: WorkOrderPatchBody = {};
  if (args.title !== undefined) body.title = args.title;
  if (args.description !== undefined) body.description = args.description;
  if (args.priority !== undefined) body.priority = args.priority;
  if (args.dueDate !== undefined) body.dueDate = args.dueDate;
  if (args.estimatedDuration !== undefined) body.estimatedDuration = args.estimatedDuration;
  if (args.estimatedStartDate !== undefined) body.estimatedStartDate = args.estimatedStartDate;
  if (args.requiredSignature !== undefined) body.requiredSignature = args.requiredSignature;
  if (args.locationId !== undefined) body.location = { id: args.locationId };
  if (args.teamId !== undefined) body.team = { id: args.teamId };
  if (args.categoryId !== undefined) body.category = { id: args.categoryId };
  if (args.assetId !== undefined) body.asset = { id: args.assetId };
  if (args.primaryUserId !== undefined) body.primaryUser = { id: args.primaryUserId };
  if (args.assignedToUserIds !== undefined) {
    body.assignedTo = args.assignedToUserIds.map((id) => ({ id }));
  }
  if (args.archived !== undefined) body.archived = args.archived;
  return body;
}

export async function updateWorkOrder(apiClient: ApiClient, args: UpdateWorkOrderArgs) {
  try {
    const body = buildPatchBody(args);
    if (Object.keys(body).length === 0) {
      return errorResult("No fields provided to update.");
    }

    const updated = await apiClient.patch<WorkOrderShowDTO>(`/work-orders/${args.workOrderId}`, body);

    return jsonResult({
      id: displayId(updated.customId, updated.id),
      workOrderId: updated.id,
      changedFields: Object.keys(body),
      current: {
        title: updated.title,
        description: updated.description ?? null,
        priority: updated.priority,
        dueDate: updated.dueDate ?? null,
        estimatedDuration: updated.estimatedDuration,
        location: formatMiniRef(updated.location),
        team: formatMiniRef(updated.team),
        category: formatMiniRef(updated.category),
        asset: formatMiniRef(updated.asset),
        primaryWorker: formatUserRef(updated.primaryUser),
        assignedTo: formatUserRefs(updated.assignedTo),
        archived: updated.archived,
      },
    });
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}
