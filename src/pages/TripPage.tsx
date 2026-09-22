import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, Share2, LockKeyhole } from "lucide-react";
import type { Trip, TripEvent } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useTrip } from "../hooks/useTrip";
import { useToast } from "../hooks/useToast";
import { removeTrip, removeEvent, saveTrip } from "../services/repository";
import { duplicateTrip } from "../services/duplicateTrip";
import { tripInput } from "../utils/inputs";
import { datesBetween, daysBetween, formatDate } from "../utils/dates";
import { dayCountLabel, tripLabels } from "../utils/labels";
import { tripTabFromSearch } from "../utils/tripView";
import { TripOverview } from "../components/trip/TripOverview";
import { themeStyle } from "../data/themes";
import { JourneyMoment } from "../components/trip/JourneyMoment";
import {
  TripNavigation,
  EmptyState,
  type TripTab,
} from "../components/ui/Primitives";
import { TripMenu } from "../components/trip/TripMenu";
import { Programs } from "../components/trip/Programs";
import { ShareTrip } from "../components/trip/ShareTrip";
import { TripSummary } from "../components/TripSummary";
import { TripForm, EventForm } from "../components/Forms";
import { EventDetails } from "../components/Events";
import { Modal } from "../components/Modal";
export function TripPage() {
  const { id = "" } = useParams();
  const { admin, loading } = useAuth();
  const data = useTrip(id, admin, loading);
  if (data.loading)
    return (
      <main className="loading-state" role="status">
        Preparando o roteiro…
      </main>
    );
  if (data.error || !data.trip || (!data.trip.isPublic && !admin))
    return (
      <main>
        <EmptyState
          title="Roteiro indisponível"
          description={
            data.error ||
            "Entre com uma conta administrativa para abrir esta viagem privada."
          }
        >
          <Link className="secondary" to="/">
            Voltar às viagens
          </Link>
        </EmptyState>
      </main>
    );
  return <TripWorkspace key={id} trip={data.trip} events={data.events} />;
}
function TripWorkspace({ trip, events }: { trip: Trip; events: TripEvent[] }) {
  const { admin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = tripTabFromSearch(params);
  const scrollPositions = useRef<Partial<Record<TripTab, number>>>({
    geral: 0,
  });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  function changeTab(value: TripTab, date?: string, highlights = false) {
    scrollPositions.current[tab] = window.scrollY;
    const next: Record<string, string> =
      value === "geral" ? {} : { tab: value };
    if (date) next.day = date;
    if (highlights) next.priority = "imperdível";
    setParams(next);
    requestAnimationFrame(() => {
      if (
        !date &&
        !highlights &&
        scrollPositions.current[value] !== undefined
      ) {
        window.scrollTo({
          top: scrollPositions.current[value],
          behavior: "instant",
        });
        return;
      }
      const target = window.matchMedia("(max-width: 600px)").matches
        ? document.getElementById("trip-section")
        : document.querySelector(".trip-tabs");
      target?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }
  const [editTrip, setEditTrip] = useState(false);
  const [editEvent, setEditEvent] = useState<TripEvent | "new" | null>(null);
  const [newDate, setNewDate] = useState(trip.startDate);
  const [selected, setSelected] = useState<TripEvent | null>(null);
  const [share, setShare] = useState(false);
  const [confirm, setConfirm] = useState<
    "delete-trip" | "delete-event" | "duplicate" | "private" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const days = datesBetween(trip.startDate, trip.endDate);
  const count = daysBetween(trip.startDate, trip.endDate);
  useEffect(() => {
    if (admin && params.get("action") === "add") {
      setNewDate(trip.startDate);
      setEditEvent("new");
      const next = new URLSearchParams(params);
      next.delete("action");
      setParams(next, { replace: true });
    }
  }, [admin, params, setParams, trip.startDate]);
  function ask(value: typeof confirm) {
    setActionError("");
    setConfirm(value);
  }
  async function perform() {
    if (!admin || busy) return;
    setBusy(true);
    setActionError("");
    try {
      if (confirm === "delete-trip") {
        await removeTrip(trip.id);
        navigate("/");
        toast("Viagem excluída.");
      } else if (confirm === "delete-event" && selected) {
        await removeEvent(trip.id, selected.id);
        setSelected(null);
        toast("Programa excluído.");
      } else if (confirm === "private") {
        await saveTrip({ ...tripInput(trip), isPublic: false }, trip.id);
        toast("Agora só administradores podem ver a viagem.");
      } else if (confirm === "duplicate") {
        const id = await duplicateTrip(trip, events);
        navigate(`/viagem/${id}`);
        toast("Cópia privada criada.");
      }
      setConfirm(null);
    } catch (e) {
      setActionError(
        e instanceof Error
          ? e.message
          : "Não foi possível concluir. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      className={`trip-page theme-trip ${admin ? "" : "public-trip"}`}
      style={themeStyle(trip.theme) as React.CSSProperties}
    >
      <Link className="back" to="/">
        <ArrowLeft size={17} />
        Voltar
      </Link>
      <header
        className={`trip-heading ${tab === "geral" ? "trip-hero" : "compact-heading"}`}
      >
        <div>
          <span className="eyebrow">
            {trip.destinationCity}
            {trip.destinationState && ` · ${trip.destinationState}`}
          </span>
          <h1>{trip.title}</h1>
          <p className="trip-period">
            {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
            <span>·</span>
            {dayCountLabel(count)}
            {!admin && ` em ${trip.destinationCity}`}
          </p>
          <div className="trip-badges">
            <span className={`status-chip status-${trip.status}`}>
              {tripLabels[trip.status]}
            </span>
            {!trip.isPublic && (
              <span className="privacy-label">
                <LockKeyhole size={13} />
                Privada
              </span>
            )}
          </div>
          {tab === "geral" && (
            <JourneyMoment
              trip={trip}
              events={events}
              now={now}
              onDay={(date) => changeTab("roteiro", date)}
            />
          )}
        </div>
        <div className="heading-actions">
          <button className="secondary" onClick={() => setShare(true)}>
            <Share2 size={17} />
            Compartilhar
          </button>
          {admin && (
            <TripMenu
              trip={trip}
              onEdit={() => setEditTrip(true)}
              onDuplicate={() => ask("duplicate")}
              onVisibility={() =>
                trip.isPublic ? ask("private") : setShare(true)
              }
              onDelete={() => ask("delete-trip")}
            />
          )}
        </div>
      </header>
      {!admin && tab === "roteiro" && trip.description && (
        <p className="public-description">{trip.description}</p>
      )}
      <TripNavigation value={tab} onChange={(value) => changeTab(value)} />
      <div className="trip-content" id="trip-section" key={tab}>
        {tab === "geral" ? (
          <TripOverview
            trip={trip}
            events={events}
            now={now}
            admin={admin}
            onDay={(date) => changeTab("roteiro", date)}
            onHighlights={() => changeTab("lugares", undefined, true)}
            onExpenses={() => changeTab("gastos")}
            onSelect={setSelected}
            onAdd={() => {
              setNewDate(trip.startDate);
              setEditEvent("new");
            }}
          />
        ) : tab === "gastos" ? (
          <>
            <div className="section-heading">
              <h2>Gastos da viagem</h2>
            </div>
            <TripSummary
              trip={trip}
              events={events}
              days={days}
              count={count}
            />
          </>
        ) : (
          <Programs
            key={`${tab}-${params.get("priority") || ""}`}
            trip={trip}
            events={events}
            tab={tab}
            admin={admin}
            selectedDate={params.get("day") || ""}
            onDayChange={(date) => {
              const next = new URLSearchParams(params);
              next.set("day", date);
              setParams(next, { replace: true });
            }}
            initialPriority={
              params.get("priority") === "imperdível" ? "imperdível" : ""
            }
            onAdd={(date) => {
              setNewDate(date);
              setEditEvent("new");
            }}
            onSelect={setSelected}
          />
        )}
      </div>
      {editTrip && admin && (
        <TripForm
          trip={trip}
          onClose={() => setEditTrip(false)}
          onSaved={() => setEditTrip(false)}
        />
      )}{" "}
      {editEvent && admin && (
        <EventForm
          trip={trip}
          event={editEvent === "new" ? undefined : editEvent}
          defaultDate={newDate}
          firstEvent={events.length === 0}
          onClose={() => setEditEvent(null)}
        />
      )}{" "}
      {selected && !editEvent && !confirm && (
        <EventDetails
          event={events.find((e) => e.id === selected.id) || selected}
          trip={trip}
          admin={admin}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditEvent(selected);
            setSelected(null);
          }}
          onDelete={() => ask("delete-event")}
          onShare={() => {
            setSelected(null);
            setShare(true);
          }}
        />
      )}{" "}
      {share && (
        <ShareTrip trip={trip} admin={admin} onClose={() => setShare(false)} />
      )}
      {confirm && admin && (
        <Modal
          title={
            confirm === "duplicate"
              ? "Duplicar viagem?"
              : confirm === "private"
                ? "Tornar esta viagem privada?"
                : confirm === "delete-trip"
                  ? "Excluir viagem?"
                  : "Excluir programa?"
          }
          onClose={() => setConfirm(null)}
          busy={busy}
        >
          <p className="muted">
            {confirm === "duplicate"
              ? "Uma cópia privada será criada com os mesmos dias e programas. A viagem original será preservada."
              : confirm === "private"
                ? "Visitantes deixarão de ter acesso a este roteiro, inclusive pelo link compartilhado."
                : confirm === "delete-trip"
                  ? "A viagem e todos os seus programas serão excluídos. Esta ação não pode ser desfeita."
                  : "Este programa será excluído do roteiro. Esta ação não pode ser desfeita."}
          </p>
          {actionError && (
            <p role="alert" className="error">
              {actionError}
            </p>
          )}
          <div className="form-actions">
            <button
              className="secondary"
              onClick={() => setConfirm(null)}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              className={confirm.startsWith("delete") ? "danger" : "primary"}
              disabled={busy}
              onClick={perform}
            >
              {busy
                ? "Aguarde…"
                : confirm === "duplicate"
                  ? "Criar cópia privada"
                  : confirm === "private"
                    ? "Tornar privada"
                    : "Sim, excluir"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
