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
