import { useState } from "react";
import { CalendarDays, List, Plus } from "lucide-react";
import type { Trip, TripEvent } from "../../types";
import { datesBetween, dateKey, formatDate } from "../../utils/dates";
import { spendingLabel } from "../../utils/spending";
import { filterEvents } from "../../utils/filters";
import { EventCard } from "../Events";
import { DayPicker } from "./DayPicker";
import { EventFilters, emptyFilters } from "./EventFilters";
import { EmptyState, SectionHeader, IconButton } from "../ui/Primitives";
import { Places } from "./Places";
import { TripCalendar } from "../TripCalendar";
export function Programs({
  trip,
  events,
  tab,
  admin,
  selectedDate,
  onDayChange,
  initialPriority,
  onAdd,
  onSelect,
}: {
  trip: Trip;
  events: TripEvent[];
  tab: "roteiro" | "lugares";
  admin: boolean;
  selectedDate: string;
  onDayChange: (date: string) => void;
  initialPriority: string;
  onAdd: (date: string) => void;
  onSelect: (event: TripEvent) => void;
}) {
  const days = datesBetween(trip.startDate, trip.endDate);
  const today = dateKey();
  const day = days.includes(selectedDate)
    ? selectedDate
    : days.includes(today)
      ? today
      : trip.startDate;
  const [filters, setFilters] = useState({
    ...emptyFilters,
    priority: initialPriority,
  });
  const [view, setView] = useState("agenda");
  const filtered = filterEvents(events, filters);
  const list = filtered.filter((e) => e.date === day);
  const extra = filtered.filter((e) => !days.includes(e.date));
  const hasFilters = Object.values(filters).some(Boolean);
  return (
    <section className="programs">
      <SectionHeader
        title={tab === "lugares" ? "Lugares para descobrir" : "Seu roteiro"}
        description={
          tab === "lugares"
            ? "Bons lugares para guardar por perto."
            : "Um dia de cada vez. Do seu jeito."
        }
        action={
          tab === "roteiro" && (
            <div className="view-toggle">
              <IconButton
                label="Agenda"
                aria-pressed={view === "agenda"}
                className={view === "agenda" ? "active" : ""}
                onClick={() => {
                  setView("agenda");
                  setFilters((current) => ({ ...current, date: "" }));
                }}
              >
                <List size={18} />
              </IconButton>
              <IconButton
                label="Calendário"
                aria-pressed={view === "calendar"}
                className={view === "calendar" ? "active" : ""}
                onClick={() => setView("calendar")}
              >
                <CalendarDays size={18} />
              </IconButton>
            </div>
          )
        }
      />
      {tab === "roteiro" && view === "agenda" && (
        <DayPicker
          days={days}
          selected={day}
          onChange={onDayChange}
          events={events}
        />
      )}
      <EventFilters
        value={filters}
        onChange={setFilters}
        days={days}
        showDate={tab === "lugares" || view === "calendar"}
      />
      {tab === "lugares" ? (
        <Places trip={trip} events={filtered} onSelect={onSelect} />
      ) : view === "calendar" ? (
        <TripCalendar
          trip={trip}
          days={days}
          filtered={filtered}
          setDetails={onSelect}
        />
      ) : (
        <>
          <div className="timeline-heading">
            <h3>{formatDate(day, { weekday: "long" })}</h3>
            <span>
              {list.length} {list.length === 1 ? "programa" : "programas"}
              {list.length > 0 && ` · ${spendingLabel(list, trip.currency)}`}
            </span>
          </div>
          {list.length ? (
            <div className="timeline">
              {list.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  currency={trip.currency}
                  onClick={() => onSelect(event)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                hasFilters
                  ? "Nenhum programa encontrado."
                  : events.length
                    ? "Esse dia está em aberto."
                    : "Seu roteiro começa aqui."
              }
              description={
                hasFilters
                  ? "Experimente mudar os filtros."
                  : admin
                    ? "Adicione cafés, restaurantes, passeios e tudo que você não quer esquecer."
                    : "Um dia livre para descobrir a cidade no seu ritmo."
              }
            >
              {admin && !hasFilters && (
                <button className="secondary" onClick={() => onAdd(day)}>
                  <Plus size={17} />
                  {events.length
                    ? "Adicionar programa"
                    : "Adicionar primeiro programa"}
                </button>
              )}
            </EmptyState>
          )}
        </>
      )}
      {extra.length > 0 && tab === "roteiro" && (
        <details className="expandable outside-events">
          <summary>
            {extra.length} programa(s) fora do período da viagem
          </summary>
          <p className="muted">Confira as datas destes programas.</p>
          {extra.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              currency={trip.currency}
              onClick={() => onSelect(event)}
            />
          ))}
        </details>
      )}
      {admin && (
        <button
          className="fab"
          aria-label="Adicionar programa"
          onClick={() => onAdd(tab === "lugares" ? trip.startDate : day)}
        >
          <Plus size={22} />
          <span>Programa</span>
        </button>
      )}
    </section>
  );
}
