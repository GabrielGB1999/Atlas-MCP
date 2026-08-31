import { z } from "zod";
import { ApiClient } from "../http/apiClient";
import { AssetShowDTO } from "../atlasTypes";
import { errorResult, formatDate, jsonResult } from "../util/mcpResult";
import { displayId, formatMiniRef, formatMiniRefs, formatUserRef, formatUserRefs } from "../util/format";

export const getAssetShape = {
  assetId: z.number().int().positive(),
};

export async function getAsset(apiClient: ApiClient, args: { assetId: number }) {
  try {
    const asset = await apiClient.get<AssetShowDTO>(`/assets/${args.assetId}`);

    return jsonResult({
      // Same convention as work orders: the frontend shows customId as "the ID", never the
      // numeric database id. assetId is kept alongside for chaining further tool calls.
      id: displayId(asset.customId, asset.id),
      assetId: asset.id,
      name: asset.name,
      description: asset.description ?? null,
      status: asset.status,
      archived: asset.archived,
      hasChildren: asset.hasChildren,
      serialNumber: asset.serialNumber ?? null,
      model: asset.model ?? null,
      manufacturer: asset.manufacturer ?? null,
      barCode: asset.barCode ?? null,
      nfcId: asset.nfcId ?? null,
      area: asset.area ?? null,
      power: asset.power ?? null,
      acquisitionCost: asset.acquisitionCost ?? null,
      inServiceDate: formatDate(asset.inServiceDate),
      warrantyExpirationDate: formatDate(asset.warrantyExpirationDate),
      additionalInfos: asset.additionalInfos ?? null,
      relations: {
        location: formatMiniRef(asset.location),
        parentAsset: formatMiniRef(asset.parentAsset),
        category: formatMiniRef(asset.category),
        // Mirrors work orders: primaryWorker is the main/responsible worker for this asset,
        // distinct from the broader assignedTo list.
        primaryWorker: formatUserRef(asset.primaryUser),
        assignedTo: formatUserRefs(asset.assignedTo),
        teams: formatMiniRefs(asset.teams),
        vendors: formatMiniRefs(asset.vendors),
        customers: formatMiniRefs(asset.customers),
      },
      parts: formatMiniRefs(asset.parts),
      files: formatMiniRefs(asset.files),
    });
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}
