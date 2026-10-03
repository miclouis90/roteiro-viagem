import { useState } from "react";
import type { Trip, TripEvent } from "../../types";
import { ChevronRight, CalendarDays, MapPin, Wallet } from "lucide-react";
import { tripOverview } from "../../utils/overview";
import { spendingLabel } from "../../utils/spending";
import { formatDate } from "../../utils/dates";
import { collectPlaces } from "../../utils/places";
import { SectionHeader } from "../ui/Primitives";
export function TripOverview({
  trip,
  events,
  now,
  onDay,
  onAdd,
}: {
  trip: Trip;
  events: TripEvent[];
  now: Date;
  onDay: (date: string) => void;
  onSelect?: (event: TripEvent) => void;
  onAdd?: () => void;
}) {
  const view = tripOverview(trip, events, now);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const about = [trip.description, trip.notes].filter(Boolean).join("\n\n");
  const longAbout = about.length > 160;
  return (
    <div className="overview overview-simple">
      {!view.active.length && onAdd && <button className="primary overview-add" onClick={onAdd}>Adicionar programa</button>}
      <section className="overview-days">
        <SectionHeader
          title="Seus dias"
          action={<button className="overview-full-route" onClick={() => onDay(trip.startDate)}>Ver roteiro <ChevronRight size={16} aria-hidden="true" /></button>}
        />
        <div
          className={`day-glance ${view.days.length === 5 ? "five-days" : ""}`}
          aria-label="Roteiro por dia"
        >
          {view.days.map(({ date, count }, index) => (
            <button
              key={date}
              className={`glance-day day-scene-${index % 5} ${date === view.today ? "is-today" : ""}`}
              onClick={() => onDay(date)}
            >
              <span className="glance-date">
                <small>{formatDate(date, { weekday: "short" }).replace(".", "")}</small>
                <strong>{formatDate(date, { day: "numeric" })}</strong>
                <small>{formatDate(date, { month: "short" }).replace(".", "")}</small>
              </span>
              <span className="glance-description">
                <span>{count ? `${count} programa${count === 1 ? "" : "s"}` : "Dia livre"}</span>
              </span>
              {date === view.today && <em>Hoje</em>}
            </button>
          ))}
        </div>
      </section>
      <section className="trip-brief">
        {about && (
          <section className="trip-about" aria-labelledby="trip-about-title">
            <h2 id="trip-about-title">Sobre esta viagem</h2>
            <p
              id="trip-about-text"
              className={longAbout && !aboutExpanded ? "about-preview" : ""}
            >
              {about}
            </p>
            {longAbout && (
              <button
                className="ghost"
                aria-expanded={aboutExpanded}
                aria-controls="trip-about-text"
                onClick={() => setAboutExpanded(!aboutExpanded)}
              >
                {aboutExpanded ? "Ver menos" : "Ver mais"}
              </button>
            )}
          </section>
        )}
      </section>
    </div>
  );
}

export function OverviewSummary({ trip, events, now }: { trip: Trip; events: TripEvent[]; now: Date }) {
  const view = tripOverview(trip, events, now);
  return (
        <div className="trip-quick-stats" aria-label="Resumo da viagem">
          <div>
            <CalendarDays size={18} aria-hidden="true" />
            <strong>{view.active.length}</strong>
            <span>programas</span>
          </div>
          <div>
            <MapPin size={18} aria-hidden="true" />
            <strong>{collectPlaces(view.active).length}</strong>
            <span>lugares</span>
          </div>
          <div>
            <Wallet size={18} aria-hidden="true" />
            <strong className="brief-price">
              {spendingLabel(view.active, trip.currency)}
            </strong>
            <span>estimativa</span>
          </div>
        </div>
  );
}

export function OverviewArtwork({ city }: { city: string }) {
  const isBrasilia = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === "brasilia";
  return <div className={`overview-destination-art ${isBrasilia ? "destination-brasilia" : "destination-neutral"}`} aria-hidden="true" />;
}
