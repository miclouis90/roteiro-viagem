import { describe, expect, it } from "vitest";
import { changedFields, permissions, tripAccess } from "./access";
import { demoTrip } from "../data/demo";
import type { TripAccess } from "../types";
const trip = (access: TripAccess) => ({
  ...demoTrip,
  ownerId: "michel",
  access,
  isPublic: access === "PUBLIC" || access === "PUBLIC_EDIT",
});
describe("trip collaboration permissions", () => {
  it.each(["PRIVATE", "SHARED", "PUBLIC", "PUBLIC_EDIT"] as TripAccess[])(
    "owner edits and manages %s",
    (mode) =>
      expect(permissions(trip(mode), "michel")).toMatchObject({
        canRead: true,
        canEdit: true,
        canManage: true,
      }),
  );
  it.each(["SHARED", "PUBLIC", "PUBLIC_EDIT"] as TripAccess[])(
    "editor edits but never manages %s",
    (mode) =>
      expect(permissions(trip(mode), "mel", false, true)).toMatchObject({
        canRead: true,
        canEdit: true,
        canManage: false,
      }),
  );
  it("PRIVATE excludes retained editor", () =>
    expect(permissions(trip("PRIVATE"), "mel", false, true)).toMatchObject({
      canRead: false,
      canEdit: false,
      canManage: false,
    }));
  it("PUBLIC permits anonymous reading only", () =>
    expect(permissions(trip("PUBLIC"))).toMatchObject({
      canRead: true,
      canEdit: false,
    }));
  it("PUBLIC_EDIT still requires authentication", () => {
    expect(permissions(trip("PUBLIC_EDIT")).canEdit).toBe(false);
    expect(permissions(trip("PUBLIC_EDIT"), "mel").canEdit).toBe(true);
  });
  it("platform admin does not become owner of another person's trip", () =>
    expect(permissions(trip("PRIVATE"), "other-admin", true)).toMatchObject({
      canRead: false,
      canEdit: false,
      canManage: false,
    }));
  it("legacy trips preserve visibility and admin access without migration", () => {
    expect(tripAccess(demoTrip)).toBe("PUBLIC");
    expect(tripAccess({ ...demoTrip, isPublic: false })).toBe("PRIVATE");
    expect(
      permissions({ ...demoTrip, isPublic: false }, "michel", true),
    ).toMatchObject({ legacy: true, canEdit: true });
    expect(demoTrip).not.toHaveProperty("ownerId");
  });
});
describe("partial concurrent edits", () => {
  it("only sends fields changed since form opened", () =>
    expect(
      changedFields(
        { title: "Lunch", location: "B", notes: "" },
        { title: "Lunch", location: "A", notes: "" },
      ),
    ).toEqual({ location: "B" }));
  it("preserves independent nested details", () =>
    expect(
      changedFields(
        { details: { type: "flight", seat: "2A", company: "LATAM" } },
        { details: { type: "flight", seat: "1A", company: "LATAM" } },
      ),
    ).toEqual({ "details.seat": "2A" }));
  it("replaces details when category type changes", () =>
    expect(
      changedFields(
        { details: { type: "bar" } },
        { details: { type: "flight", seat: "1A" } },
      ),
    ).toEqual({ details: { type: "bar" } }));
  it("represents intentional clearing without erasing other fields", () =>
    expect(
      changedFields(
        { details: { type: "flight" } },
        { details: { type: "flight", seat: "1A" } },
      ),
    ).toEqual({ "details.seat": undefined }));
});
