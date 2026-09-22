import type { Trip, TripEvent } from "../../types";
import { tripOverview } from "../../utils/overview";

import { dayCountLabel } from "../../utils/labels";

export function JourneyMoment({
  trip,
  events,
  now,
}: {
  trip: Trip;
  events: TripEvent[];
  now: Date;
}) {
  const view = tripOverview(trip, events, now);
  return (
    <div className="journey-moment">
      <p className="journey-countdown">
        {view.phase === "before"
          ? `Falta${view.remainingDays === 1 ? "" : "m"} ${dayCountLabel(view.remainingDays)}.`
          : view.phase === "during"
            ? `Dia ${view.dayNumber} de ${view.days.length}.`
            : `${trip.destinationCity} ficou na memória.`}
      </p>
      <div className="route-motif" aria-hidden="true">
        <i />
        <span />
        <i />
        <span />
        <i />
      </div>
      {view.phase === "during" && (
        <p className="journey-copy">
          {now.getHours() < 12
            ? "Bom dia"
            : now.getHours() < 18
              ? "Boa tarde"
              : "Boa noite"}
          .{" "}
          {view.todayEvents.length
            ? `Hoje tem ${view.todayEvents.length} programa${view.todayEvents.length === 1 ? "" : "s"}.`
            : "Hoje está livre. Aproveite no seu ritmo."}
        </p>
      )}
    </div>
  );
}
