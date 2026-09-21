import { useState } from "react";
import { CalendarDays, List, Plus } from "lucide-react";
import type { Trip, TripEvent } from "../../types";
import { datesBetween, dateKey, formatDate } from "../../utils/dates";
import { cost, money } from "../../utils/money";
import { filterEvents } from "../../utils/filters";
import { EventCard } from "../Events";
import { DayPicker } from "./DayPicker";
import { EventFilters, emptyFilters } from "./EventFilters";
import { EmptyState, type TripTab } from "../ui/Primitives";
import { Places } from "./Places";
import { TripCalendar } from "../TripCalendar";
export function Programs({
  trip,
  events,
  tab,
  admin,
  userName,
  onAdd,
  onSelect,
}: {
  trip: Trip;
  events: TripEvent[];
  tab: Exclude<TripTab, "resumo">;
  admin: boolean;
  userName?: string;
  onAdd: (date: string) => void;
  onSelect: (event: TripEvent) => void;
}) {
  const days = datesBetween(trip.startDate, trip.endDate);
  const today = dateKey();
  const [selected, setSelected] = useState(
    days.includes(today) ? today : trip.startDate,
  );
  const day = days.includes(selected) ? selected : trip.startDate;
  const [filters, setFilters] = useState({ ...emptyFilters });
  const [view, setView] = useState("agenda");
  const selectedDay = tab === "hoje" ? today : day;
  const filtered = filterEvents(events, filters);
  const list = filtered.filter((e) => e.date === selectedDay);
  const extra = filtered.filter((e) => !days.includes(e.date));
  const outside = tab === "hoje" && !days.includes(today);
  const hasFilters = Object.values(filters).some(Boolean);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return (
    <section className="programs">
      <div className="section-heading">
        <div>
          {tab === "hoje" && (
            <p className="eyebrow">
              {greeting}
              {userName ? `, ${userName}` : ""}
            </p>
          )}
          <h2>
            {tab === "hoje"
              ? `Hoje em ${trip.destinationCity}`
              : tab === "lugares"
                ? "Lugares para descobrir"
                : "Seu roteiro"}
          </h2>
          <p className="muted">
            {tab === "hoje"
              ? formatDate(today, { day: "numeric", month: "long" })
              : tab === "lugares"
                ? "Bons lugares para guardar por perto."
                : "Um dia de cada vez. Do seu jeito."}
          </p>
        </div>
        {tab === "roteiro" && (
          <div className="view-toggle">
            <button
              aria-label="Agenda"
              aria-pressed={view === "agenda"}
              className={view === "agenda" ? "active" : ""}
              onClick={() => {
                setView("agenda");
                setFilters((current) => ({ ...current, date: "" }));
              }}
            >
              <List size={18} />
            </button>
            <button
              aria-label="Calendário"
              aria-pressed={view === "calendar"}
              className={view === "calendar" ? "active" : ""}
              onClick={() => setView("calendar")}
            >
              <CalendarDays size={18} />
            </button>
          </div>
        )}
      </div>
      {tab === "roteiro" && view === "agenda" && (
        <DayPicker days={days} selected={day} onChange={setSelected} />
      )}
      {(tab !== "hoje" || events.some((e) => e.date === today)) && (
        <EventFilters
          value={filters}
          onChange={setFilters}
          days={days}
          showDate={tab === "lugares" || view === "calendar"}
        />
      )}
      {tab === "lugares" ? (
        <Places trip={trip} events={filtered} onSelect={onSelect} />
      ) : tab === "roteiro" && view === "calendar" ? (
        <TripCalendar
          trip={trip}
          days={days}
          filtered={filtered}
          setDetails={onSelect}
        />
      ) : (
        <>
          {(tab !== "hoje" || list.length > 0) && (
            <div className="timeline-heading">
              <h3>{formatDate(selectedDay, { weekday: "long" })}</h3>
              <span>
                {list.length} {list.length === 1 ? "programa" : "programas"}
                {list.length > 0 &&
                  ` · ${money(
                    list.reduce((s, e) => s + cost(e), 0),
                    trip.currency,
                  )}`}
              </span>
            </div>
          )}
          {list.length ? (
            <div className="timeline">
              {list.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  currency={trip.currency}
                  onClick={() => onSelect(e)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                hasFilters
                  ? "Nenhum programa encontrado."
                  : tab === "hoje"
                    ? "Nada marcado para hoje."
                    : events.length === 0
                      ? "Seu roteiro começa aqui."
                      : "Esse dia está em aberto."
              }
              description={
                hasFilters
                  ? "Experimente mudar os filtros."
                  : outside
                    ? "Hoje está fora do período da viagem. Seu próximo roteiro está logo ali."
                    : admin
                      ? "Adicione cafés, restaurantes, passeios e tudo que você não quer esquecer."
                      : "Volte em breve para descobrir os próximos programas."
              }
            >
              {admin && !outside && !hasFilters && (
                <button
                  className="secondary"
                  onClick={() => onAdd(selectedDay)}
                >
                  <Plus size={17} />
                  {events.length === 0
                    ? "Adicionar primeiro programa"
                    : "Adicionar programa"}
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
          {extra.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              currency={trip.currency}
              onClick={() => onSelect(e)}
            />
          ))}
        </details>
      )}
      {admin && (
        <button
          className="fab"
          aria-label="Adicionar programa"
          onClick={() =>
            onAdd(
              outside
                ? trip.startDate
                : tab === "lugares"
                  ? trip.startDate
                  : selectedDay,
            )
          }
        >
          <Plus size={22} />
          <span>Programa</span>
        </button>
      )}
    </section>
  );
}
