import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, LockKeyhole, Ticket } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { usePersonalEvents } from "../hooks/usePersonalEvents";
import { demoMode } from "../lib/firebase";
import { PersonalEventCard } from "../components/personal/PersonalEventCard";
import { PersonalEventDialog } from "../components/personal/PersonalEventDialog";
import { LoadingState } from "../components/ui/LoadingState";
import type { PersonalEvent } from "../utils/personalEvents";
import "../components/personal/personal-events.css";

export function PersonalEvents() {
  const { user, admin, loading } = useAuth();
  const ownerId = user?.uid || (demoMode && admin ? "demo-personal-user" : "");
  return <main className="personal-events-page">
    <Link className="personal-events-back" to="/"><ChevronLeft size={18} aria-hidden="true" />Viagens</Link>
    <header className="personal-events-heading"><h1>Meus eventos</h1><p><LockKeyhole size={14} aria-hidden="true" />Experiências pessoais, só para você.</p></header>
    {loading ? <LoadingState label="Preparando seus eventos…" /> : ownerId ? <PersonalEventCollection key={ownerId} ownerId={ownerId} /> : <p className="personal-events-empty">Entre na sua conta para cadastrar e acessar seus eventos pessoais.</p>}
  </main>;
}

function PersonalEventCollection({ ownerId }: { ownerId: string }) {
  const { events, loading, error } = usePersonalEvents(ownerId);
  const [params, setParams] = useSearchParams();
  const selected = events.find(event => event.id === params.get("event"));
  const close = () => { const next = new URLSearchParams(params); next.delete("event"); setParams(next, { replace: true }); };
  function open(event: PersonalEvent) { setParams({ event: event.id }, { replace: true }); }
  if (loading) return <LoadingState label="Carregando eventos…" />;
  if (error) return <p className="error" role="alert">{error}</p>;
  return <>
    {!events.length ? <div className="personal-events-empty"><Ticket size={28} aria-hidden="true" /><h2>Sua próxima experiência começa aqui.</h2><p>Use + Novo → Evento para registrar seus planos.</p></div> : <div className="personal-events-list">{events.map(event => <PersonalEventCard key={event.id} event={event} onOpen={() => open(event)} />)}</div>}
    {params.get("event") && !selected && <p className="field-help" role="status">Evento não disponível para esta conta.</p>}
    {selected && <PersonalEventDialog key={selected.id} ownerId={ownerId} event={selected} onClose={close} />}
  </>;
}
