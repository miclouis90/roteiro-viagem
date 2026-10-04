import { useState } from "react";
import type { Trip, TripEvent } from "../types";
import { Wallet, CircleHelp, CheckCircle2, Gift, Info, CalendarDays, List, Banknote, ChartNoAxesColumnIncreasing, ChevronRight } from "lucide-react";
import { money } from "../utils/money";
import { spending, spendingLabel } from "../utils/spending";
import { formatDate } from "../utils/dates";
import { categoryOf, categoryGroups } from "../data/categories";

const ringLength = 2 * Math.PI * 48;

export function TripSummary({ trip, events, days, count, onCalendar }: {
  trip: Trip;
  events: TripEvent[];
  days: string[];
  count: number;
  onCalendar?: () => void;
}) {
  const [distribution, setDistribution] = useState<"values" | "programs">("values");
  const estimate = spending(events);
  const active = events.filter(event => event.status !== "cancelado");
  const average = estimate.total / Math.max(1, count);
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
      </header>
      <div className="expense-distribution">
        <div className="expense-chart-column">
          <div className="expense-donut">
            <svg viewBox="0 0 120 120" role="img" aria-label={distribution === "values" ? "Distribuição do total definido por categoria" : "Distribuição dos programas por categoria"}>
              <circle className="expense-donut-track" cx="60" cy="60" r="48" fill="none" strokeWidth="16" />
              <g transform="rotate(-90 60 60)">{arcs.filter(group => group.fraction > 0).map(group => <circle key={group.id} className={`expense-donut-segment tone-${group.tone}`} cx="60" cy="60" r="48" fill="none" strokeWidth="16" strokeDasharray={`${Math.max(0, group.fraction * ringLength - 1.5)} ${ringLength}`} strokeDashoffset={-group.start} />)}</g>
            </svg>
            <div className="expense-donut-center" aria-live="polite">
              <strong>{distribution === "programs" ? active.length : estimate.total > 0 ? money(estimate.total, trip.currency) : spendingLabel(events, trip.currency)}</strong>
              <span>{distribution === "programs" ? "programas" : estimate.undefinedCount ? "Total já definido" : "Total estimado"}</span>
            </div>
          </div>
          <div className="expense-distribution-toggle" role="group" aria-label="Distribuição por">
            <button aria-pressed={distribution === "values"} onClick={() => setDistribution("values")}>Valores</button>
            <button aria-pressed={distribution === "programs"} onClick={() => setDistribution("programs")}>Programas</button>
          </div>
        </div>
        <div className="expense-category-list">
          {arcs.map(({ id, label, tone, icon: Icon, values, estimate: group, fraction }) => <div className={`expense-category-row tone-${tone}`} key={id}>
            <span className="expense-category-icon"><Icon size={17} aria-hidden="true" /></span>
            <div className="expense-category-detail">
              <div className="expense-category-line">
                <span className="expense-category-name">{label}</span>
                <span className="expense-percent" aria-label={distribution === "values" && !group.total && group.undefinedCount ? "Sem estimativa definida" : `${Math.round(fraction * 100)}% ${distribution === "values" ? "do total definido" : "dos programas"}`}>{distribution === "values" && !group.total && group.undefinedCount ? "—" : `${Math.round(fraction * 100)}%`}</span>
                <strong aria-label={distribution === "programs" ? `${values.length} ${values.length === 1 ? "programa" : "programas"}` : undefined}>{distribution === "programs" ? values.length : group.total > 0 ? money(group.total, trip.currency) : spendingLabel(values, trip.currency)}</strong>
              </div>
              <div className="expense-category-meta">
                <div className="expense-track" aria-hidden="true"><span style={{ width: `${fraction * 100}%` }} /></div>
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
        {onCalendar && <button className="expense-calendar-link" onClick={onCalendar}>Ver calendário<ChevronRight size={15} aria-hidden="true" /></button>}
      </header>
      <div className="expense-day-carousel" role="region" aria-label="Estimativas dos dias da viagem" tabIndex={0}>
        {days.map((day, index) => {
          const programs = active.filter(event => event.date === day);
          const daily = spending(programs);
          return <article className="expense-day" key={day}>
            <div className={`expense-day-art expense-scene-${index % 5}`} aria-hidden="true" />
            <h3><span>{formatDate(day, { weekday: "short" }).replace(".", "")}</span><b>{formatDate(day, { day: "numeric" })}</b><span>{formatDate(day, { month: "short" }).replace(".", "")}</span></h3>
            <div className="expense-day-value">
              <strong>{daily.total > 0 ? money(daily.total, trip.currency) : spendingLabel(programs, trip.currency)}</strong>
              <span>{programs.length} {programs.length === 1 ? "programa" : "programas"}</span>
              {daily.undefinedCount > 0 && <span className="expense-undefined">{daily.undefinedCount} sem estimativa</span>}
            </div>
          </article>;
        })}
      </div>
    </section>

    <section className="expense-recap" aria-labelledby="expense-recap-title">
      <header className="expense-recap-heading">
        <span className="expense-recap-icon"><ChartNoAxesColumnIncreasing size={22} aria-hidden="true" /></span>
        <div><h2 id="expense-recap-title">Resumo da viagem</h2><p>Comparativo e insights do seu planejamento.</p></div>
      </header>
      <dl className="expense-recap-stats">
        <div><dt><CalendarDays size={13} aria-hidden="true" />{count === 1 ? "dia" : "dias"}</dt><dd>{count}</dd></div>
        <div><dt><List size={13} aria-hidden="true" />{estimate.count === 1 ? "programa" : "programas"}</dt><dd>{estimate.count}</dd></div>
        <div><dt><Banknote size={13} aria-hidden="true" />{estimate.undefinedCount ? "média parcial por dia" : "média por dia"}</dt><dd>{estimate.total > 0 ? money(average, trip.currency) : spendingLabel(events, trip.currency)}</dd></div>
        <div><dt><Gift size={13} aria-hidden="true" />grátis</dt><dd>{estimate.freeCount}</dd></div>
      </dl>
    </section>

    <p className="footnote"><Info size={18} aria-hidden="true" /><span>Estimativas para todas as pessoas informadas. Programas cancelados não entram no total. Você pode ajustar os valores na ficha de cada programa.</span></p>
  </section>;
}
