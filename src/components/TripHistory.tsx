import { useState } from "react";
import type { Trip } from "../types";
import { groupTripHistory } from "../utils/filterHomeTrips";
import { TripCard } from "./TripCard";

export function TripHistory({ trips, filterKey }: { trips: readonly Trip[]; filterKey: string }) {
  return <section className="home-section home-others"><h2>Outras viagens</h2><div className="home-history">{groupTripHistory(trips).map((group, index) =>
    <HistoryYear key={`${group.year}:${filterKey}`} year={group.year} trips={group.trips} initiallyOpen={index === 0} />)}</div></section>;
}
function HistoryYear({ year, trips, initiallyOpen }: { year: string; trips: Trip[]; initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen), [limit, setLimit] = useState(12);
  return <details className="home-history-year" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><strong>{year}</strong><span>{trips.length} {trips.length === 1 ? "viagem" : "viagens"}</span></summary>
    {open && <><div className="home-trip-list">{trips.slice(0, limit).map(trip => <TripCard key={trip.id} trip={trip} compact />)}</div>{limit < trips.length && <button type="button" className="ghost home-history-more" onClick={() => setLimit(value => value + 12)}>Mostrar mais viagens de {year} ({trips.length - limit})</button>}</>}
  </details>;
}
