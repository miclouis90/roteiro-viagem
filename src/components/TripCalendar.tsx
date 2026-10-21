import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { Trip, TripEvent } from "../types";
import { dateKey, formatDate, localDate } from "../utils/dates";
import { categoryOf } from "../data/categories";
import { occursOnDay } from "../utils/lodging";

export function TripCalendar({ trip, days, events, selectedDate, onDayChange, visible = true }: {
  trip: Trip;
  days: string[];
  events: TripEvent[];
  selectedDate: string;
  onDayChange: (date: string) => void;
  visible?: boolean;
}) {
  const [month, setMonth] = useState(() => selectedDate.slice(0, 7));
  const [expanded, setExpanded] = useState(false);
  const calendarId = useId();
  const selectedCard = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setMonth(selectedDate.slice(0, 7));
  }, [selectedDate]);
  useEffect(() => {
    if (!visible) return;
    const card = selectedCard.current;
    const strip = card?.parentElement;
    if (card && strip) strip.scrollTo?.({ left: card.offsetLeft - strip.offsetLeft });
  }, [selectedDate, visible]);
  const first = localDate(`${month}-01`);
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first.getDay() + count) / 7) * 7 }, (_, index) =>
    dateKey(new Date(first.getFullYear(), first.getMonth(), index - first.getDay() + 1, 12)));
  const title = formatDate(`${month}-01`, { month: "long", year: "numeric" });
  function changeMonth(delta: number) {
    setMonth(dateKey(new Date(first.getFullYear(), first.getMonth() + delta, 1, 12)).slice(0, 7));
  }
  return <div className="trip-calendar">
    <div className="itinerary-period">
      <span>{formatDate(trip.startDate).replace(" de ", " ")} – {formatDate(trip.endDate).replace(" de ", " ")}</span>
      <button type="button" className="itinerary-calendar-toggle" aria-expanded={expanded} aria-controls={calendarId} onClick={() => setExpanded(value => !value)}>
        Calendário<ChevronDown size={16} aria-hidden="true" />
      </button>
    </div>
    <section id={calendarId} hidden={!expanded} className="trip-month" aria-label="Calendário mensal da viagem">
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
          const dayEvents = events.filter(event => occursOnDay(event, date));
          const tones = [...new Set(dayEvents.map(event => categoryOf(event.category).tone))];
          return <button key={date} className={`month-date ${inMonth ? "" : "outside-month"} ${inTrip ? "in-trip" : ""} ${date === selectedDate ? "selected" : ""}`}
            aria-label={`${formatDate(date, { day: "numeric", month: "long", year: "numeric" })}${inTrip ? ", durante a viagem" : ""}${dayEvents.length ? `, ${dayEvents.length} ${dayEvents.length === 1 ? "programa" : "programas"}` : ""}`}
            aria-pressed={date === selectedDate} onClick={() => onDayChange(date)}>
            <span>{localDate(date).getDate()}</span>
            <span className="calendar-indicators" aria-hidden="true">{tones.slice(0, 3).map(tone => <i key={tone} className={`tone-${tone}`} />)}</span>
          </button>;
        })}
      </div>
    </section>
    <div className="itinerary-day-strip" role="group" aria-label="Dias da viagem">
      {days.map(date => {
        return <button type="button" key={date} ref={date === selectedDate ? selectedCard : undefined} className={`itinerary-day ${date === selectedDate ? "selected" : ""}`}
          aria-label={`Ver ${formatDate(date, { day: "numeric", month: "long" })}`} aria-pressed={date === selectedDate} onClick={() => onDayChange(date)}>
          <span>{formatDate(date, { weekday: "short" }).replace(".", "")}</span><strong>{localDate(date).getDate()}</strong>
        </button>;
      })}
    </div>
  </div>;
}
