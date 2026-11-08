import { useEffect, useState } from "react";
import { Plus, Search, CalendarDays, Ticket } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { demoMode } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { watchTrips } from "../services/repository";
import { LoadingState } from "../components/ui/LoadingState";
import { HomeCalendar } from "../components/HomeCalendar";
import { Modal } from "../components/Modal";
import { dateKey, formatDate } from "../utils/dates";
import { dateInAgendaMonth, isAgendaDate, isAgendaMonth, type AgendaMonthChange } from "../utils/agenda";
import { useMergedSearchParams } from "../hooks/useMergedSearchParams";
import { TripAgenda } from "../components/agenda/TripAgenda";
import { TripCard } from "../components/TripCard";
import { DestinationArtwork } from "../components/TripArtwork";
import { EmptyState } from "../components/ui/Primitives";
import type { Trip, TripStatus } from "../types";
import { filterHomeTrips } from "../utils/filterHomeTrips";
import { TripHistory } from "../components/TripHistory";
import { agendaFilter } from "../utils/unifiedAgenda";
export function Home({ onCreate }: { onCreate: () => void }) {
  const { admin, user, loading: authLoading } = useAuth();
  const [tripRows, setTrips] = useState<Trip[]>([]);
  const [tripScope, setTripScope] = useState("");
  const scope = `${user?.uid || ""}:${admin}`;
  const trips = tripScope === scope ? tripRows : [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    setTrips([]);
    let active = true;
    const stop = watchTrips(
      admin,
      (t) => {
        if (!active) return;
        setTripScope(scope);
        setTrips(t);
        setLoading(false);
        setError("");
      },
      () => {
        if (!active) return;
        setError(
          "Não foi possível carregar as viagens. Verifique sua conexão.",
        );
        setLoading(false);
      },
      user?.uid,
    );
    return () => { active = false; stop(); };
  }, [admin, authLoading, user?.uid, scope]);
  const [selectedDate, setSelectedDate] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const firstName = user?.displayName?.trim().split(/\s+/)[0];
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TripStatus | "">("");
  const { upcoming, others } = filterHomeTrips(trips, query, status, undefined, selectedDate);
  const { params, update: setParams, current: currentParams } = useMergedSearchParams();
  const location = useLocation(), navigate = useNavigate();
  const view = params.get("view") === "agenda" ? "agenda" : "trips";
  const today = dateKey();
  const rawDay = params.get("agendaDay") || "";
  const rawMonth = params.get("agendaMonth") || "";
  const agendaMonth = isAgendaMonth(rawMonth) ? rawMonth : (isAgendaDate(rawDay) ? rawDay : today).slice(0, 7);
  const agendaDay = dateInAgendaMonth(agendaMonth, isAgendaDate(rawDay) ? rawDay : today);
  const agendaType = agendaFilter(params.get("agendaType"));
  const agendaQuery = params.get("agendaQuery") || "";
  function changeAgendaFilter(key: "agendaType" | "agendaQuery", value: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (value && !(key === "agendaType" && value === "all")) next.set(key, value); else next.delete(key);
      next.delete("agendaEvent");
      return next;
    }, { replace: true });
  }
  function changeView(nextView: "trips" | "agenda") {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (nextView === "agenda") {
        next.set("view", "agenda"); next.set("agendaMonth", agendaMonth); next.set("agendaDay", agendaDay);
      } else { next.delete("view"); next.delete("agendaEvent"); }
      return next;
    }, { replace: true });
  }
  function selectAgendaDay(day: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      next.set("view", "agenda"); next.set("agendaMonth", day.slice(0, 7)); next.set("agendaDay", day);
      next.delete("agendaEvent");
      return next;
    }, { replace: true });
  }
  function changeAgendaMonth(change: AgendaMonthChange) {
    setParams(next => {
      const raw = next.get("agendaMonth") || "";
      const previousMonth = isAgendaMonth(raw) ? raw : agendaMonth;
      const month = typeof change === "function" ? change(previousMonth) : change;
      if (!isAgendaMonth(month)) return next;
      const previousDay = next.get("agendaDay") || "";
      next.set("view", "agenda"); next.set("agendaMonth", month);
      next.set("agendaDay", dateInAgendaMonth(month, isAgendaDate(previousDay) ? previousDay : agendaDay));
      next.delete("agendaEvent"); return next;
    }, { replace: true });
  }
  function openAgendaEvent(id: string, ownerId: string) {
    const previous = currentParams(); previous.delete("agendaEvent");
    const base = location.pathname + (previous.size ? `?${previous}` : "");
    setParams(next => { next.set("agendaEvent", id); return next; }, { state: { agendaBase: base, agendaOwner: ownerId } });
  }
  function closeAgendaEvent(ownerId: string) {
    const next = currentParams(); next.delete("agendaEvent");
    const base = location.pathname + (next.size ? `?${next}` : "");
    const state = location.state as { agendaBase?: string; agendaOwner?: string } | null;
    if (state?.agendaBase === base && state.agendaOwner === ownerId) navigate(-1);
    else setParams(() => next, { replace: true });
  }
  return (
    <main className="home">
      <section className="home-intro">
        <div className="home-intro-art" aria-hidden="true"><DestinationArtwork seed="rumo-home-landscape" /></div>
        <p className="home-greeting">{firstName ? `Oi, ${firstName}` : "Oi"} 👋</p>
        <h1>Para onde vamos <span>agora?</span></h1>
        <p className="home-intro-note">Novos lugares, boas histórias, sempre à frente.</p>
      </section>
      <div className="home-views-row"><div className="home-view-switch" role="tablist" aria-label="Visualização da página inicial">
        {([["trips", "Viagens"], ["agenda", "Agenda"]] as const).map(([id, label]) => <button type="button" key={id} id={`home-view-${id}`} role="tab" aria-selected={view === id} aria-controls={`home-panel-${id}`} tabIndex={view === id ? 0 : -1} onClick={() => changeView(id)} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? "trips" : event.key === "End" ? "agenda" : view === "trips" ? "agenda" : "trips";
          changeView(next); document.getElementById(`home-view-${next}`)?.focus();
        }}>{label}</button>)}
      </div>{(user || (demoMode && admin)) && <Link className="home-personal-link" to="/eventos"><Ticket size={16} aria-hidden="true" />Meus eventos</Link>}</div>
      <div className="home-search-row"><label className="search home-search"><Search size={21} aria-hidden="true" /><input type="search" aria-label={view === "trips" ? "Buscar viagem" : "Buscar na agenda"} placeholder={view === "trips" ? "Buscar por nome ou destino" : "Buscar viagens, eventos ou locais"} value={view === "trips" ? query : agendaQuery} onChange={e => view === "trips" ? setQuery(e.target.value) : changeAgendaFilter("agendaQuery", e.target.value)} /></label>{view === "trips" && <button className="home-calendar-button" aria-label="Abrir calendário de viagens" aria-haspopup="dialog" onClick={() => setCalendarOpen(true)}><CalendarDays size={21} aria-hidden="true" /></button>}</div>
      {view === "trips" && selectedDate && <button className="home-date-chip" aria-label="Limpar filtro de data" onClick={() => setSelectedDate("")}>{formatDate(selectedDate, {day:"numeric",month:"short",year:"numeric"})}<span aria-hidden="true">×</span></button>}
      {view === "trips" ? <div className="chip-scroll home-status" aria-label="Status das viagens">{([["", "Todas"], ["planejamento", "Planejando"], ["confirmada", "Confirmadas"], ["concluída", "Concluídas"]] as const).map(([id,label]) => <button key={id} className={`filter-chip ${status === id ? "active" : ""}`} aria-pressed={status === id} onClick={() => setStatus(id)}>{label}</button>)}</div> : <div className="chip-scroll home-status agenda-type-filter" role="group" aria-label="Tipo de registro na agenda">{([["all", "Tudo"], ["trips", "Viagens"], ["events", "Eventos"]] as const).map(([id, label]) => <button type="button" key={id} className={`filter-chip ${agendaType === id ? "active" : ""}`} aria-pressed={agendaType === id} onClick={() => changeAgendaFilter("agendaType", id)}>{label}</button>)}</div>}
      <div role="tabpanel" id={`home-panel-${view}`} aria-labelledby={`home-view-${view}`}>
      {view === "agenda" ? (
        <TripAgenda trips={trips} tripsLoading={loading} tripsError={error} filter={agendaType} query={agendaQuery} month={agendaMonth} selectedDate={agendaDay} selectedEventId={params.get("agendaEvent") || ""} onSelect={selectAgendaDay} onMonthChange={changeAgendaMonth} onOpenEvent={openAgendaEvent} onCloseEvent={closeAgendaEvent} />
      ) : loading ? (
        <LoadingState label="Preparando suas viagens…" />
      ) : error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : trips.length === 0 ? (
        <EmptyState
          title="Sua próxima história começa aqui."
          description={
            admin
              ? "Escolha um destino. O resto a gente organiza pelo caminho."
              : "Nenhuma viagem pública por enquanto."
          }
        >
          {admin && (
            <button className="primary" onClick={onCreate}>
              <Plus size={18} />
              Criar viagem
            </button>
          )}
        </EmptyState>
      ) : (
        <>
          {upcoming.length > 0 && <section className="home-section home-upcoming"><h2>{upcoming.length === 1 ? "Próxima viagem" : "Próximas viagens"}</h2><div className="home-carousel" tabIndex={0} aria-label="Próximas viagens">{upcoming.map(t => <TripCard key={t.id} trip={t} />)}</div></section>}
          {others.length > 0 && <TripHistory trips={others} filterKey={`${query}:${status}:${selectedDate}`} />}
          {!upcoming.length && !others.length && <EmptyState title={selectedDate ? "Nenhuma viagem nesta data." : "Nenhuma viagem encontrada."} description="Tente outro nome, destino ou status.">{selectedDate && <button className="secondary" onClick={() => setSelectedDate("")}>Limpar data</button>}</EmptyState>}
        </>
      )}
      </div>
      {calendarOpen && <Modal title="Calendário de viagens" onClose={() => setCalendarOpen(false)}>
        <HomeCalendar trips={trips} selected={selectedDate} onSelect={day => { setSelectedDate(day); setCalendarOpen(false); }} onClear={() => setSelectedDate("")} />
      </Modal>}
    </main>
  );
}
