import type { Trip, TripEvent } from "../types";
import { Wallet, CircleHelp, CheckCircle2 } from "lucide-react";
import { money } from "../utils/money";
import { spending, spendingLabel } from "../utils/spending";
import { formatDate } from "../utils/dates";
import { categoryOf, categoryGroups } from "../data/categories";
export function TripSummary({
  trip,
  events,
  days,
  count,
}: {
  trip: Trip;
  events: TripEvent[];
  days: string[];
  count: number;
}) {
  const estimate = spending(events);
  const active = events.filter((event) => event.status !== "cancelado");
  return (
    <section className="trip-summary">
      <section className="expense-hero">
        <div className="expense-hero-heading">
          <span className="eyebrow">Estimativa da viagem</span>
          <Wallet size={24} aria-hidden="true" />
        </div>
        <p className="summary-amount">
          {estimate.total > 0
            ? money(estimate.total, trip.currency)
            : spendingLabel(events, trip.currency)}
        </p>
        <p>
          {estimate.total > 0
            ? `${money(estimate.total / Math.max(1, count), trip.currency)} por dia${estimate.undefinedCount ? " · média parcial" : ""}`
            : "Seus planos, no seu ritmo."}
        </p>
        <div className="expense-pills">
          <span>
            <CheckCircle2 size={15} aria-hidden="true" />
            {estimate.count - estimate.undefinedCount} com valor definido
          </span>
          <span>{estimate.freeCount} grátis</span>
        </div>
      </section>
      {estimate.undefinedCount > 0 && (
        <div className="expense-pending">
          <CircleHelp size={20} aria-hidden="true" />
          <p>
            <strong>
              {estimate.undefinedCount}{" "}
              {estimate.undefinedCount === 1
                ? "programa sem valor"
                : "programas sem valor"}
            </strong>
            <span>O total considera apenas as estimativas conhecidas.</span>
          </p>
        </div>
      )}
      <section className="expense-categories">
        <div className="section-heading">
          <div>
            <h2>Seus planos em valores</h2>
            <p className="muted">Uma visão por categoria.</p>
          </div>
        </div>
        <div className="summary-breakdown">
          {categoryGroups.map(({ id, label, tone, icon: Icon }) => {
            const values = active.filter(
              (event) => categoryOf(event.category).group === id,
            );
            if (!values.length) return null;
            const group = spending(values);
            return (
              <div className={`expense-group tone-${tone}`} key={id}>
                <span className="section-icon">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div className="expense-group-content">
                  <div className="summary-line">
                    <span>{label}</span>
                    <strong>{spendingLabel(values, trip.currency)}</strong>
                  </div>
                  <span className="expense-group-count">
                    {values.length}{" "}
                    {values.length === 1 ? "programa" : "programas"}
                  </span>
                  {group.total > 0 && (
                    <div className="expense-track" aria-hidden="true">
                      <span
                        style={{
                          width: `${(group.total / estimate.total) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {!active.length && (
          <p className="muted">
            Os valores aparecem aqui conforme você adiciona programas ao
            roteiro.
          </p>
        )}
      </section>
      <section className="expense-by-day" aria-labelledby="expense-days-title">
        <h2 id="expense-days-title">Estimativa por dia</h2>
        <div className="expense-day-grid">
          {days.map((day) => {
            const programs = active.filter((event) => event.date === day);
            return (
              <article className="expense-day" key={day}>
                <h3>{formatDate(day, { weekday: "short", day: "numeric" })}</h3>
                <strong>{spendingLabel(programs, trip.currency)}</strong>
                <span>{programs.length} {programs.length === 1 ? "programa" : "programas"}</span>
              </article>
            );
          })}
        </div>
      </section>
      <p className="footnote">
        Estimativas para todas as pessoas informadas. Programas cancelados não
        entram no total. Você pode ajustar os valores na ficha de cada programa.
      </p>
    </section>
  );
}
