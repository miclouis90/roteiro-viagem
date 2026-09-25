import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Share2, LockKeyhole } from "lucide-react";
import type { Trip, TripEvent } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useTrip } from "../hooks/useTrip";
import { useToast } from "../hooks/useToast";
import { removeTrip, removeEvent } from "../services/repository";
import { duplicateTrip } from "../services/duplicateTrip";
import { removeMember } from "../services/collaboration";
import { tripAccess } from "../utils/access";
import { datesBetween, daysBetween, formatDate } from "../utils/dates";
import { dayCountLabel, tripLabels } from "../utils/labels";
import { tripTabFromSearch, itineraryViewFromSearch } from "../utils/tripView";
import { TripOverview } from "../components/trip/TripOverview";
import { themeStyle } from "../data/themes";

import { LoadingState } from "../components/ui/LoadingState";
import { RouteArtwork } from "../components/ui/RouteArtwork";
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
  const data = useTrip(id);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);
  if (data.loading)
    return (
      <main>
        <LoadingState label="Preparando o roteiro…" />
      </main>
    );
  if (data.error || !data.trip || !data.access.canRead)
    return (
      <main>
        <EmptyState
          title="Roteiro indisponível"
          description={
            data.error || "Entre com uma conta que participa desta viagem."
          }
        >
          <Link className="secondary" to="/">
            Voltar às viagens
          </Link>
        </EmptyState>
      </main>
    );
  return (
    <TripWorkspace
      key={id}
      trip={data.trip}
      events={data.events}
      access={data.access}
      editor={data.editor}
    />
  );
}
function TripWorkspace({
  trip,
  events,
  access,
  editor,
}: {
  trip: Trip;
  events: TripEvent[];
  access: ReturnType<typeof useTrip>["access"];
  editor: boolean;
}) {
  const { user } = useAuth();
  const admin = access.canEdit;
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = tripTabFromSearch(params);
  const itineraryView = itineraryViewFromSearch(params);
  const [addSheet, setAddSheet] = useState(false);
  const [addKind, setAddKind] = useState<"program" | "transport" | "place">(
    "program",
  );
  const [expandDetails, setExpandDetails] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const scrollPositions = useRef<Partial<Record<TripTab, number>>>({
    geral: 0,
  });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  function changeTab(value: TripTab, date?: string) {
    scrollPositions.current[tab] = window.scrollY;
    const next: Record<string, string> =
      value === "geral" ? {} : { tab: value };
    if (date) next.day = date;
    setParams(next);
    requestAnimationFrame(() => {
      if (!date && scrollPositions.current[value] !== undefined) {
        window.scrollTo({
          top: scrollPositions.current[value],
          behavior: "instant",
        });
        return;
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }
  const [editTrip, setEditTrip] = useState(false);
  const [editEvent, setEditEvent] = useState<TripEvent | "new" | null>(null);
  const [newDate, setNewDate] = useState(trip.startDate);
  const [selected, setSelected] = useState<TripEvent | null>(null);
  const [share, setShare] = useState(false);
  const [confirm, setConfirm] = useState<
    "delete-trip" | "delete-event" | "duplicate" | "leave" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const days = datesBetween(trip.startDate, trip.endDate);
  const count = daysBetween(trip.startDate, trip.endDate);
  useEffect(() => {
    if (admin && params.get("action") === "add") {
      const requestedDay = params.get("day") || trip.startDate;
      setNewDate(
        requestedDay >= trip.startDate && requestedDay <= trip.endDate
          ? requestedDay
          : trip.startDate,
      );
      setAddSheet(true);
      const next = new URLSearchParams(params);
      next.delete("action");
      setParams(next, { replace: true });
    }
  }, [admin, params, setParams, trip.startDate, trip.endDate]);
  function ask(value: typeof confirm) {
    setActionError("");
    setConfirm(value);
  }
  async function perform() {
    if (!admin || busy) return;
    if (
      (confirm === "delete-trip" || confirm === "duplicate") &&
      !access.canManage
    )
      return;
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
        toast("Programa removido.");
      } else if (confirm === "leave" && user) {
        await removeMember(trip.id, user.uid);
        navigate("/");
        toast("Você saiu da viagem.");
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
      {tab === "geral" ? (
        <>
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
              </p>
              <div className="trip-badges">
                <span className={`status-chip status-${trip.status}`}>
                  {tripLabels[trip.status]}
                </span>
                {!trip.isPublic && (
                  <span className="privacy-label">
                    <LockKeyhole size={13} />
                    {tripAccess(trip) === "SHARED"
                      ? "Compartilhada"
                      : "Privada"}
                  </span>
                )}
              </div>
              {tab === "geral" && (
                <JourneyMoment trip={trip} events={events} now={now} />
              )}
            </div>
            <RouteArtwork />
            <div className="heading-actions">
              {!admin && (
                <button
                  className="icon-button"
                  aria-label="Compartilhar viagem"
                  onClick={() => setShare(true)}
                >
                  <Share2 size={17} />
                </button>
              )}
              {admin && (
                <TripMenu
                  owner={access.canManage}
                  canLeave={editor}
                  onLeave={() => ask("leave")}
                  onEdit={() => setEditTrip(true)}
                  onShare={() => setShare(true)}
                  onDuplicate={() => ask("duplicate")}
                  onVisibility={() => setShare(true)}
                  onDelete={() => ask("delete-trip")}
                />
              )}
            </div>
          </header>
        </>
      ) : (
        <header className="internal-heading">
          <h1>{tab === "roteiro" ? "Roteiro" : "Gastos"}</h1>
        </header>
      )}
      <TripNavigation value={tab} onChange={(value) => changeTab(value)} onTrips={() => {
        navigate("/");
        window.scrollTo({ top: 0, behavior: "instant" });
      }} />
      <div className="trip-content" id="trip-section" key={tab}>
        {tab === "geral" ? (
          <TripOverview
            trip={trip}
            events={events}
            now={now}
            onDay={(date) => changeTab("roteiro", date)}
          />
        ) : tab === "gastos" ? (
          <>
            <TripSummary
              trip={trip}
              events={events}
              days={days}
              count={count}
            />
          </>
        ) : (
          <>
            <nav className="itinerary-tabs" aria-label="Visões do roteiro">
              {(["roteiro", "lugares"] as const).map((view) => (
                <button
                  key={view}
                  aria-pressed={itineraryView === view}
                  className={itineraryView === view ? "active" : ""}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set("tab", "roteiro");
                    if (view === "lugares") next.set("view", "lugares");
                    else next.delete("view");
                    setParams(next);
                  }}
                >
                  {view === "roteiro" ? "Roteiro" : "Lugares"}
                </button>
              ))}
            </nav>
            <Programs
              key={`${itineraryView}-${params.get("priority") || ""}`}
              trip={trip}
              events={events}
              tab={itineraryView}
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
              onSelect={(event) => {
                setJustSaved(false);
                setSelected(event);
              }}
            />
          </>
        )}
      </div>
      {addSheet && admin && (
        <Modal title="Adicionar" onClose={() => setAddSheet(false)}>
          <div className="quick-actions">
            {(
              [
                { id: "program", label: "Programa" },
                { id: "transport", label: "Transporte" },
                { id: "place", label: "Lugar para lembrar" },
              ] as const
            ).map(({ id, label }) => (
              <button
                className="secondary"
                key={id}
                onClick={() => {
                  setAddKind(id);
                  setExpandDetails(false);
                  setJustSaved(false);
                  setAddSheet(false);
                  setEditEvent("new");
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Modal>
      )}
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
          kind={addKind}
          expandDetails={expandDetails}
          onSaved={(saved) => {
            setSelected(saved);
            setJustSaved(editEvent === "new");
            setEditEvent(null);
          }}
          onClose={() => setEditEvent(null)}
        />
      )}{" "}
      {selected && !editEvent && !confirm && (
        <EventDetails
          event={events.find((e) => e.id === selected.id) || selected}
          justSaved={justSaved}
          trip={trip}
          admin={admin}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setExpandDetails(justSaved);
            setEditEvent(events.find((e) => e.id === selected.id) || selected);
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
        <ShareTrip
          trip={trip}
          owner={access.owner}
          legacy={access.legacy}
          editor={editor}
          onClose={() => setShare(false)}
        />
      )}
      {confirm && admin && (
        <Modal
          title={
            confirm === "duplicate"
              ? "Duplicar viagem?"
              : confirm === "leave"
                ? "Sair da viagem?"
                : confirm === "delete-trip"
                  ? "Excluir viagem?"
                  : `Excluir ${selected?.title ?? "programa"}?`
          }
          onClose={() => setConfirm(null)}
          busy={busy}
        >
          <p className="muted">
            {confirm === "duplicate"
              ? "Uma cópia privada será criada com os mesmos dias e programas. A viagem original será preservada."
              : confirm === "leave"
                ? "Sua participação será removida. Se o link permitir edição, você ainda poderá voltar a colaborar ao abri-lo."
                : confirm === "delete-trip"
                  ? "A viagem e todos os seus programas serão excluídos. Esta ação não pode ser desfeita."
                  : "Essa alteração será removida do roteiro para todos."}
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
                  : confirm === "leave"
                    ? "Sair da viagem"
                    : "Excluir"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
