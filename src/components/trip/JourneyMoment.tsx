import { ArrowRight } from "lucide-react";
import type { Trip, TripEvent } from "../../types";
import { tripOverview } from "../../utils/overview";
import { collectPlaces } from "../../utils/places";
import { dayCountLabel } from "../../utils/labels";
import { Button } from "../ui/Primitives";
export function JourneyMoment({
  trip,
  events,
  now,
  onDay,
}: {
  trip: Trip;
  events: TripEvent[];
  now: Date;
  onDay: (date: string) => void;
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
      <p className="journey-copy">
        {view.phase === "during"
          ? `${now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite"}. ${view.todayEvents.length ? `Hoje tem ${view.todayEvents.length} programa${view.todayEvents.length === 1 ? "" : "s"}.` : "Hoje está livre. Aproveite no seu ritmo."}`
          : `${view.active.length} programas · ${dayCountLabel(view.days.length)}${view.phase === "after" ? ` · ${collectPlaces(view.active).length} lugares` : " para descobrir"}`}
      </p>
      <Button
        variant="secondary"
        onClick={() =>
          onDay(view.phase === "during" ? view.today : trip.startDate)
        }
      >
        {view.phase === "before"
          ? "Ver primeiro dia"
          : view.phase === "during"
            ? "Ver dia completo"
            : "Rever roteiro"}
        <ArrowRight size={16} />
      </Button>
    </div>
  );
}
