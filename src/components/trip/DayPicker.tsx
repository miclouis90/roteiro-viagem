import { useEffect, useRef } from "react";
import { localDate, formatDate, dateKey } from "../../utils/dates";
import type { TripEvent } from "../../types";
export function DayPicker({
  days,
  selected,
  onChange,
  events,
}: {
  days: string[];
  selected: string;
  onChange: (d: string) => void;
  events: TripEvent[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current?.querySelector<HTMLElement>(
      '[aria-pressed="true"]',
    );
    if (node && ref.current)
      ref.current.scrollLeft = node.offsetLeft - ref.current.offsetLeft - 16;
  }, [selected]);
  return (
    <div className="day-picker" ref={ref} aria-label="Dias da viagem">
      {days.map((d) => (
        <button
          key={d}
          aria-label={formatDate(d, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          aria-pressed={selected === d}
          className={`${selected === d ? "active" : ""} ${d === dateKey() ? "is-today" : ""}`}
          onClick={() => onChange(d)}
        >
          <small>{formatDate(d, { weekday: "short" }).replace(".", "")}</small>
          <strong>{localDate(d).getDate()}</strong>
          <small>{formatDate(d, { month: "short" }).replace(".", "")}</small>
          <span className="day-indicator">
            {d === dateKey()
              ? "Hoje"
              : events.some((e) => e.date === d && e.status !== "cancelado")
                ? "•"
                : "Livre"}
          </span>
        </button>
      ))}
    </div>
  );
}
