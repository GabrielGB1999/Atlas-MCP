import { z } from "zod";
import { ApiClient } from "../http/apiClient";
import { PageResponse, SearchCriteria, WorkOrderShowDTO, toApiDateString } from "../atlasTypes";
import { Logger } from "../util/logger";
import { errorResult, formatDate, jsonResult, textResult } from "../util/mcpResult";
import { PRIORITY_VALUES, STATUS_VALUES } from "./enums";

export const weeklyReportShape = {
  weekOffset: z.number().int().default(0).describe("0 = current week, -1 = last week, 1 = next week"),
  format: z.enum(["JSON", "MARKDOWN", "HTML"]).default("MARKDOWN"),
  includeCompletedDetails: z.boolean().default(false),
};

type WeeklyReportArgs = {
  weekOffset: number;
  format: "JSON" | "MARKDOWN" | "HTML";
  includeCompletedDetails: boolean;
};

const MAX_PAGES = 25;
const PAGE_SIZE = 200;

/** Monday 00:00:00.000Z through the following Monday (exclusive), shifted by weekOffset weeks. */
function getWeekRange(weekOffset: number): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset + weekOffset * 7),
  );
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);
  return { start: monday, end: nextMonday };
}

async function fetchAllInRange(apiClient: ApiClient, logger: Logger, start: Date, end: Date): Promise<WorkOrderShowDTO[]> {
  const filterFields: SearchCriteria["filterFields"] = [
    { field: "dueDate", operation: "ge", value: toApiDateString(start), values: [], enumName: "JS_DATE" },
    { field: "dueDate", operation: "le", value: toApiDateString(end), values: [], enumName: "JS_DATE" },
  ];

  const results: WorkOrderShowDTO[] = [];
  for (let pageNum = 0; pageNum < MAX_PAGES; pageNum++) {
    const criteria: SearchCriteria = {
      filterFields,
      direction: "ASC",
      pageNum,
      pageSize: PAGE_SIZE,
      sortField: "id",
    };
    const page = await apiClient.post<PageResponse<WorkOrderShowDTO>>("/work-orders/search", criteria);
    results.push(...page.content);
    if (pageNum + 1 >= page.totalPages) {
      return results;
    }
  }
  logger.warn("Weekly report hit the page cap; results may be incomplete", {
    fetchedSoFar: results.length,
    maxPages: MAX_PAGES,
  });
  return results;
}

interface Aggregation {
  total: number;
  byStatus: Record<(typeof STATUS_VALUES)[number], WorkOrderShowDTO[]>;
  byPriority: Record<(typeof PRIORITY_VALUES)[number], WorkOrderShowDTO[]>;
  archivedCount: number;
  onTime: number;
  overdue: number;
  byTeam: Map<string, number>;
  byLocation: Map<string, number>;
}

function aggregate(workOrders: WorkOrderShowDTO[]): Aggregation {
  const now = Date.now();
  const byStatus: Aggregation["byStatus"] = { OPEN: [], IN_PROGRESS: [], ON_HOLD: [], COMPLETE: [] };
  const byPriority: Aggregation["byPriority"] = { NONE: [], LOW: [], MEDIUM: [], HIGH: [] };
  const byTeam = new Map<string, number>();
  const byLocation = new Map<string, number>();
  let archivedCount = 0;
  let onTime = 0;
  let overdue = 0;

  for (const wo of workOrders) {
    byStatus[wo.status].push(wo);
    byPriority[wo.priority].push(wo);
    if (wo.archived) archivedCount++;

    const isPastDue = wo.dueDate ? new Date(wo.dueDate).getTime() < now : false;
    const isLateCompletion =
      wo.status === "COMPLETE" && wo.dueDate && wo.completedOn
        ? new Date(wo.completedOn).getTime() > new Date(wo.dueDate).getTime()
        : false;
    if (wo.status === "COMPLETE" ? isLateCompletion : isPastDue) {
      overdue++;
    } else {
      onTime++;
    }

    const teamName = wo.team?.name ?? "Unassigned";
    byTeam.set(teamName, (byTeam.get(teamName) ?? 0) + 1);
    const locationName = wo.location?.name ?? "Unassigned";
    byLocation.set(locationName, (byLocation.get(locationName) ?? 0) + 1);
  }

  return { total: workOrders.length, byStatus, byPriority, archivedCount, onTime, overdue, byTeam, byLocation };
}

