import { useId, useMemo, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { agendaMonth, isAgendaDate, shiftAgendaMonth, validAgendaPeriods, type AgendaPeriod, type AgendaPoint, type AgendaMonthChange } from "../../utils/agenda";
import { dateKey, formatDate, localDate } from "../../utils/dates";

const noPoints: readonly AgendaPoint[] = [];
export function PeriodCalendar({ periods, points = noPoints, month, selectedDate, onMonthChange, onSelect, onOpen, onOpenPoint, labels = { singular: "período", plural: "períodos", legend: "Períodos completos" } }: {
  periods: readonly AgendaPeriod[];
  points?: readonly AgendaPoint[];
  month: string;
  selectedDate: string;
  onMonthChange: (month: AgendaMonthChange) => void;
  onSelect: (date: string) => void;
  onOpen: (period: AgendaPeriod) => void;
  onOpenPoint?: (point: AgendaPoint) => void;
  labels?: { singular: string; plural: string; legend: string };
}) {
  const titleId = useId();
  const today = dateKey();
  const year = Number(month.slice(0, 4));
  const entries = useMemo(() => validAgendaPeriods(periods), [periods]);
  const weeks = useMemo(() => agendaMonth(entries, month, points), [entries, month, points]);
  const years = [...new Set([
    Number(today.slice(0, 4)),
    ...Array.from({ length: 11 }, (_, index) => year - 5 + index),
    ...entries.flatMap(period => [Number(period.startDate.slice(0, 4)), Number(period.endDate.slice(0, 4))]),
    ...points.map(point => Number(point.date.slice(0, 4))),
  ])].filter(value => value >= 1000 && value <= 9999).sort((a, b) => a - b);

  return <section className="period-calendar" aria-labelledby={titleId}>
    <h2 id={titleId} className="sr-only" aria-live="polite">{formatDate(`${month}-01`, { month: "long", year: "numeric" })}</h2>
    <header className="agenda-calendar-toolbar">
      <button type="button" className="icon-button" aria-label="Mês anterior da agenda" disabled={month === "1000-01"} onClick={() => onMonthChange(current => shiftAgendaMonth(current, -1))}><ChevronLeft size={20} aria-hidden="true" /></button>
      <div className="agenda-month-selectors">
        <label><span className="sr-only">Mês da agenda</span><select aria-label="Mês da agenda" value={month.slice(5, 7)} onChange={event => { const value = event.target.value; onMonthChange(current => `${current.slice(0, 4)}-${value}`); }}>
          {Array.from({ length: 12 }, (_, index) => {
            const key = String(index + 1).padStart(2, "0");
            return <option key={key} value={key}>{formatDate(`2026-${key}-01`, { month: "long" })}</option>;
          })}
        </select></label>
        <label><span className="sr-only">Ano da agenda</span><select aria-label="Ano da agenda" value={year} onChange={event => { const value = event.target.value.padStart(4, "0"); onMonthChange(current => `${value}-${current.slice(5, 7)}`); }}>
          {years.map(value => <option key={value} value={value}>{value}</option>)}
        </select></label>
      </div>
      <button type="button" className="icon-button" aria-label="Próximo mês da agenda" disabled={month === "9999-12"} onClick={() => onMonthChange(current => shiftAgendaMonth(current, 1))}><ChevronRight size={20} aria-hidden="true" /></button>
    </header>
    <div className="agenda-weekdays" aria-hidden="true">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => <span key={day}>{day}</span>)}</div>
    <div className="agenda-weeks">
      {weeks.map(week => <div className="agenda-week" key={week.dates[0]}>
        <div className="agenda-dates">
          {week.dates.map((date, column) => {
            const count = week.counts[column], eventCount = week.points[column].length, total = count + eventCount;
            return <button type="button" key={date} data-date={date} data-event-count={eventCount} className={`agenda-date ${date.startsWith(month) ? "" : "outside-month"} ${count ? "has-period" : ""} ${eventCount ? "has-point" : ""} ${date === selectedDate ? "selected" : ""}`}
              aria-label={`${formatDate(date, { day: "numeric", month: "long", year: "numeric" })}, ${count} ${count === 1 ? labels.singular : labels.plural}${eventCount ? ` e ${eventCount} ${eventCount === 1 ? "evento" : "eventos"}` : ""}`} disabled={!isAgendaDate(date)}
              aria-pressed={date === selectedDate} aria-current={date === today ? "date" : undefined} onClick={() => onSelect(date)}>
              <span>{localDate(date).getDate()}</span>{eventCount > 0 && <i className="agenda-point-dot" aria-hidden="true" />}{total > 1 && <small className="agenda-date-total" aria-hidden="true">{total > 99 ? "99+" : total}</small>}
            </button>;
          })}
        </div>
        {week.lanes > 0 && <div className="agenda-periods">
          {week.segments.filter(segment => segment.lane < 2).map(segment => <button type="button" key={segment.period.id} data-period={segment.period.id}
            className={`agenda-period ${segment.continuesBefore ? "continues-before" : ""} ${segment.continuesAfter ? "continues-after" : ""}`}
            style={{ gridColumn: `${segment.start + 1} / ${segment.end + 2}`, gridRow: segment.lane + 1, "--period-ink": segment.period.color || "var(--brand-700)", "--period-surface": segment.period.surface || "var(--brand-100)" } as CSSProperties}
            aria-label={`Abrir ${segment.period.title}, ${formatDate(segment.period.startDate, { day: "numeric", month: "long", year: "numeric" })} a ${formatDate(segment.period.endDate, { day: "numeric", month: "long", year: "numeric" })}`}
            title={segment.period.title} onClick={() => onOpen(segment.period)}><span>{segment.period.title}</span></button>)}
        </div>}
        {week.points.some(day => day.length > 0) && <div className="agenda-point-days">{week.points.map((day, column) => {
          const first = day[0];
          return <div className="agenda-point-day" key={week.dates[column]}>{first && <>
            <button type="button" className="agenda-point-preview" data-event-point={first.id} title={`${first.time} · ${first.title}`} aria-label={`Abrir evento ${first.title}, ${first.time}`} onClick={() => onOpenPoint?.(first)}><span className="agenda-point-time">{first.time}</span><span className="agenda-point-title">{first.title}</span></button>
            {day.length > 1 && <button type="button" className="agenda-point-more" aria-label={`Ver todos os ${day.length} eventos em ${formatDate(week.dates[column], { day: "numeric", month: "long" })}`} onClick={() => onSelect(week.dates[column])}>{day.length > 100 ? "99+" : `+${day.length - 1}`}</button>}
          </>}</div>;
        })}</div>}
      </div>)}
    </div>
    <footer className="agenda-calendar-footer"><span><i aria-hidden="true" />{labels.legend}</span><button type="button" className="ghost" onClick={() => onSelect(today)}>Hoje</button></footer>
    {weeks.some(week => week.lanes > 2) && <p className="agenda-overflow-note">Períodos resumidos. Selecione uma data para ver todas as viagens e eventos.</p>}
  </section>;
}
