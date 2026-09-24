import type { Trip, TripEvent } from "../../types";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Wallet,
  Sparkles,
} from "lucide-react";
import { tripOverview } from "../../utils/overview";
import { spendingLabel } from "../../utils/spending";
import { nextStep } from "../../utils/nextStep";
import { formatDate } from "../../utils/dates";
import { collectPlaces } from "../../utils/places";
import { SectionHeader } from "../ui/Primitives";
export function TripOverview({
  trip,
  events,
  now,
  admin,
  onDay,
  onSelect,
}: {
  trip: Trip;
  events: TripEvent[];
  now: Date;
  admin: boolean;
  onDay: (date: string) => void;
  onSelect: (event: TripEvent) => void;
}) {
  const view = tripOverview(trip, events, now);
  const next = nextStep(trip, events, now, admin);
  return (
    <div className="overview overview-simple">
      <section className="next-step">
        <div className="next-step-heading">
          <span className="eyebrow">Próximo passo</span>
          <span className="next-step-icon">
            <Sparkles size={20} aria-hidden="true" />
          </span>
        </div>
        <h2>{next.title}</h2>
        <p className="muted">{next.description}</p>
        <button
          className="next-step-cta"
          onClick={() =>
            next.event ? onSelect(next.event) : onDay(next.date!)
          }
        >
          {next.action}
          <ArrowRight size={16} />
        </button>
      </section>

      <section className="overview-days">
        <SectionHeader
          title="Roteiro em um olhar"
          description="Toque em um dia para explorar."
        />
        <div
          className={`day-glance ${view.days.length === 5 ? "five-days" : ""}`}
          aria-label="Roteiro por dia"
        >
          {view.days.map(({ date, count, tones }) => (
            <button
              key={date}
              className={`glance-day ${date === view.today ? "is-today" : ""}`}
              onClick={() => onDay(date)}
            >
              <small>
                {formatDate(date, { weekday: "short" }).replace(".", "")}
              </small>
              <strong>{formatDate(date, { day: "numeric" })}</strong>
              <small>
                {formatDate(date, { month: "short" }).replace(".", "")}
              </small>
              <span>
                {count
                  ? `${count} programa${count === 1 ? "" : "s"}`
                  : "Dia livre"}
              </span>
              <span className="day-tones" aria-hidden="true">
                {tones.map((tone) => (
                  <i key={tone} className={`tone-${tone}`} />
                ))}
              </span>
              {date === view.today && <em>Hoje</em>}
            </button>
          ))}
        </div>
      </section>
      <section className="trip-brief">
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
        {(trip.description || trip.notes) && (
          <details className="expandable">
            <summary>Sobre a viagem</summary>
            {trip.description && <p>{trip.description}</p>}
            {trip.notes && <p>{trip.notes}</p>}
          </details>
        )}
      </section>
    </div>
  );
}
