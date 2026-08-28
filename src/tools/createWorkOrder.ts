import { z } from "zod";
import { ApiClient } from "../http/apiClient";
import { WorkOrderPostBody, WorkOrderShowDTO } from "../atlasTypes";
import { errorResult, jsonResult } from "../util/mcpResult";
import { ASSET_STATUS_VALUES, PRIORITY_VALUES, STATUS_VALUES } from "./enums";

const isoDate = z.string().datetime({ offset: true });

export const createWorkOrderShape = {
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(PRIORITY_VALUES).default("NONE"),
  dueDate: isoDate.optional(),
  estimatedDuration: z.number().nonnegative().optional(),
  estimatedStartDate: isoDate.optional(),
  requiredSignature: z.boolean().default(false),
  status: z.enum(STATUS_VALUES).default("OPEN"),
  customId: z.string().optional(),
  locationId: z.number().int().positive().optional(),
  teamId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  assetId: z.number().int().positive().optional(),
  primaryUserId: z.number().int().positive().optional(),
  assignedToUserIds: z.array(z.number().int().positive()).max(200).optional(),
  assetStatus: z.enum(ASSET_STATUS_VALUES).optional(),
};

type CreateWorkOrderArgs = {
  title: string;
  description: string;
  priority: (typeof PRIORITY_VALUES)[number];
  dueDate?: string;
  estimatedDuration?: number;
  estimatedStartDate?: string;
  requiredSignature: boolean;
  status: (typeof STATUS_VALUES)[number];
  customId?: string;
  locationId?: number;
  teamId?: number;
  categoryId?: number;
  assetId?: number;
  primaryUserId?: number;
  assignedToUserIds?: number[];
  assetStatus?: (typeof ASSET_STATUS_VALUES)[number];
};

export async function createWorkOrder(apiClient: ApiClient, args: CreateWorkOrderArgs) {
  try {
    const body: WorkOrderPostBody = {
      title: args.title,
      description: args.description,
      priority: args.priority,
      status: args.status,
      requiredSignature: args.requiredSignature,
      ...(args.dueDate ? { dueDate: args.dueDate } : {}),
      ...(args.estimatedDuration !== undefined ? { estimatedDuration: args.estimatedDuration } : {}),
      ...(args.estimatedStartDate ? { estimatedStartDate: args.estimatedStartDate } : {}),
      ...(args.customId ? { customId: args.customId } : {}),
      ...(args.locationId !== undefined ? { location: { id: args.locationId } } : {}),
      ...(args.teamId !== undefined ? { team: { id: args.teamId } } : {}),
      ...(args.categoryId !== undefined ? { category: { id: args.categoryId } } : {}),
      ...(args.assetId !== undefined ? { asset: { id: args.assetId } } : {}),
      ...(args.primaryUserId !== undefined ? { primaryUser: { id: args.primaryUserId } } : {}),
      ...(args.assignedToUserIds && args.assignedToUserIds.length > 0
        ? { assignedTo: args.assignedToUserIds.map((id) => ({ id })) }
        : {}),
      ...(args.assetStatus ? { assetStatus: args.assetStatus } : {}),
    };

    const created = await apiClient.post<WorkOrderShowDTO>("/work-orders", body);

    return jsonResult({
      id: created.id,
      title: created.title,
      description: created.description ?? null,
      status: created.status,
      priority: created.priority,
      dueDate: created.dueDate ?? null,
      estimatedDuration: created.estimatedDuration,
      customId: created.customId ?? null,
      location: created.location ?? null,
      team: created.team ?? null,
      category: created.category ?? null,
      asset: created.asset ?? null,
      primaryUser: created.primaryUser ?? null,
      assignedTo: created.assignedTo,
    });
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}
