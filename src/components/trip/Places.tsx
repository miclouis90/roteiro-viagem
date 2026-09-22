import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Trip, TripEvent } from "../../types";
import { categoryOf, categoryGroups } from "../../data/categories";
import { safeUrl } from "../../utils/money";
import { collectPlaces } from "../../utils/places";
import { formatDate } from "../../utils/dates";
import { eventLabels } from "../../utils/labels";
import { CategoryChip, EmptyState } from "../ui/Primitives";
const groups = [{ id: "", label: "Todos", tone: "other" }, ...categoryGroups];
export function Places({ trip, events, onSelect }: { trip: Trip; events: TripEvent[]; onSelect: (e: TripEvent) => void }) {
  const [group, setGroup] = useState("");
  const places = collectPlaces(events.filter((e) => !group || categoryOf(e.category).group === group));
  return <>
    <div className="chip-scroll" aria-label="Tipos de lugar">{groups.map(({id,label,tone}) => <button key={id} className={`filter-chip tone-${tone} ${group === id ? "active" : ""}`} aria-pressed={group === id} onClick={() => setGroup(id)}>{label}</button>)}</div>
    {places.length ? <div className="places-grid">{places.map((place) => {
      const event = place.events[0];
      const url = safeUrl(event.mapsUrl) || (place.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.location + " " + trip.destinationCity)}` : undefined);
      const tone = categoryOf(event.category).tone;
      return <article className={`place-card collection-card tone-${tone}`} key={place.key}>
        <div className="place-art" aria-hidden="true"><CategoryChip name={event.category} iconOnly /><span /><span /></div>
        <button className="place-main" onClick={() => onSelect(event)}><span><strong>{place.name}</strong><span className="muted">{place.location || "Local a definir"}</span></span><ArrowUpRight size={16} /></button>
        <div className="place-caption"><span>{place.events.length > 1 ? `${place.events.length} visitas no roteiro` : "Salvo do roteiro"}</span><span className={`status-chip status-${event.status}`}>{eventLabels[event.status]}</span></div>
        {place.events.length > 1 && <details className="expandable place-visits"><summary>Ver visitas</summary>{place.events.map((visit) => <button className="ghost" key={visit.id} onClick={() => onSelect(visit)}>{formatDate(visit.date)} · {visit.startTime} · {visit.title}</button>)}</details>}
        <div className="place-footer"><CategoryChip name={event.category} />{url && <a href={url} target="_blank" rel="noopener noreferrer">Abrir no mapa<ArrowUpRight size={14} /></a>}</div>
      </article>;
    })}</div> : <EmptyState title="Sua coleção começa pelo roteiro." description="Adicione um lugar que você quer conhecer e ele aparece aqui." />}
  </>;
}
