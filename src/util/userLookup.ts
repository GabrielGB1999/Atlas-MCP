import { ApiClient } from "../http/apiClient";
import { UserResponseDTO } from "../atlasTypes";
import { formatUserName } from "./format";

/**
 * Resolves user ids (e.g. an audit "createdBy" field, which the API only exposes as a raw id,
 * not a UserMiniDTO) to display names via GET /users/{id}. Ids that fail to resolve (deleted
 * user, permission edge case) are simply omitted from the result rather than failing the caller.
 */
export async function resolveUserNames(apiClient: ApiClient, ids: number[]): Promise<Map<number, string>> {
  const uniqueIds = [...new Set(ids)];
  const result = new Map<number, string>();

  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const user = await apiClient.get<UserResponseDTO>(`/users/${id}`);
        const name = formatUserName({ id: user.id, firstName: user.firstName, lastName: user.lastName });
        if (name) result.set(id, name);
      } catch {
        // Leave unresolved; caller falls back to showing the raw id.
      }
    }),
  );

  return result;
}
