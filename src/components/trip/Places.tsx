import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Trip, TripEvent } from "../../types";
import { categoryOf } from "../../data/categories";
import { safeUrl } from "../../utils/money";
import { CategoryChip, EmptyState } from "../ui/Primitives";
const groups = [
  ["", "Todos"],
  ["food", "Comer"],
  ["night", "Beber"],
  ["culture", "Cultura"],
  ["outdoor", "Passear"],
];
export function Places({
  trip,
  events,
  onSelect,
}: {
  trip: Trip;
  events: TripEvent[];
  onSelect: (e: TripEvent) => void;
}) {
  const [group, setGroup] = useState("");
  const places = events.filter(
    (e) => !group || categoryOf(e.category).group === group,
  );
  return (
    <>
      <div className="chip-scroll" aria-label="Tipos de lugar">
        {groups.map(([value, label]) => (
          <button
            key={value}
            className={`filter-chip ${group === value ? "active" : ""}`}
            aria-pressed={group === value}
            onClick={() => setGroup(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {places.length ? (
        <div className="places-grid">
          {places.map((e) => {
            const url =
              safeUrl(e.mapsUrl) ||
              (e.location
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location + " " + trip.destinationCity)}`
                : undefined);
            return (
              <article className="place-card" key={e.id}>
                <button className="place-main" onClick={() => onSelect(e)}>
                  <CategoryChip name={e.category} iconOnly />
                  <span>
                    <strong>{e.title}</strong>
                    <span className="muted">
                      {e.location || "Local a definir"}
                    </span>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
                <div className="place-footer">
                  <CategoryChip name={e.category} />
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      Abrir no mapa
                      <ArrowUpRight size={14} />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Nenhum lugar salvo ainda."
          description="Os lugares dos seus programas aparecem aqui."
        />
      )}
    </>
  );
}
