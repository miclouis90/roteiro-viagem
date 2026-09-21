import { TripSidebar } from "../components/TripSidebar";
import { TripCalendar } from "../components/TripCalendar";
import { TripSummary } from "../components/TripSummary";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Share2,
  CalendarDays,
  List,
  Search,
  MapPin,
  ArrowLeft,
  SlidersHorizontal,
  Pencil,
  Compass,
  Wallet,
  Leaf,
  Calendar,
  LayoutGrid,
  Sun,
} from "lucide-react";
import type { Trip, TripEvent } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import {
  watchTrip,
  watchEvents,
  removeTrip,
  removeEvent,
} from "../services/repository";
import {
  daysBetween,
  datesBetween,
  formatDate,
  localDate,
  dateKey,
} from "../utils/dates";
import { cost, money } from "../utils/money";
import { categories } from "../data/categories";
import { TripForm, EventForm } from "../components/Forms";
import { EventCard, EventDetails } from "../components/Events";
import { Modal } from "../components/Modal";
import { demoMode } from "../lib/firebase";
export function TripPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { admin, loading: authLoading } = useAuth();
  const toast = useToast();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("roteiro");
  const [view, setView] = useState("agenda");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [day, setDay] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [payment, setPayment] = useState("");
  const [tripForm, setTripForm] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [eventForm, setEventForm] = useState<TripEvent | "new" | null>(null);
  const [details, setDetails] = useState<TripEvent | null>(null);
  const [deletion, setDeletion] = useState<TripEvent | "trip" | null>(null);
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState(false);
  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    setError("");
    setTrip(null);
    setEvents([]);
    const stop = watchTrip(
      id,
      (t) => {
        setTrip(t);
        setLoading(false);
      },
      () => {
        setError(
          "Esta viagem é privada, não existe ou não pôde ser carregada.",
        );
        setLoading(false);
      },
    );
    return stop;
  }, [id, admin, authLoading]);
  useEffect(() => {
    if (!trip || (!trip.isPublic && !admin)) return;
    return watchEvents(id, setEvents, () =>
      setError("Não foi possível carregar os programas. Verifique a conexão."),
    );
  }, [id, trip, admin]);
  if (loading || authLoading)
    return (
      <main className="empty" role="status">
        Preparando o roteiro…
      </main>
    );
  if (error || !trip || (!trip.isPublic && !admin))
    return (
      <main className="empty">
        <Compass size={40} />
        <h1>Roteiro indisponível</h1>
        <p>
          {error ||
            "Esta viagem é privada ou não existe. Entre com uma conta administrativa para continuar."}
        </p>
        <Link to="/">Voltar às viagens</Link>
      </main>
    );
  const active = events.filter((e) => e.status !== "cancelado");
  const total = active.reduce((s, e) => s + cost(e), 0);
  const days = datesBetween(trip.startDate, trip.endDate);
  const count = daysBetween(trip.startDate, trip.endDate);
  const sorted = [...events].sort((a, b) =>
    (a.date + a.startTime).localeCompare(b.date + b.startTime),
  );
  const filtered = sorted.filter(
    (e) =>
      (!search ||
        `${e.title} ${e.description} ${e.location}`
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase())) &&
      (!day || e.date === day) &&
      (!category || e.category === category) &&
      (!status || e.status === status) &&
      (!priority || e.priority === priority) &&
      (!payment || (payment === "free" ? e.isFree : !e.isFree)) &&
      (tab !== "hoje" || e.date === dateKey()),
  );
  const shownDays = tab === "hoje" ? [dateKey()] : day ? [day] : days;
  const hasFilters = !!(
    search ||
    day ||
    category ||
    status ||
    priority ||
    payment
  );
  const extra = filtered.filter((e) => !days.includes(e.date));
  const upcoming = sorted
    .filter(
      (e) =>
        e.status !== "cancelado" &&
        e.status !== "realizado" &&
        `${e.date}T${e.startTime}` >=
          `${dateKey()}T${new Date().toTimeString().slice(0, 5)}`,
    )
    .slice(0, 3);
  async function deleteConfirmed() {
    setBusy(true);
    try {
      if (deletion === "trip") {
        await removeTrip(id);
        navigate("/");
        toast("Viagem excluída.");
      } else if (deletion) {
        await removeEvent(id, deletion.id);
        setDetails(null);
        toast("Programa excluído.");
      }
      setDeletion(null);
    } catch {
      toast("Não foi possível excluir. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function copyLink() {
    if (demoMode) {
      setShare(true);
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copiado.");
    } catch {
      setShare(true);
    }
  }
  const renderCards = (list: TripEvent[]) =>
    list.map((e) => (
      <EventCard
        key={e.id}
        event={e}
        currency={trip.currency}
        onClick={() => setDetails(e)}
      />
    ));
  return (
    <main>
      <Link to="/" className="back">
        <ArrowLeft size={15} />
        Todas as viagens
      </Link>
      <section className="trip-heading">
        <div>
          <div className="eyebrow">
            <MapPin size={14} />
            {trip.destinationCity.toUpperCase()}
            {trip.destinationState && ` · ${trip.destinationState}`} ·{" "}
            {trip.country.toUpperCase()}
          </div>
          <h1>{trip.title}</h1>
          <p className="trip-description">{trip.description}</p>
          <div className="trip-meta">
            <span>
              <Calendar size={15} />
              {formatDate(trip.startDate)} —{" "}
              {formatDate(trip.endDate, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span>{count} dias</span>
            <span>{trip.travelerName}</span>
            <span className="badge">{trip.status}</span>
          </div>
        </div>
        <div className="heading-actions">
          {admin && (
            <button
              className="icon-button"
              aria-label="Editar viagem"
              onClick={() => setTripForm(true)}
            >
              <Pencil size={18} />
            </button>
          )}
          <button className="secondary" onClick={copyLink}>
            <Share2 size={16} />
            Compartilhar
          </button>
        </div>
      </section>
      <section className="stats">
        <div>
          <span>
            <Compass size={17} />
            Programas planejados
          </span>
          <strong>
            {active.length}
            <small> boas experiências</small>
          </strong>
        </div>
        <div>
          <span>
            <Leaf size={17} />
            Para aproveitar de graça
          </span>
          <strong>
            {active.filter((e) => e.isFree).length}
            <small> atividades</small>
          </strong>
        </div>
        <div>
          <span>
            <Wallet size={17} />
            Estimativa da viagem
          </span>
          <strong>{money(total, trip.currency)}</strong>
        </div>
        <div className="stat-note">
          <span>VIAJAR É COLECIONAR</span>
          <strong>bons momentos.</strong>
          <small>O roteiro cuida do resto.</small>
        </div>
      </section>
      <div className="workspace">
        <section className="itinerary">
          <nav className="tabs" aria-label="Visualizações da viagem">
            {[
              ["hoje", "Hoje", Sun],
              ["roteiro", "Roteiro", CalendarDays],
              ["lugares", "Lugares", MapPin],
              ["resumo", "Resumo", LayoutGrid],
            ].map(([value, label, Icon]) => {
              const I = Icon as typeof Sun;
              return (
                <button
                  key={String(value)}
                  className={tab === value ? "active" : ""}
                  onClick={() => setTab(String(value))}
                >
                  <I size={17} />
                  {String(label)}
                </button>
              );
            })}
          </nav>
          {tab === "resumo" ? (
            <TripSummary
              trip={trip}
              active={active}
              days={days}
              total={total}
              count={count}
            />
          ) : (
            <>
              <div className="section-heading">
                <div>
                  <h2>
                    {tab === "hoje"
                      ? "Seu dia, sem pressa"
                      : tab === "lugares"
                        ? "Lugares para descobrir"
                        : "Seu roteiro"}
                  </h2>
                  <p className="muted">
                    {tab === "hoje"
                      ? formatDate(dateKey(), { day: "numeric", month: "long" })
                      : "Um dia de cada vez. Uma descoberta de cada vez."}
                  </p>
                </div>
                {admin && (
                  <button
                    className="primary"
                    onClick={() => {
                      setNewDate(day || trip.startDate);
                      setEventForm("new");
                    }}
                  >
                    <Plus size={17} />
                    <span>Adicionar programa</span>
                  </button>
                )}
              </div>
              <div className="toolbar">
                <label className="search">
                  <Search size={18} />
                  <input
                    aria-label="Buscar programas"
                    placeholder="Buscar no roteiro…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <button
                  className={`secondary ${filtersOpen ? "selected" : ""}`}
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  aria-expanded={filtersOpen}
                >
                  <SlidersHorizontal size={16} />
                  Filtros
                </button>
                {tab === "roteiro" && (
                  <div className="view-toggle">
                    <button
                      aria-label="Agenda"
                      className={view === "agenda" ? "active" : ""}
                      onClick={() => setView("agenda")}
                    >
                      <List size={18} />
                    </button>
                    <button
                      aria-label="Calendário"
                      className={view === "calendar" ? "active" : ""}
                      onClick={() => setView("calendar")}
                    >
                      <CalendarDays size={18} />
                    </button>
                  </div>
                )}
              </div>
              {filtersOpen && (
                <div className="filters">
                  <label>
                    Data
                    <select
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                    >
                      <option value="">Todos os dias</option>
                      {days.map((d) => (
                        <option value={d} key={d}>
                          {formatDate(d)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Categoria
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {categories.map((c) => (
                        <option key={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Status
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {[
                        "ideia",
                        "reservado",
                        "confirmado",
                        "realizado",
                        "cancelado",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Prioridade
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {["imperdível", "gostaria de ir", "opcional"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Valor
                    <select
                      value={payment}
                      onChange={(e) => setPayment(e.target.value)}
                    >
                      <option value="">Todos</option>
                      <option value="free">Gratuitas</option>
                      <option value="paid">Pagas</option>
                    </select>
                  </label>
                </div>
              )}
              {hasFilters && (
                <button
                  className="text-button"
                  onClick={() => {
                    setDay("");
                    setCategory("");
                    setPriority("");
                    setStatus("");
                    setPayment("");
                    setSearch("");
                  }}
                >
                  Limpar filtros · {filtered.length} resultado(s)
                </button>
              )}
              {tab === "lugares" ? (
                <div className="places">
                  {filtered.length ? (
                    renderCards(filtered)
                  ) : (
                    <p className="empty">Nenhum lugar encontrado.</p>
                  )}
                </div>
              ) : view === "calendar" && tab === "roteiro" ? (
                <TripCalendar
                  trip={trip}
                  active={active}
                  days={days}
                  filtered={filtered}
                  setDetails={setDetails}
                />
              ) : (
                <div className="agenda">
                  {shownDays
                    .filter(
                      (d) => !hasFilters || filtered.some((e) => e.date === d),
                    )
                    .map((d) => {
                      const list = filtered.filter((e) => e.date === d);
                      return (
                        <section className="day-section" key={d}>
                          <div className="day-heading">
                            <span className="date-tile">
                              {formatDate(d, { month: "short" }).replace(
                                ".",
                                "",
                              )}
                              <strong>{localDate(d).getDate()}</strong>
                            </span>
                            <div>
                              <h3>{formatDate(d, { weekday: "long" })}</h3>
                              <span>
                                {list.length} programa(s) ·{" "}
                                {money(
                                  list.reduce((s, e) => s + cost(e), 0),
                                  trip.currency,
                                )}
                              </span>
                            </div>
                            {d === dateKey() && (
                              <span className="badge">Hoje</span>
                            )}
                          </div>
                          {list.length ? (
                            renderCards(list)
                          ) : (
                            <div className="day-empty">
                              Nenhum programa para esse dia ainda.
                              {admin && days.includes(d) && (
                                <button
                                  className="text-button"
                                  onClick={() => {
                                    setNewDate(d);
                                    setEventForm("new");
                                  }}
                                >
                                  + Adicionar programa
                                </button>
                              )}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  {hasFilters && filtered.length === 0 && (
                    <p className="empty">
                      Nenhum programa encontrado com esses filtros.
                    </p>
                  )}
                </div>
              )}
              {extra.length > 0 && tab === "roteiro" && (
                <section>
                  <h3>Fora do período atual da viagem</h3>
                  <p className="muted">Revise as datas destes programas.</p>
                  {renderCards(extra)}
                </section>
              )}
            </>
          )}
        </section>
        <TripSidebar
          trip={trip}
          active={active}
          upcoming={upcoming}
          admin={admin}
          setDetails={setDetails}
          onDelete={() => setDeletion("trip")}
        />
      </div>
      {tripForm && admin && (
        <TripForm
          trip={trip}
          onClose={() => setTripForm(false)}
          onSaved={() => setTripForm(false)}
        />
      )}{" "}
      {eventForm && admin && (
        <EventForm
          defaultDate={newDate}
          trip={trip}
          event={eventForm === "new" ? undefined : eventForm}
          onClose={() => setEventForm(null)}
        />
      )}{" "}
      {details && !eventForm && !deletion && (
        <EventDetails
          event={details}
          trip={trip}
          admin={admin}
          onClose={() => setDetails(null)}
          onEdit={() => {
            setEventForm(details);
            setDetails(null);
          }}
          onDelete={() => setDeletion(details)}
        />
      )}{" "}
      {deletion && admin && (
        <Modal
          title={
            deletion === "trip" ? "Excluir viagem?" : "Excluir este programa?"
          }
          onClose={() => !busy && setDeletion(null)}
        >
          <p>
            Esta ação não poderá ser desfeita.
            {deletion === "trip"
              ? " Todos os programas desta viagem também serão excluídos."
              : ""}
          </p>
          <div className="form-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setDeletion(null)}
            >
              Cancelar
            </button>
            <button
              className="danger"
              disabled={busy}
              onClick={deleteConfirmed}
            >
              {busy ? "Excluindo…" : "Sim, excluir"}
            </button>
          </div>
        </Modal>
      )}{" "}
      {share && (
        <Modal title="Compartilhar roteiro" onClose={() => setShare(false)}>
          <p>
            {demoMode
              ? "Esta demonstração fica somente neste navegador. Para compartilhar viagens reais entre dispositivos, configure o Firebase."
              : trip.isPublic
                ? "Qualquer pessoa com este link pode visualizar o roteiro."
                : "Esta viagem é privada. O link só funcionará para administradores."}
          </p>
          <input
            aria-label="Link da viagem"
            readOnly
            value={window.location.href}
            onFocus={(e) => e.target.select()}
          />
        </Modal>
      )}
    </main>
  );
}
