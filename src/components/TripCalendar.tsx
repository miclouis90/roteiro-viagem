import type { Trip, TripEvent } from "../types";
import { cost, money } from "../utils/money";
import { formatDate, localDate } from "../utils/dates";
import { categoryOf } from "../data/categories";

export function TripCalendar({
  trip,
  active,
  days,
  filtered,
  setDetails,
}: {
  trip: Trip;
  active: TripEvent[];
  days: string[];
  filtered: TripEvent[];
  setDetails: (e: TripEvent) => void;
}) {
  return (
    <div className="calendar-grid">
      {days.map((d) => (
        <div className="calendar-day" key={d}>
          <small>{formatDate(d, { weekday: "short", month: "short" })}</small>
          <strong>{localDate(d).getDate()}</strong>
          {filtered
            .filter((e) => e.date === d)
            .map((e) => (
              <button
                key={e.id}
                onClick={() => setDetails(e)}
                className={categoryOf(e.category).group}
              >
                {e.startTime} {categoryOf(e.category).icon}
                <b>{e.title}</b>
              </button>
            ))}
          <small>
            {money(
              active
                .filter((e) => e.date === d)
                .reduce((s, e) => s + cost(e), 0),
              trip.currency,
            )}
          </small>
        </div>
      ))}
    </div>
  );
}
