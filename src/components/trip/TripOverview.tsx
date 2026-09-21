import {
  ArrowRight,
  Compass,
  Plane,
  Sparkles,
  WalletCards,
  Plus,
} from "lucide-react";
import type { Trip, TripEvent } from "../../types";
import { tripOverview } from "../../utils/overview";
import { formatDate } from "../../utils/dates";
import { dayCountLabel } from "../../utils/labels";
import { spending, spendingLabel } from "../../utils/spending";
import { Button, Card, CategoryChip, SectionHeader } from "../ui/Primitives";

export function TripOverview({
  trip,
  events,
  now,
  admin,
  onDay,
  onHighlights,
  onExpenses,
  onSelect,
  onAdd,
}: {
  trip: Trip;
  events: TripEvent[];
  now: Date;
  admin: boolean;
  onDay: (date: string) => void;
  onHighlights: () => void;
  onExpenses: () => void;
  onSelect: (event: TripEvent) => void;
  onAdd: () => void;
}) {
  const view = tripOverview(trip, events, now);
  const estimate = spending(events);
  const eventLink = (event: TripEvent) => (
    <button
      key={event.id}
      className="overview-event"
      onClick={() => onSelect(event)}
    >
      <CategoryChip name={event.category} iconOnly />
      <span>
        <strong>{event.title}</strong>
        <small>
          {formatDate(event.date)} · {event.startTime}
          {event.endTime && `–${event.endTime}`}
        </small>
        <span className="muted">{event.location || "Local a definir"}</span>
      </span>
      <ArrowRight size={16} />
    </button>
  );
  return (
    <div className="overview">
      <Card variant="tonal" className={`journey-context phase-${view.phase}`}>
        <div className="context-symbol">
          <Compass size={28} strokeWidth={1.5} />
        </div>
        <div>
          <span className="eyebrow">
            {view.phase === "before"
              ? "A próxima história está chegando"
              : view.phase === "during"
                ? "Viva o caminho"
                : "Memórias para levar"}
          </span>
          <h2>
            {view.phase === "before"
              ? `Falta${view.remainingDays === 1 ? "" : "m"} ${dayCountLabel(view.remainingDays)}.`
              : view.phase === "during"
                ? `Hoje em ${trip.destinationCity}`
                : "Que viagem boa."}
          </h2>
          <p>
            {view.phase === "before"
              ? `Seu primeiro dia começa em ${formatDate(trip.startDate, { day: "numeric", month: "long" })}.`
              : view.phase === "during"
                ? `${view.todayEvents.length ? `${view.todayEvents.length} programa(s) para aproveitar hoje.` : "Hoje está livre. Aproveite no seu ritmo."}`
                : `${dayCountLabel(view.days.length)} · ${view.active.length} programas no roteiro.`}
          </p>
          <Button
            variant="secondary"
            onClick={() =>
              onDay(view.phase === "during" ? view.today : trip.startDate)
            }
          >
            {view.phase === "before"
              ? "Ver primeiro dia"
              : view.phase === "during"
                ? "Ver dia completo"
                : "Rever roteiro"}
            <ArrowRight size={16} />
          </Button>
        </div>
        <div className="context-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </Card>
      <section className="overview-days">
        <SectionHeader
          title="Roteiro em um olhar"
          description={
            view.active.length
              ? `Seu roteiro já tem ${view.active.length} boas ideias.`
              : "Seu roteiro começa com uma boa ideia."
          }
        />
        <div className="day-glance" aria-label="Roteiro por dia">
          {view.days.map(({ date, count }) => (
            <button
              key={date}
              className={`glance-day ${count ? "has-programs" : "free-day"} ${date === view.today ? "is-today" : ""}`}
              onClick={() => onDay(date)}
            >
              <small>
                {formatDate(date, { weekday: "short" }).replace(".", "")}
              </small>
              <strong>
                {formatDate(date, { day: "numeric", month: "short" }).replace(
                  " de ",
                  " ",
                )}
              </strong>
              <span>
                {count ? `${count} programa${count === 1 ? "" : "s"}` : "Livre"}
              </span>
              {date === view.today && <em>Hoje</em>}
            </button>
          ))}
        </div>
      </section>
      <div className="overview-columns">
        <div className="overview-main">
          {view.next && (
            <section className="overview-section">
              <SectionHeader title="Próximo programa" />
              {eventLink(view.next)}
            </section>
          )}
          {view.phase === "during" && view.todayEvents.length > 0 && (
            <section className="overview-section">
              <SectionHeader
                title="Hoje"
                action={
                  <Button variant="ghost" onClick={() => onDay(view.today)}>
                    Ver dia completo
                    <ArrowRight size={16} />
                  </Button>
                }
              />
              {view.todayEvents.slice(0, 3).map(eventLink)}
            </section>
          )}
          {view.highlights.length > 0 && (
            <section className="overview-section">
              <SectionHeader
                title="Imperdíveis"
                description={`${view.highlights.length} motivos para sair e descobrir.`}
                action={
                  <Button variant="ghost" onClick={onHighlights}>
                    Ver todos
                    <ArrowRight size={16} />
                  </Button>
                }
              />
              <div className="highlights-scroll">
                {view.highlights.slice(0, 4).map((event) => (
                  <button
                    key={event.id}
                    className="highlight-card ui-card card-interactive"
                    onClick={() => onSelect(event)}
                  >
                    <CategoryChip name={event.category} iconOnly />
                    <strong>{event.title}</strong>
                    <span className="muted">
                      {formatDate(event.date)} · {event.startTime}
                    </span>
                    <CategoryChip name={event.category} />
                  </button>
                ))}
              </div>
            </section>
          )}
          {view.active.length === 0 && (
            <Card className="overview-empty">
              <Sparkles size={26} />
              <h3>O melhor ainda está por vir.</h3>
              <p>Guarde os lugares e momentos que você quer viver.</p>
              {admin && (
                <Button onClick={onAdd}>
                  <Plus size={18} />
                  Adicionar primeiro programa
                </Button>
              )}
            </Card>
          )}
          {(trip.description || trip.notes) && (
            <section className="overview-section trip-story">
              <SectionHeader title="Sobre a viagem" />
              {trip.description && <p>{trip.description}</p>}
              {trip.notes && (
                <details className="expandable">
                  <summary>Para lembrar</summary>
                  <p>{trip.notes}</p>
                </details>
              )}
            </section>
          )}
        </div>
        <aside className="overview-context">
          {view.transport.length > 0 && (
            <section className="overview-section transport-section">
              <span className="section-icon tone-transport">
                <Plane size={23} />
              </span>
              <SectionHeader
                title="Transporte"
                description="Chegadas, saídas e caminhos pelo meio."
              />
              {view.transport.slice(0, 3).map(eventLink)}
              {view.transport.length > 3 && (
                <details className="expandable">
                  <summary>
                    Mais {view.transport.length - 3} deslocamentos
                  </summary>
                  {view.transport.slice(3).map(eventLink)}
                </details>
              )}
            </section>
          )}
          <section className="overview-section expense-preview">
            <span className="section-icon tone-night">
              <WalletCards size={23} />
            </span>
            <SectionHeader title="Gastos" />
            <p className="preview-amount">
              {spendingLabel(events, trip.currency)}
            </p>
            <p className="muted">
              {estimate.undefinedCount
                ? `${estimate.undefinedCount} programa(s) ainda sem valor.`
                : "Estimativa para todas as pessoas informadas."}
            </p>
            <Button variant="secondary" onClick={onExpenses}>
              Ver gastos
              <ArrowRight size={16} />
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}
