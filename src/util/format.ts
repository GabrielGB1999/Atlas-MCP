import { MiniDTO, UserMiniDTO } from "../atlasTypes";

/** Renders a UserMiniDTO as a display name. There is no combined "name" field on the API side
 * (see atlasTypes.ts) — firstName/lastName are joined here instead. */
export function formatUserName(user: UserMiniDTO | null | undefined): string | null {
  if (!user) return null;
  const parts = [user.firstName, user.lastName].filter((p): p is string => !!p && p.trim().length > 0);
  if (parts.length === 0) return `User #${user.id}`;
  return parts.join(" ");
}

export function formatUserRef(user: UserMiniDTO | null | undefined): { id: number; name: string } | null {
  if (!user) return null;
  return { id: user.id, name: formatUserName(user) as string };
}

export function formatUserRefs(users: UserMiniDTO[]): { id: number; name: string }[] {
  return users.map((u) => formatUserRef(u) as { id: number; name: string });
}

/** Renders a generic entity mini (location/team/category/asset/file/...) with a readable name,
 * falling back to a labeled id when the API didn't populate `name`. */
export function formatMiniRef(mini: MiniDTO | null | undefined): { id: number; name: string } | null {
  if (!mini) return null;
  return { id: mini.id, name: mini.name ?? `#${mini.id}` };
}

export function formatMiniRefs(minis: MiniDTO[]): { id: number; name: string }[] {
  return minis.map((m) => formatMiniRef(m) as { id: number; name: string });
}

/**
 * The frontend never shows the numeric database id as "the ID" of a work order or asset — every
 * list/detail view binds its "Id" column/field to `customId` (format "WO000001" for work orders,
 * verified in WorkOrderService.getWorkOrderNumber and WorkOrderDetails.tsx / Assets/index.tsx).
 * Use this for any field a human will read as "the ID"; keep the raw numeric id only under a
 * clearly-labeled field (e.g. `workOrderId`/`assetId`) for chaining further tool calls.
 */
export function displayId(customId: string | null | undefined, numericId: number): string {
  return customId && customId.trim().length > 0 ? customId : `#${numericId}`;
}