function avgDaysBetween(pairs: { start: string; end: string }[]): number | null {
  if (pairs.length === 0) return null;
  const totalDays = pairs.reduce((sum, { start, end }) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return sum + ms / (1000 * 60 * 60 * 24);
  }, 0);
  return Math.round((totalDays / pairs.length) * 10) / 10;
}

function priorityBreakdown(items: WorkOrderShowDTO[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const wo of items) out[wo.priority] = (out[wo.priority] ?? 0) + 1;
  return out;
}

function buildReportData(agg: Aggregation, start: Date, end: Date, includeCompletedDetails: boolean) {
  const priorityOrder: (typeof PRIORITY_VALUES)[number][] = ["HIGH", "MEDIUM", "LOW", "NONE"];
  const topUrgentOpen = [...agg.byStatus.OPEN]
    .sort((a, b) => {
      const pDiff = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
      if (pDiff !== 0) return pDiff;
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
    })
    .slice(0, 3)
    .map((wo) => ({ id: wo.id, title: wo.title, priority: wo.priority, dueDate: wo.dueDate ?? null }));

  const assigneeBreakdown = new Map<string, number>();
  for (const wo of agg.byStatus.IN_PROGRESS) {
    for (const user of wo.assignedTo) {
      const name = user.name ?? `User #${user.id}`;
      assigneeBreakdown.set(name, (assigneeBreakdown.get(name) ?? 0) + 1);
    }
  }

  const avgInProgressEstimatedDuration =
    agg.byStatus.IN_PROGRESS.length > 0
      ? Math.round(
          (agg.byStatus.IN_PROGRESS.reduce((sum, wo) => sum + wo.estimatedDuration, 0) /
            agg.byStatus.IN_PROGRESS.length) *
            10,
        ) / 10
      : null;

  const avgCompletionDays = avgDaysBetween(
    agg.byStatus.COMPLETE.filter((wo) => wo.createdAt && wo.completedOn).map((wo) => ({
      start: wo.createdAt as string,
      end: wo.completedOn as string,
    })),
  );

  return {
    weekOf: formatDate(start.toISOString()),
    weekRange: { start: start.toISOString(), end: end.toISOString() },
    executiveSummary: {
      totalWorkOrders: agg.total,
      completionRatePct: agg.total > 0 ? Math.round((agg.byStatus.COMPLETE.length / agg.total) * 1000) / 10 : 0,
      onTime: agg.onTime,
      overdue: agg.overdue,
    },
    byStatus: {
      OPEN: {
        count: agg.byStatus.OPEN.length,
        byPriority: priorityBreakdown(agg.byStatus.OPEN),
        topUrgent: topUrgentOpen,
      },
      IN_PROGRESS: {
        count: agg.byStatus.IN_PROGRESS.length,
        byAssignee: Object.fromEntries(assigneeBreakdown),
        avgEstimatedDurationHours: avgInProgressEstimatedDuration,
      },
      COMPLETE: {
        count: agg.byStatus.COMPLETE.length,
        avgTimeToCompleteDays: avgCompletionDays,
        ...(includeCompletedDetails
          ? {
              items: agg.byStatus.COMPLETE.map((wo) => ({
                id: wo.id,
                title: wo.title,
                completedOn: wo.completedOn ?? null,
                completedBy: wo.completedBy?.name ?? null,
              })),
            }
          : {}),
      },
      ON_HOLD: { count: agg.byStatus.ON_HOLD.length },
    },
    archivedCount: agg.archivedCount,
    byPriority: {
      HIGH: agg.byPriority.HIGH.length,
      MEDIUM: agg.byPriority.MEDIUM.length,
      LOW: agg.byPriority.LOW.length,
      NONE: agg.byPriority.NONE.length,
    },
    byTeam: Object.fromEntries(agg.byTeam),
    byLocation: Object.fromEntries(agg.byLocation),
    notes: [
      "'On-time' vs 'overdue': for open/in-progress work orders, overdue means the due date has passed; for completed ones, overdue means completedOn was after dueDate. Work orders with no dueDate are counted as on-time.",
      "'Avg estimated duration' for IN_PROGRESS work orders is the estimatedDuration field, not elapsed/remaining time — the API surfaced by these tools doesn't expose time-tracking data.",
      "Blocking-relationship data (work order Relation/BLOCKS links) is not available through the list/get endpoints these tools call, so it's omitted rather than guessed.",
    ],
  };
}

