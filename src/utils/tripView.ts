export type ItineraryType = "all" | "programs" | "places";
export type TripTab = "geral" | "roteiro" | "gastos";
export const defaultTripTab: TripTab = "geral";
export function tripTabFromSearch(params: URLSearchParams): TripTab {
  const tab = params.get("tab");
  return tab === "lugares" || tab === "calendario"
    ? "roteiro"
    : tab === "roteiro" || tab === "gastos"
      ? tab
      : defaultTripTab;
}

export function itineraryTypeFromSearch(params: URLSearchParams): ItineraryType {
  const type = params.get("type");
  if (type === "programs" || type === "places") return type;
  return params.get("tab") === "lugares" || params.get("view") === "lugares" ? "places" : "all";
}

export function normalizeItinerarySearch(params: URLSearchParams) {
  const next = new URLSearchParams(params);
  if (tripTabFromSearch(params) !== "roteiro") return next;
  if (itineraryTypeFromSearch(params) === "places") next.set("type", "places");
  next.set("tab", "roteiro");
  next.delete("view");
  return next;
}
