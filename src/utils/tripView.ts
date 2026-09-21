export type TripTab = "geral" | "roteiro" | "lugares" | "gastos";
export const defaultTripTab: TripTab = "geral";
export function tripTabFromSearch(params: URLSearchParams): TripTab {
  const tab = params.get("tab");
  return tab === "roteiro" || tab === "lugares" || tab === "gastos"
    ? tab
    : defaultTripTab;
}