type ReportData = ReturnType<typeof buildReportData>;

function toMarkdown(data: ReportData): string {
  const lines: string[] = [];
  lines.push(`# Weekly Work Order Report — Week of ${data.weekOf}`);
  lines.push("");
  lines.push("## Executive Summary");
  lines.push(`- **Total Work Orders:** ${data.executiveSummary.totalWorkOrders}`);
  lines.push(`- **Completion Rate:** ${data.executiveSummary.completionRatePct}%`);
  lines.push(`- **On-Time:** ${data.executiveSummary.onTime} | **Overdue:** ${data.executiveSummary.overdue}`);
  lines.push("");
  lines.push("## By Status");
  const open = data.byStatus.OPEN;
  lines.push(
    `- **OPEN:** ${open.count} (HIGH: ${open.byPriority.HIGH ?? 0}, MEDIUM: ${open.byPriority.MEDIUM ?? 0}, LOW: ${
      open.byPriority.LOW ?? 0
    }, NONE: ${open.byPriority.NONE ?? 0})`,
  );
  if (open.topUrgent.length > 0) {
    lines.push(`  - Top Urgent: ${open.topUrgent.map((wo) => `#${wo.id} "${wo.title}" (${wo.priority})`).join(", ")}`);
  }
  const inProgress = data.byStatus.IN_PROGRESS;
  lines.push(`- **IN_PROGRESS:** ${inProgress.count}`);
  const assigneeEntries = Object.entries(inProgress.byAssignee);
  if (assigneeEntries.length > 0) {
    lines.push(`  - By Assignee: ${assigneeEntries.map(([name, count]) => `${name} (${count})`).join(", ")}`);
  }
  if (inProgress.avgEstimatedDurationHours !== null) {
    lines.push(`  - Avg estimated duration: ${inProgress.avgEstimatedDurationHours}h`);
  }
  const complete = data.byStatus.COMPLETE;
  lines.push(`- **COMPLETE:** ${complete.count}`);
  if (complete.avgTimeToCompleteDays !== null) {
    lines.push(`  - Avg time to complete: ${complete.avgTimeToCompleteDays} days`);
  }
  lines.push(`- **ON_HOLD:** ${data.byStatus.ON_HOLD.count}`);
  lines.push(`- **Archived (any status):** ${data.archivedCount}`);
  lines.push("");
  lines.push("## By Priority");
  lines.push(`- HIGH: ${data.byPriority.HIGH}`);
  lines.push(`- MEDIUM: ${data.byPriority.MEDIUM}`);
  lines.push(`- LOW: ${data.byPriority.LOW}`);
  lines.push(`- NONE: ${data.byPriority.NONE}`);
  lines.push("");
  lines.push("## By Team");
  for (const [team, count] of Object.entries(data.byTeam)) {
    lines.push(`- ${team}: ${count} work orders`);
  }
  lines.push("");
  lines.push("## By Location");
  for (const [location, count] of Object.entries(data.byLocation)) {
    lines.push(`- ${location}: ${count} work orders`);
  }
  lines.push("");
  lines.push("## Notes");
  for (const note of data.notes) {
    lines.push(`- ${note}`);
  }
  return lines.join("\n");
}

function toHtml(data: ReportData, markdown: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Weekly Work Order Report — ${data.weekOf}</title></head><body><pre>${escaped}</pre></body></html>`;
}

export async function generateWeeklyWorkOrderReport(
  apiClient: ApiClient,
  logger: Logger,
  args: WeeklyReportArgs,
) {
  try {
    const { start, end } = getWeekRange(args.weekOffset);
    const workOrders = await fetchAllInRange(apiClient, logger, start, end);
    const agg = aggregate(workOrders);
    const data = buildReportData(agg, start, end, args.includeCompletedDetails);

    if (args.format === "JSON") {
      return jsonResult(data);
    }
    const markdown = toMarkdown(data);
    if (args.format === "MARKDOWN") {
      return textResult(markdown);
    }
    return textResult(toHtml(data, markdown));
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}
