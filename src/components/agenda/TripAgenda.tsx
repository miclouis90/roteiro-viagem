import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import type { Trip } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { usePersonalEvents } from "../../hooks/usePersonalEvents";
import { demoMode } from "../../lib/firebase";
import { unifiedAgenda, type AgendaFilter } from "../../utils/unifiedAgenda";
import type { PersonalEvent } from "../../utils/personalEvents";
import { formatDate } from "../../utils/dates";
import { TripCard } from "../TripCard";
import { PersonalEventCard } from "../personal/PersonalEventCard";
import { PersonalEventDialog } from "../personal/PersonalEventDialog";
import { PeriodCalendar } from "./PeriodCalendar";
import type { AgendaMonthChange } from "../../utils/agenda";
import "./agenda.css";

type Props = {
  trips: readonly Trip[]; month: string; selectedDate: string;
  onMonthChange: (month: AgendaMonthChange) => void; onSelect: (date: string) => void;
  selectedEventId: string; onOpenEvent: (id: string, ownerId: string) => void; onCloseEvent: (ownerId: string) => void;
  filter?: AgendaFilter; query?: string; tripsLoading?: boolean; tripsError?: string;
};
export function TripAgenda(props: Props) {
  const { user, admin, loading } = useAuth();
  const ownerId = loading ? "" : user?.uid || (demoMode && admin ? "demo-personal-user" : "");
  return <AgendaCollection key={ownerId || "visitor"} {...props} ownerId={ownerId} authLoading={loading} />;
}
function AgendaCollection({ trips, month, selectedDate, selectedEventId, onOpenEvent, onCloseEvent, onMonthChange, onSelect, filter = "all", query = "", tripsLoading = false, tripsError = "", ownerId, authLoading }: Props & { ownerId: string; authLoading: boolean }) {
  const personal = usePersonalEvents(ownerId);
  const navigate = useNavigate();
  const data = useMemo(() => unifiedAgenda(trips, personal.events, query, filter), [trips, personal.events, query, filter]);
  const selectedTrips = data.trips.filter(trip => trip.startDate <= selectedDate && trip.endDate >= selectedDate);
  const selectedEvents = data.eventsByDay.get(selectedDate) || [];
  const selectedEvent = personal.events.find(event => event.id === selectedEventId);
  const openEvent = (id: string) => onOpenEvent(id, ownerId);
  const count = [selectedTrips.length ? `${selectedTrips.length} ${selectedTrips.length === 1 ? "viagem" : "viagens"}` : "", selectedEvents.length ? `${selectedEvents.length} ${selectedEvents.length === 1 ? "evento" : "eventos"}` : ""].filter(Boolean).join(" · ") || "0 registros";
  return <>
    {filter !== "events" && (tripsLoading ? <p className="agenda-source-note" role="status">Carregando viagens…</p> : tripsError && <p className="error" role="alert">{tripsError}</p>)}
    {filter !== "trips" && (authLoading || personal.loading ? <p className="agenda-source-note" role="status">Carregando eventos pessoais…</p> : personal.error ? <p className="error" role="alert">{personal.error}</p> : !ownerId && <p className="agenda-source-note">Entre na sua conta para incluir seus eventos pessoais na Agenda.</p>)}
    <div className="trip-agenda">
      <PeriodCalendar periods={data.periods} points={data.points} month={month} selectedDate={selectedDate} onMonthChange={onMonthChange} onSelect={onSelect} onOpen={period => navigate(`/viagem/${encodeURIComponent(period.id)}`)} onOpenPoint={point => openEvent(point.id)} labels={{ singular: "viagem", plural: "viagens", legend: "Faixas: viagens · Pontos: eventos" }} />
      <section className="trip-agenda-day" aria-labelledby="agenda-day-title">
        <header><p className="agenda-day-eyebrow">Seu dia</p><h2 id="agenda-day-title">{formatDate(selectedDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2><p role="status">{count}</p></header>
        {selectedTrips.length || selectedEvents.length ? <AgendaDayList key={`${selectedDate}:${filter}:${query}`} trips={selectedTrips} events={selectedEvents} onEvent={openEvent} /> : <div className="agenda-empty"><CalendarDays size={24} aria-hidden="true" /><h3>{filter === "events" ? "Nenhum evento nesta data." : filter === "trips" || !ownerId ? "Nenhuma viagem nesta data." : "Nenhuma viagem ou evento nesta data."}</h3><p>Selecione outro dia ou navegue pelos meses. A busca e o filtro de tipo também se aplicam à Agenda.</p></div>}
      </section>
    </div>
    {selectedEventId && !personal.loading && !selectedEvent && <p className="field-help" role="status">Evento não disponível para esta conta.</p>}
    {selectedEvent && <PersonalEventDialog key={`${ownerId}:${selectedEvent.id}`} event={selectedEvent} ownerId={ownerId} onClose={() => onCloseEvent(ownerId)} />}
  </>;
}
function AgendaDayList({ trips, events, onEvent }: { trips: Trip[]; events: PersonalEvent[]; onEvent: (id: string) => void }) {
  const [limit, setLimit] = useState(20);
  const records = [...trips.map(trip => ({ kind: "trip" as const, trip })), ...events.map(event => ({ kind: "event" as const, event }))];
  return <><div className="home-trip-list agenda-day-list">{records.slice(0, limit).map(record => record.kind === "trip" ? <TripCard key={`trip:${record.trip.id}`} trip={record.trip} compact /> : <PersonalEventCard key={`event:${record.event.id}`} event={record.event} onOpen={() => onEvent(record.event.id)} />)}</div>{limit < records.length && <button type="button" className="ghost agenda-day-more" onClick={() => setLimit(value => value + 20)}>Mostrar mais registros ({records.length - limit})</button>}</>;
}
