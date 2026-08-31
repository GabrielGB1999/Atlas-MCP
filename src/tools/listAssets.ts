import { z } from "zod";
import { ApiClient } from "../http/apiClient";
import { AssetShowDTO, PageResponse, SearchCriteria } from "../atlasTypes";
import { errorResult, jsonResult } from "../util/mcpResult";
import { displayId, formatMiniRef } from "../util/format";

export const listAssetsShape = {
  nameContains: z.string().optional().describe("Case-insensitive substring match on asset name"),
  locationId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  archived: z.boolean().optional(),
  pageNum: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortField: z.string().default("id"),
  direction: z.enum(["ASC", "DESC"]).default("ASC"),
};

type ListAssetsArgs = {
  nameContains?: string;
  locationId?: number;
  categoryId?: number;
  archived?: boolean;
  pageNum: number;
  pageSize: number;
  sortField: string;
  direction: "ASC" | "DESC";
};

function buildSearchCriteria(args: ListAssetsArgs): SearchCriteria {
  const filterFields: SearchCriteria["filterFields"] = [];

  if (args.nameContains) {
    filterFields.push({ field: "name", operation: "cn", value: args.nameContains, values: [] });
  }
  if (args.locationId !== undefined) {
    filterFields.push({ field: "location", operation: "in", value: "", values: [args.locationId] });
  }
  if (args.categoryId !== undefined) {
    filterFields.push({ field: "category", operation: "in", value: "", values: [args.categoryId] });
  }
  if (args.archived !== undefined) {
    filterFields.push({ field: "archived", operation: "eq", value: args.archived, values: [] });
  }

  return {
    filterFields,
    direction: args.direction,
    pageNum: args.pageNum,
    pageSize: args.pageSize,
    sortField: args.sortField,
  };
}

export async function listAssets(apiClient: ApiClient, args: ListAssetsArgs) {
  try {
    const criteria = buildSearchCriteria(args);
    const page = await apiClient.post<PageResponse<AssetShowDTO>>("/assets/search", criteria);

    const items = page.content.map((asset) => ({
      id: displayId(asset.customId, asset.id),
      assetId: asset.id,
      name: asset.name,
      status: asset.status,
      archived: asset.archived,
      location: formatMiniRef(asset.location),
      category: formatMiniRef(asset.category),
      model: asset.model ?? null,
      manufacturer: asset.manufacturer ?? null,
    }));

    return jsonResult({
      assets: items,
      pagination: {
        pageNumber: page.number,
        pageSize: page.size,
        totalElements: page.totalElements,
        totalPages: page.totalPages,
      },
      note:
        "Asset status is not filterable here — the API's search filter needs an enum-name conversion " +
        "that isn't wired up for AssetStatus server-side, so a status filter would silently match nothing. " +
        "Use get-asset on individual results if you need to check status.",
    });
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}
