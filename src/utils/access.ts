import type { Trip } from "../types";
export const tripAccess = (trip: Trip) =>
  trip.access ?? (trip.isPublic ? "PUBLIC" : "PRIVATE");
export function permissions(
  trip: Trip,
  uid?: string,
  platformAdmin = false,
  editor = false,
) {
  const access = tripAccess(trip);
  const legacy = !trip.ownerId && platformAdmin;
  const owner = !!uid && trip.ownerId === uid;
  const member = !!uid && editor && access !== "PRIVATE";
  const publicRead = access === "PUBLIC" || access === "PUBLIC_EDIT";
  return {
    owner,
    legacy,
    canRead: owner || legacy || member || publicRead,
    canEdit: owner || legacy || member || (!!uid && access === "PUBLIC_EDIT"),
    canManage: owner,
  };
}
// Compare against the form's opening snapshot, not the latest remote snapshot.
// Dotted fields preserve unrelated concurrent edits inside optional detail maps.
export function changedFields(
  input: Record<string, unknown>,
  baseline: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const key of new Set([
    ...Object.keys(input),
    ...Object.keys(baseline),
  ])) {
    if (key === "id") continue;
    const a = input[key],
      b = baseline[key],
      path = prefix + key;
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if (
      a &&
      b &&
      typeof a === "object" &&
      typeof b === "object" &&
      !Array.isArray(a) &&
      !Array.isArray(b) &&
      (a as { type?: string }).type === (b as { type?: string }).type
    ) {
      Object.assign(
        patch,
        changedFields(
          a as Record<string, unknown>,
          b as Record<string, unknown>,
          `${path}.`,
        ),
      );
    } else patch[path] = a;
  }
  return patch;
}
