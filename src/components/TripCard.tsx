import { Link } from "react-router-dom";
import { Compass, ArrowUpRight, CalendarDays, MapPin, MoreHorizontal, ChevronRight } from "lucide-react";
import type { Trip } from "../types";
import { dateKey, daysBetween, formatDate } from "../utils/dates";
import { dayCountLabel, tripLabels } from "../utils/labels";
import { themeStyle } from "../data/themes";
export function TripCard({ trip, compact = false }: { trip: Trip; compact?: boolean }) {
  const remaining = daysBetween(dateKey(), trip.startDate) - 1;
  const isBrasilia = trip.destinationCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === "brasilia";
  const destination = `${trip.destinationCity}${trip.destinationState ? ` · ${trip.destinationState}` : ""}`;
  const tripUrl = `/viagem/${trip.id}`;

  return (
    <article className={`home-trip theme-trip ${compact ? "home-trip-row" : "home-trip-upcoming"} ${isBrasilia ? "home-destination-brasilia" : "home-destination-abstract"}`} style={themeStyle(trip.theme) as React.CSSProperties}>
      <Link to={tripUrl} className="home-trip-link" aria-label={`Abrir viagem ${trip.title}`}>
        <div className="home-trip-art" aria-hidden="true">
          {!isBrasilia && <svg className="home-destination-graphic" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
            <circle className="home-graphic-sun" cx="300" cy="80" r="54" />
            <path className="home-graphic-ridge" d="M-30 205Q55 82 136 176T295 138T445 164V320H-30Z" />
            <path className="home-graphic-water" d="M-20 249Q112 190 237 239T430 209V320H-20Z" />
            <path className="home-graphic-route" d="M55 208C124 75 252 252 343 103" />
            <circle className="home-graphic-point" cx="55" cy="208" r="5" />
            <circle className="home-graphic-point" cx="343" cy="103" r="5" />
          </svg>}
        </div>
        {!compact && <span className={`home-cover-status status-${trip.status}`}><Compass size={19} aria-hidden="true" />{tripLabels[trip.status]}</span>}
        <div className="home-trip-copy">
          <h3>{trip.title}</h3>
          <p className="home-trip-destination"><MapPin size={15} aria-hidden="true" />{destination}</p>
          <div className="home-trip-bottom">
            <p className="home-trip-period"><CalendarDays size={15} aria-hidden="true" /><span>{formatDate(trip.startDate)} — {formatDate(trip.endDate)}<span className="home-trip-duration"> · {dayCountLabel(daysBetween(trip.startDate, trip.endDate))}</span></span></p>
            {compact ? <span className={`status-chip status-${trip.status}`}>{tripLabels[trip.status]}</span> : remaining > 0 ? <span className="home-trip-countdown"><CalendarDays size={20} aria-hidden="true" /><span>{remaining === 1 ? "Falta" : "Faltam"}<strong>{remaining} {remaining === 1 ? "dia" : "dias"}</strong></span><ChevronRight size={18} aria-hidden="true" /></span> : <ChevronRight className="home-trip-open" size={22} aria-hidden="true" />}
          </div>
        </div>
        {compact && <ArrowUpRight className="home-trip-open" size={18} aria-hidden="true" />}
      </Link>
      <details className="context-menu home-trip-menu" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open = false; }} onKeyDown={e => { if (e.key === "Escape") { e.currentTarget.open = false; e.currentTarget.querySelector("summary")?.focus(); } }}>
        <summary aria-label={`Opções da viagem ${trip.title}`}><MoreHorizontal size={20} aria-hidden="true" /></summary>
        <div className="menu-popover">
          <Link to={tripUrl}><Compass size={16} aria-hidden="true" />Ver viagem</Link>
          <Link to={`${tripUrl}?tab=roteiro`}><CalendarDays size={16} aria-hidden="true" />Ver roteiro</Link>
        </div>
      </details>
    </article>
  );
}
