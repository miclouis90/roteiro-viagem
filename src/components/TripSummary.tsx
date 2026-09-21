import type { Trip, TripEvent } from "../types";
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
      <section className="summary-section expense-total">
        <span className="eyebrow">
          {estimate.undefinedCount ? "Estimativa parcial" : "Gastos estimados"}
        </span>
        <p className="summary-amount">
          {estimate.total > 0
            ? money(estimate.total, trip.currency)
            : spendingLabel(events, trip.currency)}
        </p>
        {estimate.undefinedCount > 0 && (
          <p className="undefined-note">
            {estimate.undefinedCount} programa(s) ainda sem valor. O total
            considera apenas as estimativas conhecidas.
          </p>
        )}
        {estimate.total > 0 && (
          <p className="muted">
            {money(estimate.total / Math.max(1, count), trip.currency)} por dia
            {estimate.undefinedCount > 0 ? " · média parcial" : ""}
          </p>
        )}
        <p className="muted">
          {estimate.freeCount} grátis · {estimate.count - estimate.freeCount}{" "}
          pagos
        </p>
        <div className="summary-breakdown">
          {categoryGroups.map(({ id, label, tone, icon: Icon }) => {
            const values = active.filter(
              (event) => categoryOf(event.category).group === id,
            );
            if (!values.length) return null;
            const group = spending(values);
            return (
              <div className={`expense-group tone-${tone}`} key={id}>
                <div className="summary-line">
                  <span className="expense-label">
                    <span className="section-icon">
                      <Icon size={18} />
                    </span>
                    {label}
                  </span>
                  <strong>{spendingLabel(values, trip.currency)}</strong>
                </div>
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
            );
          })}
        </div>
      </section>
      <details className="summary-section expandable">
        <summary>Gastos por dia</summary>
        {days.map((day) => (
          <div className="summary-line" key={day}>
            <span>{formatDate(day)}</span>
            <span>
              {spendingLabel(
                active.filter((event) => event.date === day),
                trip.currency,
              )}
            </span>
          </div>
        ))}
      </details>
      <p className="footnote">
        Valores estimados para todas as pessoas informadas. Programas cancelados
        não entram nos totais. Atualize os preços em cada programa para
        completar a estimativa.
      </p>
    </section>
  );
}
