import { CalendarDays, ChevronRight, MapPin, Star } from "lucide-react";
import type { TripEvent } from "../../types";
import { categoryOf } from "../../data/categories";
import { formatDate } from "../../utils/dates";
import { eventPriceLabel } from "../../utils/eventPrice";
import { eventLabels } from "../../utils/labels";
import { CategoryChip } from "../ui/Primitives";
import { isLodging, lodgingPeriod } from "../../utils/lodging";

export function ExploreProgramCard({ event, currency, onSelect }: {
  event: TripEvent;
  currency: string;
  onSelect: (event: TripEvent) => void;
}) {
  const category = categoryOf(event.category), Icon = category.icon;
  return <button type="button" className={`explore-program tone-${category.tone} ${event.status === "cancelado" ? "cancelled" : ""}`} onClick={() => onSelect(event)}>
    <span className="explore-program-symbol" aria-hidden="true"><Icon size={22} strokeWidth={1.7} /></span>
    <span className="explore-program-copy">
      <strong>{event.title}</strong>
      <span className="explore-program-meta"><CategoryChip name={event.category} /><span className={`explore-status status-${event.status}`}>{eventLabels[event.status]}</span>{event.priority === "imperdível" && <span className="explore-priority"><Star size={12} aria-hidden="true" />Imperdível</span>}</span>
      <span className="explore-program-details">
        <span className="explore-program-date"><CalendarDays size={13} aria-hidden="true" />{isLodging(event)
          ? <span>{lodgingPeriod(event)}{event.startTime && ` · Check-in ${event.startTime}`}</span>
          : <><time dateTime={event.date}>{formatDate(event.date, { day: "numeric", month: "short", year: "numeric" })}</time><span>· {event.startTime || "Horário a definir"}{event.endTime && `–${event.endTime}`}</span></>}</span>
        <span className="explore-program-price">{eventPriceLabel(event, currency)}</span>
      </span>
      <span className="explore-program-location" title={event.location || "Local a definir"}><MapPin size={13} aria-hidden="true" />{event.location || "Local a definir"}</span>
    </span>
    <ChevronRight className="explore-program-arrow" size={16} aria-hidden="true" />
  </button>;
}
