import type { Trip, TripEvent } from "../types";
import { cost, money } from "../utils/money";
import { hasUndefinedPrice } from "../utils/eventPrice";
import { formatDate } from "../utils/dates";
import { dayCountLabel } from "../utils/labels";
import { categoryOf } from "../data/categories";
const groups = [
  ["food", "Comer"],
  ["night", "Beber"],
  ["culture", "Cultura"],
  ["outdoor", "Passear"],
  ["other", "Outros"],
];
export function TripSummary({
  trip,
  active,
  days,
  total,
  count,
}: {
  trip: Trip;
  active: TripEvent[];
  days: string[];
  total: number;
  count: number;
}) {
  return (
    <section className="trip-summary">
      <div className="summary-intro">
        <span>{active.length} programas</span>
        <span>{dayCountLabel(count)}</span>
        <span>{money(total, trip.currency)} estimados</span>
      </div>
      <section className="summary-section">
        <span className="eyebrow">Gastos estimados</span>
        <p className="summary-amount">{money(total, trip.currency)}</p>
        {active.some(hasUndefinedPrice) && (
          <p className="muted">
            Estimativa parcial: {active.filter(hasUndefinedPrice).length}{" "}
            programa(s) com valor a definir.
          </p>
        )}
        {total === 0 && (
          <p className="muted">Ainda não há estimativas de gastos.</p>
        )}
        <p className="muted">
          {money(total / count, trip.currency)} por dia ·{" "}
          {active.filter((e) => e.isFree).length} grátis ·{" "}
          {active.filter((e) => !e.isFree).length} pagos
        </p>
        <div className="summary-breakdown">
          {groups.map(([group, label]) => {
            const values = active.filter(
              (e) => categoryOf(e.category).group === group,
            );
            return (
              <div className="summary-line" key={group}>
                <span>{label}</span>
                <strong>
                  {money(
                    values.reduce((sum, e) => sum + cost(e), 0),
                    trip.currency,
                  )}
                </strong>
              </div>
            );
          })}
        </div>
      </section>
      <section className="summary-section">
        <h3>Tipos de programa</h3>
        {groups.map(([group, label]) => (
          <div className="summary-line" key={group}>
            <span>{label}</span>
            <span>
              {
                active.filter((e) => categoryOf(e.category).group === group)
                  .length
              }
            </span>
          </div>
        ))}
      </section>
      <details className="summary-section expandable">
        <summary>Gastos por dia</summary>
        {days.map((d) => (
          <div className="summary-line" key={d}>
            <span>{formatDate(d)}</span>
            <span>
              {money(
                active
                  .filter((e) => e.date === d)
                  .reduce((s, e) => s + cost(e), 0),
                trip.currency,
              )}
            </span>
          </div>
        ))}
      </details>
      {(trip.description || trip.notes) && (
        <details className="summary-section expandable">
          <summary>Sobre a viagem</summary>
          <p>{trip.description}</p>
          <p className="muted">{trip.notes}</p>
          <p className="muted">
            {trip.travelerName} · {trip.country}
          </p>
        </details>
      )}
      <p className="footnote">
        Valores estimados para todas as pessoas informadas. Programas cancelados
        não entram nos totais.
      </p>
    </section>
  );
}
