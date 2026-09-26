import { useEffect, useState } from "react";
import { Plus, Search, CalendarDays } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { watchTrips } from "../services/repository";
import { LoadingState } from "../components/ui/LoadingState";
import { HomeCalendar } from "../components/HomeCalendar";
import { Modal } from "../components/Modal";
import { formatDate } from "../utils/dates";
import { TripCard } from "../components/TripCard";
import { EmptyState, TripNavigation } from "../components/ui/Primitives";
import type { Trip, TripStatus } from "../types";
import { filterHomeTrips } from "../utils/filterHomeTrips";
import { useLocation, useNavigate } from "react-router-dom";
export function Home({ onCreate }: { onCreate: () => void }) {
  const { admin, user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    setTrips([]);
    return watchTrips(
      admin,
      (t) => {
        setTrips(t);
        setLoading(false);
        setError("");
      },
      () => {
        setError(
          "Não foi possível carregar as viagens. Verifique sua conexão.",
        );
        setLoading(false);
      },
      user?.uid,
    );
  }, [admin, authLoading, user?.uid]);
  const [selectedDate, setSelectedDate] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const firstName = user?.displayName?.trim().split(/\s+/)[0];
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TripStatus | "">("");
  const { upcoming, others } = filterHomeTrips(trips, query, status, undefined, selectedDate);
  const location = useLocation();
  const navigate = useNavigate();
  const returnPath = typeof location.state?.returnTripPath === "string" && trips.some(t => `/viagem/${t.id}` === location.state.returnTripPath) ? location.state.returnTripPath : undefined;
  return (
    <main className="home">
      <section className="home-intro"><h1>{firstName ? `Oi, ${firstName}` : "Oi"} 👋</h1><p>Para onde vamos agora?</p></section>
      <div className="home-search-row"><label className="search home-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="Buscar viagem" placeholder="Buscar viagem" value={query} onChange={e => setQuery(e.target.value)} /></label><button className="home-calendar-button" aria-label="Abrir calendário de viagens" aria-haspopup="dialog" onClick={() => setCalendarOpen(true)}><CalendarDays size={20} aria-hidden="true" /></button></div>
      {selectedDate && <button className="home-date-chip" aria-label="Limpar filtro de data" onClick={() => setSelectedDate("")}>{formatDate(selectedDate, {day:"numeric",month:"short",year:"numeric"})}<span aria-hidden="true">×</span></button>}
      <div className="chip-scroll home-status" aria-label="Status das viagens">{([["", "Todas"], ["planejamento", "Planejando"], ["confirmada", "Confirmadas"], ["concluída", "Concluídas"]] as const).map(([id,label]) => <button key={id} className={`filter-chip ${status === id ? "active" : ""}`} aria-pressed={status === id} onClick={() => setStatus(id)}>{label}</button>)}</div>      {loading ? (
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
          {upcoming.length > 0 && <section className="home-section"><h2>Próximas viagens</h2><div className="home-carousel" tabIndex={0} aria-label="Próximas viagens">{upcoming.map(t => <TripCard key={t.id} trip={t} />)}</div></section>}
          {others.length > 0 && <section className="home-section"><h2>Outras viagens</h2><div className="home-trip-list">{others.map(t => <TripCard key={t.id} trip={t} compact />)}</div></section>}
          {!upcoming.length && !others.length && <EmptyState title={selectedDate ? "Nenhuma viagem nesta data." : "Nenhuma viagem encontrada."} description="Tente outro nome, destino ou status.">{selectedDate && <button className="secondary" onClick={() => setSelectedDate("")}>Limpar data</button>}</EmptyState>}
        </>
      )}
      {calendarOpen && <Modal title="Calendário de viagens" onClose={() => setCalendarOpen(false)}>
        <HomeCalendar trips={trips} selected={selectedDate} onSelect={day => { setSelectedDate(day); setCalendarOpen(false); }} onClear={() => setSelectedDate("")} />
      </Modal>}
      <TripNavigation value="viagens" disabled={!returnPath} onChange={tab => { if (returnPath) navigate(`${returnPath}?tab=${tab}`); }} />    </main>
  );
}
