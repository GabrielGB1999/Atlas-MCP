import { z } from "zod";
import { ApiClient } from "../http/apiClient";
import { WorkOrderDiscrepancyShowDTO, WorkOrderShowDTO } from "../atlasTypes";
import { errorResult, formatDate, jsonResult } from "../util/mcpResult";
import { displayId, formatMiniRef, formatMiniRefs, formatUserRef, formatUserRefs } from "../util/format";
import { resolveUserNames } from "../util/userLookup";

export const getWorkOrderShape = {
  workOrderId: z.number().int().positive(),
};

export async function getWorkOrder(apiClient: ApiClient, args: { workOrderId: number }) {
  try {
    const wo = await apiClient.get<WorkOrderShowDTO>(`/work-orders/${args.workOrderId}`);
    const basePayload = buildWorkOrderPayload(wo);

    // Discrepancies ("squawks") live on a separate endpoint, scoped to this work order.
    // Fetched alongside so "get the full picture of a work order" is one tool call.
    let discrepancies: WorkOrderDiscrepancyShowDTO[];
    try {
      discrepancies = await apiClient.get<WorkOrderDiscrepancyShowDTO[]>(
        `/work-order-discrepancies/work-order/${args.workOrderId}`,
      );
    } catch (err) {
      // Don't fail the whole work order lookup if discrepancies can't be fetched
      // (e.g. permission edge case) — surface it as a note instead.
      return jsonResult({
        ...basePayload,
        discrepancies: [],
        discrepanciesError: err instanceof Error ? err.message : String(err),
      });
    }

    // The discrepancy DTO only exposes "who raised it" as a raw createdBy id, not a name —
    // resolve those via the users endpoint so the output never shows a bare "User #225".
    const raiserIds = discrepancies.map((d) => d.createdBy).filter((id): id is number => typeof id === "number");
    const nameById = await resolveUserNames(apiClient, raiserIds);

    return jsonResult({
      ...basePayload,
      discrepancies: discrepancies.map((d) => ({
        id: d.id,
        description: d.description,
        correctiveMeasure: d.correctiveMeasure ?? null,
        status: d.status,
        derivedWorkOrder: d.derivedWorkOrder
          ? {
              id: displayId(d.derivedWorkOrder.customId, d.derivedWorkOrder.id),
              workOrderId: d.derivedWorkOrder.id,
              title: d.derivedWorkOrder.title,
              status: d.derivedWorkOrder.status,
            }
          : null,
        raisedBy:
          typeof d.createdBy === "number"
            ? { id: d.createdBy, name: nameById.get(d.createdBy) ?? `User #${d.createdBy}` }
            : null,
        createdAt: formatDate(d.createdAt),
      })),
    });
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}

function buildWorkOrderPayload(wo: WorkOrderShowDTO) {
  return {
    // The frontend always shows customId ("WO000001") as "the ID" — never the numeric
    // database id. workOrderId is kept alongside it only because that's what this MCP's
    // other tools (update-work-order, change-work-order-status, ...) require as input.
    id: displayId(wo.customId, wo.id),
    workOrderId: wo.id,
    title: wo.title,
    description: wo.description ?? null,
    status: wo.status,
    priority: wo.priority,
    dueDate: formatDate(wo.dueDate),
    estimatedDuration: wo.estimatedDuration,
    estimatedStartDate: formatDate(wo.estimatedStartDate),
    relations: {
      // "Primary Worker" is the frontend's own label for primaryUser, shown as a distinct,
      // singular field on the work order detail page — separate from and more prominent
      // than assignedTo's "Assigned To" list. Treat this as THE answer to "who is working
      // on this work order"; assignedTo are additional/other workers, not the main one.
      primaryWorker: formatUserRef(wo.primaryUser),
      assignedTo: formatUserRefs(wo.assignedTo),
      location: formatMiniRef(wo.location),
      team: formatMiniRef(wo.team),
      asset: formatMiniRef(wo.asset),
      category: formatMiniRef(wo.category),
    },
    completion: {
      completedBy: formatUserRef(wo.completedBy),
      completedOn: formatDate(wo.completedOn),
      archived: wo.archived,
    },
    extra: {
      feedback: wo.feedback ?? null,
      hasAudioDescription: !!wo.audioDescription,
      files: formatMiniRefs(wo.files),
      fileCount: wo.files.length,
    },
  };
}
