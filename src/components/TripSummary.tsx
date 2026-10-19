import { useState } from "react";
import type { Trip, TripEvent } from "../types";
import { Wallet, CircleHelp, CheckCircle2, Gift, Info } from "lucide-react";
import { money } from "../utils/money";
import { spending, spendingLabel } from "../utils/spending";
import { formatDate } from "../utils/dates";
import { categoryOf, categoryGroups } from "../data/categories";

const ringLength = 2 * Math.PI * 48;

export function TripSummary({ trip, events, days, count, onDay }: {
  trip: Trip;
  events: TripEvent[];
  days: string[];
  count: number;
  onDay?: (date: string) => void;
}) {
  const [distribution, setDistribution] = useState<"values" | "programs">("values");
  const estimate = spending(events);
  const active = events.filter(event => event.status !== "cancelado");
  const average = estimate.total / Math.max(1, count);
  const definedPercent = estimate.count ? Math.round((estimate.count - estimate.undefinedCount) / estimate.count * 100) : 0;
  const dailyEstimates = days.map(day => {
    const programs = active.filter(event => event.date === day);
    return { day, programs, daily: spending(programs) };
  });
  const largestDaily = Math.max(0, ...dailyEstimates.map(({ daily }) => daily.total));
  const peakDay = largestDaily > 0 ? dailyEstimates.find(({ daily }) => daily.total === largestDaily)?.day : undefined;
  const isBrasilia = trip.destinationCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === "brasilia";
  const groups = categoryGroups.map(category => {
    const values = active.filter(event => categoryOf(event.category).group === category.id);
    return { ...category, values, estimate: spending(values) };
  }).filter(group => group.values.length > 0);
  const denominator = distribution === "values" ? estimate.total : active.length;
  let offset = 0;
  const arcs = groups.map(group => {
    const amount = distribution === "values" ? group.estimate.total : group.values.length;
    const fraction = denominator > 0 ? amount / denominator : 0;
    const start = offset;
    offset += fraction * ringLength;
    return { ...group, fraction, start };
  });

  return <section className={`trip-summary expenses-v2${isBrasilia ? " expenses-brasilia" : ""}`}>
    <section className="expense-hero">
      <div className="expense-hero-art" aria-hidden="true" />
      <div className="expense-hero-heading">
        <span className="eyebrow">Total estimado da viagem</span>
        <span className="expense-wallet"><Wallet size={22} aria-hidden="true" /></span>
      </div>
      <p className="summary-amount">{estimate.total > 0 ? money(estimate.total, trip.currency) : spendingLabel(events, trip.currency)}</p>
      {estimate.undefinedCount > 0 && estimate.total > 0 && <span className="expense-known">Total já definido</span>}
      <p className="expense-average">{estimate.total > 0 ? `${money(average, trip.currency)} por dia${estimate.undefinedCount ? " · média parcial" : ""}` : "Seus planos, no seu ritmo."}</p>
      <div className="expense-pills">
        <span><CheckCircle2 size={15} aria-hidden="true" />{estimate.count - estimate.undefinedCount} com valor definido</span>
        <span><Gift size={15} aria-hidden="true" />{estimate.freeCount} grátis</span>
      </div>
      {estimate.undefinedCount > 0 && <div className="expense-pending">
        <CircleHelp size={15} aria-hidden="true" />
        <p><strong>{estimate.undefinedCount} {estimate.undefinedCount === 1 ? "programa ainda sem estimativa" : "programas ainda sem estimativa"}</strong><span>O total considera apenas as estimativas conhecidas.</span></p>
      </div>}
    </section>

    <section className="expense-categories" aria-labelledby="expense-categories-title">
      <header className="expense-section-heading">
        <div><h2 id="expense-categories-title">Distribuição por categoria</h2><p>Uma visão do seu planejamento.</p></div>
        <div className="expense-distribution-toggle" role="group" aria-label="Distribuição por">
          <button aria-pressed={distribution === "values"} onClick={() => setDistribution("values")}>Valores</button>
          <button aria-pressed={distribution === "programs"} onClick={() => setDistribution("programs")}>Programas</button>
        </div>
      </header>
      <div className="expense-distribution">
        <div className="expense-chart-column">
          <div className="expense-donut">
            <svg viewBox="0 0 120 120" role="img" aria-label={distribution === "values" ? "Distribuição do total definido por categoria" : "Distribuição dos programas por categoria"}>
              <circle className="expense-donut-track" cx="60" cy="60" r="48" fill="none" strokeWidth="16" />
              <g transform="rotate(-90 60 60)">{arcs.filter(group => group.fraction > 0).map(group => <circle key={group.id} className={`expense-donut-segment tone-${group.tone}`} cx="60" cy="60" r="48" fill="none" strokeWidth="16" strokeDasharray={`${Math.max(0, group.fraction * ringLength - 1.5)} ${ringLength}`} strokeDashoffset={-group.start} />)}</g>
            </svg>
            <div className="expense-donut-center" aria-live="polite" aria-label={distribution === "values" && estimate.count ? `${definedPercent}% dos programas com valor definido` : undefined}>
              <strong>{distribution === "programs" ? active.length : estimate.count ? `${definedPercent}%` : "—"}</strong>
              <span>{distribution === "programs" ? "programas" : estimate.count ? "definidos" : "sem planos"}</span>
            </div>
          </div>
        </div>
        <div className="expense-category-list">
          {arcs.map(({ id, label, tone, icon: Icon, values, estimate: group, fraction }) => <div className={`expense-category-row tone-${tone}`} key={id}>
            <span className="expense-category-icon"><Icon size={17} aria-hidden="true" /></span>
            <div className="expense-category-detail">
              <div className="expense-category-line">
                <span className="expense-category-name">{label}</span>
                <strong aria-label={distribution === "programs" ? `${values.length} ${values.length === 1 ? "programa" : "programas"}` : undefined}>{distribution === "programs" ? values.length : group.total > 0 ? money(group.total, trip.currency) : spendingLabel(values, trip.currency)}</strong>
              </div>
              <div className="expense-category-meta">
                <div className="expense-track" aria-hidden="true"><span style={{ width: `${fraction * 100}%` }} /></div>
                <span className="expense-percent" aria-label={distribution === "values" && !group.total && group.undefinedCount ? "Sem estimativa definida" : `${Math.round(fraction * 100)}% ${distribution === "values" ? "do total definido" : "dos programas"}`}>{distribution === "values" && !group.total && group.undefinedCount ? "—" : `${Math.round(fraction * 100)}%`}</span>
              </div>
              {group.undefinedCount > 0 && <span className="expense-undefined">+ {group.undefinedCount} sem estimativa</span>}
            </div>
          </div>)}
          {!active.length && <p className="expense-empty">Os valores aparecem aqui conforme você adiciona programas ao roteiro.</p>}
        </div>
      </div>
    </section>

    <section className="expense-by-day" aria-labelledby="expense-days-title">
      <header className="expense-section-heading">
        <h2 id="expense-days-title">Estimativa por dia</h2>
      </header>
      <div className="expense-day-comparison" role="region" aria-label="Estimativas dos dias da viagem">
        {dailyEstimates.map(({ day, programs, daily }) => {
          const proportion = largestDaily > 0 ? daily.total / largestDaily * 100 : 0;
          return <article className="expense-day" key={day} data-highest={day === peakDay || undefined}>
            <button type="button" className="expense-day-open" disabled={!onDay} onClick={() => onDay?.(day)} aria-label={`Abrir Roteiro em ${formatDate(day, { day: "numeric", month: "long", year: "numeric" })}`}>
            <span className="expense-day-date"><time dateTime={day}>{formatDate(day, { weekday: "short", day: "numeric", month: "short" }).replace(" de ", " ")}</time></span>
            <span className="expense-day-value">
              <strong>{daily.total > 0 ? money(daily.total, trip.currency) : spendingLabel(programs, trip.currency)}</strong>
              <span>{programs.length} {programs.length === 1 ? "programa" : "programas"}</span>
              {daily.undefinedCount > 0 && <span className="expense-undefined">{daily.undefinedCount} sem estimativa</span>}
            </span>
            <span className="expense-day-bar" aria-hidden="true"><span style={{ width: `${proportion}%` }} /></span>
            {day === peakDay && <span className="expense-day-peak">Maior estimativa</span>}
            </button>
          </article>;
        })}
      </div>
    </section>

    <p className="footnote"><Info size={18} aria-hidden="true" /><span>Estimativas para todas as pessoas informadas. Programas cancelados não entram no total. Você pode ajustar os valores na ficha de cada programa.</span></p>
  </section>;
}
