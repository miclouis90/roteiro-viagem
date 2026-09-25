import { useState } from "react";

import { CalendarDays, List, ChevronDown, Download } from "lucide-react";
import { Modal } from "../Modal";
import { useToast } from "../../hooks/useToast";
import type { Trip, TripEvent } from "../../types";
import { datesBetween, dateKey, formatDate } from "../../utils/dates";
import { spendingLabel } from "../../utils/spending";
import { filterEvents } from "../../utils/filters";
import { EventCard } from "../Events";
import { DayPicker } from "./DayPicker";
import { EventFilters, emptyFilters } from "./EventFilters";
import { EmptyState } from "../ui/Primitives";
import { Places } from "./Places";
import { TripCalendar } from "../TripCalendar";
import { exportTrip, type ExportFormat } from "../../services/exportTrip";
export function Programs({
  trip,
  events,
  tab,
  admin,
  selectedDate,
  onDayChange,
  initialPriority,
  onSelect,
}: {
  trip: Trip;
  events: TripEvent[];
  tab: "roteiro" | "lugares";
  admin: boolean;
  selectedDate: string;
  onDayChange: (date: string) => void;
  initialPriority: string;

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
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState("");
  const toast = useToast();
  async function chooseExport(format: ExportFormat) {
    if (exportBusy) return;
    setExportBusy(true);
    setExportError("");
    try {
      await exportTrip(trip, events, format);
      setExportOpen(false);
      toast("Arquivo preparado.");
    } catch {
      setExportError("Não foi possível exportar o roteiro.");
    } finally {
      setExportBusy(false);
    }
  }
  const filtered = filterEvents(events, filters);
  const list = filtered.filter((e) => e.date === day);
  const extra = filtered.filter((e) => !days.includes(e.date));
  const hasFilters = Object.values(filters).some(Boolean);
  return (
    <section className={`programs ${tab === "roteiro" ? "itinerary-programs" : ""}`}>
      {tab === "roteiro" && (
        <details className="context-menu itinerary-display">
          <summary aria-label="Formato e opções do roteiro">
            {view === "agenda" ? "Agenda" : "Calendário"}
            <ChevronDown size={14} />
          </summary>
          <div
            className="menu-popover"
            onClick={(e) => {
              const menu = e.currentTarget.closest("details");
              if (menu) menu.open = false;
            }}
          >
            <button
              aria-pressed={view === "agenda"}
              onClick={() => {
                setView("agenda");
                setFilters((current) => ({ ...current, date: "" }));
              }}
            >
              <List size={18} />
              Agenda
            </button>
            <button
              aria-pressed={view === "calendar"}
              onClick={() => setView("calendar")}
            >
              <CalendarDays size={18} />
              Calendário
            </button>
            <button onClick={() => setExportOpen(true)}>
              <Download size={18} />
              Exportar roteiro
            </button>
          </div>
        </details>
      )}
      {exportOpen && (
        <Modal title="Exportar roteiro" onClose={() => setExportOpen(false)} busy={exportBusy}>
          <p className="muted" role="status">{exportBusy ? "Preparando arquivo..." : "Escolha o formato para baixar o roteiro completo."}</p>
          {exportError && <p className="error" role="alert">{exportError}</p>}
          <div className="quick-actions">
            {(["PDF", "Excel", "CSV"] as const).map((format) => (
              <button key={format} className="secondary" disabled={exportBusy} onClick={() => chooseExport(format)}>
                {format}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {tab === "roteiro" && view === "agenda" && (
        <div className="sticky-days">
          <DayPicker
            days={days}
            selected={day}
            onChange={onDayChange}
            events={events}
          />
        </div>
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
            ></EmptyState>
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
    </section>
  );
}
