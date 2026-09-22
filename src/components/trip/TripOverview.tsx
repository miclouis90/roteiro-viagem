import { ArrowRight, Plane, Sparkles, WalletCards, Plus } from "lucide-react";
import type { Trip, TripEvent } from "../../types";
import { tripOverview, timeUntilEvent } from "../../utils/overview";
import { formatDate } from "../../utils/dates";
import { categoryOf } from "../../data/categories";
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
          {view.days.map(({ date, count, tones }) => (
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
                {count
                  ? `${count} programa${count === 1 ? "" : "s"}`
                  : "Dia livre"}
              </span>
              <span className="day-tones" aria-hidden="true">
                {tones.map((tone) => (
                  <i key={tone} className={`tone-${tone}`} />
                ))}
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
              <button
                className={`next-moment tone-${categoryOf(view.next.category).tone}`}
                onClick={() => onSelect(view.next!)}
              >
                <span className="next-time">
                  {view.next.startTime}
                  <small>{timeUntilEvent(view.next, now)}</small>
                </span>
                <span>
                  <CategoryChip name={view.next.category} />
                  <strong>{view.next.title}</strong>
                  <span className="muted">
                    {view.next.location || "Local a definir"}
                  </span>
                  <small>{formatDate(view.next.date)}</small>
                </span>
                <ArrowRight size={20} />
              </button>
            </section>
          )}
          {view.phase === "during" && view.todayPreview.length > 0 && (
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
              {view.todayPreview.map(eventLink)}
            </section>
          )}
          {view.highlights.length > 0 && (
            <section className="overview-section">
              <SectionHeader
                title="Imperdíveis"
                description={`${view.highlights.length} motivo${view.highlights.length === 1 ? "" : "s"} para sair e descobrir.`}
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
                    className={`highlight-card ui-card card-interactive tone-${categoryOf(event.category).tone}`}
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
