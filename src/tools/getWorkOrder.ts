import { z } from "zod";
import { ApiClient } from "../http/apiClient";
import { WorkOrderShowDTO } from "../atlasTypes";
import { errorResult, formatDate, jsonResult } from "../util/mcpResult";

export const getWorkOrderShape = {
  workOrderId: z.number().int().positive(),
};

export async function getWorkOrder(apiClient: ApiClient, args: { workOrderId: number }) {
  try {
    const wo = await apiClient.get<WorkOrderShowDTO>(`/work-orders/${args.workOrderId}`);

    return jsonResult({
      id: wo.id,
      title: wo.title,
      description: wo.description ?? null,
      status: wo.status,
      priority: wo.priority,
      dueDate: formatDate(wo.dueDate),
      estimatedDuration: wo.estimatedDuration,
      estimatedStartDate: formatDate(wo.estimatedStartDate),
      relations: {
        assignedTo: wo.assignedTo.map((u) => ({ id: u.id, name: u.name ?? null })),
        location: wo.location ? { id: wo.location.id, name: wo.location.name ?? null } : null,
        team: wo.team ? { id: wo.team.id, name: wo.team.name ?? null } : null,
        primaryUser: wo.primaryUser ? { id: wo.primaryUser.id, name: wo.primaryUser.name ?? null } : null,
        asset: wo.asset ? { id: wo.asset.id, name: wo.asset.name ?? null } : null,
        category: wo.category ? { id: wo.category.id, name: wo.category.name ?? null } : null,
      },
      completion: {
        completedBy: wo.completedBy ? { id: wo.completedBy.id, name: wo.completedBy.name ?? null } : null,
        completedOn: formatDate(wo.completedOn),
        archived: wo.archived,
      },
      extra: {
        feedback: wo.feedback ?? null,
        hasAudioDescription: !!wo.audioDescription,
        customId: wo.customId ?? null,
        files: wo.files.map((f) => ({ id: f.id, name: f.name ?? null })),
        fileCount: wo.files.length,
      },
    });
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}
