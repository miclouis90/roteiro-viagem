import type { CSSProperties } from "react";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { personalEventVisuals } from "../../data/personalEventCategories";
import { personalEventPrice, type PersonalEvent } from "../../utils/personalEvents";
import { formatDate } from "../../utils/dates";
import "./personal-events.css";

export function PersonalEventCard({ event, onOpen }: { event: PersonalEvent; onOpen: () => void }) {
  const visual = personalEventVisuals[event.category], Icon = visual.icon;
  return <button type="button" className="personal-event-card" aria-label={`Ver evento ${event.title}`} onClick={onOpen} style={{ "--event-ink": `var(--color-${visual.tone}-ink)`, "--event-surface": `var(--color-${visual.tone}-bg)` } as CSSProperties}>
    <span className="personal-event-symbol"><Icon size={24} aria-hidden="true" /></span>
    <span className="personal-event-copy"><span className="personal-event-category">{visual.label}</span><strong>{event.title}</strong><span className="personal-event-when"><CalendarDays size={14} aria-hidden="true" />{formatDate(event.date, { day: "numeric", month: "short", year: "numeric" })} · {event.startTime}</span><span className="personal-event-address"><MapPin size={14} aria-hidden="true" />{event.location} · {event.city}</span>{event.priceCents !== undefined && <span className="personal-event-cost">{personalEventPrice(event.priceCents)}</span>}</span><ChevronRight size={17} aria-hidden="true" />
  </button>;
}
