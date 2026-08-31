import { z } from "zod";
import { ApiClient } from "../http/apiClient";
import { AssetShowDTO } from "../atlasTypes";
import { errorResult, formatDate, jsonResult } from "../util/mcpResult";
import { formatMiniRef, formatMiniRefs, formatUserRef, formatUserRefs } from "../util/format";

export const getAssetShape = {
  assetId: z.number().int().positive(),
};

export async function getAsset(apiClient: ApiClient, args: { assetId: number }) {
  try {
    const asset = await apiClient.get<AssetShowDTO>(`/assets/${args.assetId}`);

    return jsonResult({
      id: asset.id,
      name: asset.name,
      description: asset.description ?? null,
      status: asset.status,
      archived: asset.archived,
      hasChildren: asset.hasChildren,
      customId: asset.customId ?? null,
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
        primaryUser: formatUserRef(asset.primaryUser),
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
