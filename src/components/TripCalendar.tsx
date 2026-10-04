import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Trip, TripEvent } from "../types";
import { spendingLabel } from "../utils/spending";
import { dateKey, formatDate, localDate } from "../utils/dates";
import { categoryOf } from "../data/categories";

export function TripCalendar({ trip, days, events, selectedDate, onDayChange }: {
  trip: Trip;
  days: string[];
  events: TripEvent[];
  selectedDate: string;
  onDayChange: (date: string) => void;
}) {
  const [month, setMonth] = useState(() => selectedDate.slice(0, 7));
  const selectedCard = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setMonth(selectedDate.slice(0, 7));
    const card = selectedCard.current;
    const strip = card?.parentElement;
    if (card && strip) strip.scrollTo?.({ left: card.offsetLeft - strip.offsetLeft });
  }, [selectedDate]);
  const first = localDate(`${month}-01`);
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first.getDay() + count) / 7) * 7 }, (_, index) =>
    dateKey(new Date(first.getFullYear(), first.getMonth(), index - first.getDay() + 1, 12)));
  const title = formatDate(`${month}-01`, { month: "long", year: "numeric" });
  const brasilia = trip.destinationCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === "brasilia";
  function changeMonth(delta: number) {
    setMonth(dateKey(new Date(first.getFullYear(), first.getMonth() + delta, 1, 12)).slice(0, 7));
  }
  return <div className="trip-calendar">
    <section className="trip-month" aria-label="Calendário mensal da viagem">
      <header className="trip-month-header">
        <button className="icon-button" aria-label="Mês anterior" onClick={() => changeMonth(-1)}><ChevronLeft size={19} /></button>
        <h2 aria-live="polite">{title.charAt(0).toUpperCase() + title.slice(1)}</h2>
        <button className="icon-button" aria-label="Próximo mês" onClick={() => changeMonth(1)}><ChevronRight size={19} /></button>
        <span className="month-view-label">Mês</span>
      </header>
      <div className="trip-month-week" aria-hidden="true">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => <span key={day}>{day}</span>)}</div>
      <div className="trip-month-grid">
        {cells.map(date => {
          const inMonth = date.startsWith(month);
          const inTrip = date >= trip.startDate && date <= trip.endDate;
          const dayEvents = events.filter(event => event.date === date);
          const tones = [...new Set(dayEvents.map(event => categoryOf(event.category).tone))];
          return <button key={date} className={`month-date ${inMonth ? "" : "outside-month"} ${inTrip ? "in-trip" : ""} ${date === selectedDate ? "selected" : ""}`}
            aria-label={`${formatDate(date, { day: "numeric", month: "long", year: "numeric" })}${inTrip ? ", durante a viagem" : ""}${dayEvents.length ? `, ${dayEvents.length} ${dayEvents.length === 1 ? "programa" : "programas"}` : ""}`}
            aria-pressed={date === selectedDate} onClick={() => onDayChange(date)}>
            <span>{localDate(date).getDate()}</span>
            <span className="calendar-indicators" aria-hidden="true">{tones.slice(0, 3).map(tone => <i key={tone} className={`tone-${tone}`} />)}</span>
          </button>;
        })}
      </div>
      <p className="calendar-period">Sua viagem · {formatDate(trip.startDate)} — {formatDate(trip.endDate)}</p>
    </section>
    <div className={`calendar-day-strip ${brasilia ? "brasilia-days" : ""}`} aria-label="Dias da viagem">
      {days.map((date, index) => {
        const programs = events.filter(event => event.date === date);
        const count = programs.length;
        return <button key={date} ref={date === selectedDate ? selectedCard : undefined} className={`calendar-day-preview day-scene-${index % 5} ${date === selectedDate ? "selected" : ""}`}
          aria-label={`Ver ${formatDate(date, { day: "numeric", month: "long" })}`} aria-pressed={date === selectedDate} onClick={() => onDayChange(date)}>
          <span className="calendar-day-date"><small>{formatDate(date, { weekday: "short" }).replace(".", "")}</small><strong>{localDate(date).getDate()}</strong><small>{formatDate(date, { month: "short" }).replace(".", "")}</small></span>
          <span className="calendar-day-summary"><span className="calendar-day-count">{count} {count === 1 ? "programa" : "programas"}</span><span className="calendar-day-value">{spendingLabel(programs, trip.currency)}</span></span>
        </button>;
      })}
    </div>
  </div>;
}
