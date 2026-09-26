import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Trip } from "../types";
import { dateKey, localDate } from "../utils/dates";
export function HomeCalendar({ trips, selected, onSelect, onClear }: { trips: readonly Trip[]; selected: string; onSelect: (day: string) => void; onClear: () => void }) {
  const [month, setMonth] = useState(() => { const date = selected ? localDate(selected) : new Date(); return new Date(date.getFullYear(), date.getMonth(), 1, 12); });
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const title = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return <div className="home-date-calendar">
    <div className="home-calendar-month"><button className="icon-button" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1, 12))}><ChevronLeft size={20}/></button><strong aria-live="polite">{title.charAt(0).toLocaleUpperCase("pt-BR") + title.slice(1)}</strong><button className="icon-button" aria-label="Próximo mês" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1, 12))}><ChevronRight size={20}/></button></div>
    <div className="home-calendar-week" aria-hidden="true">{["D","S","T","Q","Q","S","S"].map((day,i) => <span key={i}>{day}</span>)}</div>
    <div className="home-calendar-days" role="group" aria-label={title}>
      {Array.from({length:month.getDay()},(_,i) => <span key={`blank-${i}`} />)}
      {Array.from({length:days},(_,i) => { const day = dateKey(new Date(month.getFullYear(),month.getMonth(),i+1,12)); const hasTrip = trips.some(t => t.startDate <= day && day <= t.endDate); return <button key={day} aria-label={`${localDate(day).toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"})}${hasTrip ? ", com viagem" : ""}`} aria-pressed={selected === day} aria-current={day === dateKey() ? "date" : undefined} className={selected === day ? "selected" : ""} onClick={() => onSelect(day)}>{i+1}{hasTrip && <i aria-hidden="true" />}</button>; })}
    </div>
    <p className="home-calendar-legend"><i aria-hidden="true"/> Dias com viagem</p>
    {selected && <button className="ghost" onClick={onClear}>Limpar data</button>}
  </div>;
}
