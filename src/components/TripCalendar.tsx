import type { Trip, TripEvent } from "../types";
import { cost, money } from "../utils/money";
import { formatDate, localDate } from "../utils/dates";
import { CategoryChip } from "./ui/Primitives";
export function TripCalendar({
  trip,
  days,
  filtered,
  setDetails,
}: {
  trip: Trip;
  days: string[];
  filtered: TripEvent[];
  setDetails: (e: TripEvent) => void;
}) {
  return (
    <div className="calendar-grid">
      {days.map((d) => (
        <section key={d} className="calendar-day">
          <header>
            <span>{formatDate(d, { weekday: "short", month: "short" })}</span>
            <strong>{localDate(d).getDate()}</strong>
          </header>
          {filtered
            .filter((e) => e.date === d)
            .map((e) => (
              <button key={e.id} onClick={() => setDetails(e)}>
                <span>{e.startTime}</span>
                <strong>{e.title}</strong>
                <CategoryChip name={e.category} />
              </button>
            ))}
          <small>
            {money(
              filtered
                .filter((e) => e.date === d)
                .reduce((s, e) => s + cost(e), 0),
              trip.currency,
            )}
          </small>
        </section>
      ))}
    </div>
  );
}
