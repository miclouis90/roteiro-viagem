export type TripTab = "geral" | "roteiro" | "gastos";
export const defaultTripTab: TripTab = "geral";
export function tripTabFromSearch(params: URLSearchParams): TripTab {
  const tab = params.get("tab");
  return tab === "lugares"
    ? "roteiro"
    : tab === "roteiro" || tab === "gastos"
      ? tab
      : defaultTripTab;
}

export function itineraryViewFromSearch(
  params: URLSearchParams,
): "roteiro" | "lugares" {
  return params.get("tab") === "lugares" || params.get("view") === "lugares"
    ? "lugares"
    : "roteiro";
}
