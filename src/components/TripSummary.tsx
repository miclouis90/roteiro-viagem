import type { Trip, TripEvent } from "../types";
import { cost, money } from "../utils/money";
import { formatDate } from "../utils/dates";

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
    <section className="summary">
      <h2>A viagem em números</h2>
      <div className="summary-grid">
        <div>
          <small>Atividades gratuitas</small>
          <strong>{active.filter((e) => e.isFree).length}</strong>
        </div>
        <div>
          <small>Atividades pagas</small>
          <strong>{active.filter((e) => !e.isFree).length}</strong>
        </div>
        <div>
          <small>Média diária</small>
          <strong>{money(total / count, trip.currency)}</strong>
        </div>
        <div>
          <small>Total estimado</small>
          <strong>{money(total, trip.currency)}</strong>
        </div>
      </div>
      <h3>Custos por dia</h3>
      {days.map((d) => (
        <div className="budget-row" key={d}>
          <span>{formatDate(d)}</span>
          <strong>
            {money(
              active
                .filter((e) => e.date === d)
                .reduce((s, e) => s + cost(e), 0),
              trip.currency,
            )}
          </strong>
        </div>
      ))}
      <p className="muted">
        Estimativa das atividades para todas as pessoas informadas. Programas
        cancelados não entram nos totais.
      </p>
    </section>
  );
}
