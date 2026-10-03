import { Link } from "react-router-dom";
import { Compass, ArrowUpRight } from "lucide-react";
import type { Trip } from "../types";
import { dateKey, daysBetween, formatDate } from "../utils/dates";
import { dayCountLabel, tripLabels } from "../utils/labels";
import { themeStyle } from "../data/themes";
export function TripCard({ trip, compact = false }: { trip: Trip; compact?: boolean }) {
  const remaining = daysBetween(dateKey(), trip.startDate) - 1;
  return <Link to={`/viagem/${trip.id}`} className={`home-trip theme-trip ${compact ? "home-trip-row" : "home-trip-upcoming"}`} style={themeStyle(trip.theme) as React.CSSProperties}>
    <div className="home-trip-art" aria-hidden="true"><div className="home-art-orbit" /><Compass size={28} strokeWidth={1.4} /><div className="cover-route"><i /><i /><i /></div><span className="home-art-horizon" /></div>
    <div className="home-trip-copy">
      <div className="home-trip-heading"><h3>{trip.title}</h3><ArrowUpRight size={19} aria-hidden="true" /></div>
      <p>{trip.destinationCity}{trip.destinationState && ` · ${trip.destinationState}`}</p>
      <p className="home-trip-period">{formatDate(trip.startDate)} — {formatDate(trip.endDate)} · {dayCountLabel(daysBetween(trip.startDate, trip.endDate))}</p>
      <div className="home-trip-meta"><span className={`status-chip status-${trip.status}`}>{tripLabels[trip.status]}</span>{!compact && remaining > 0 && <span>{remaining === 1 ? "Falta 1 dia" : `Faltam ${remaining} dias`}</span>}</div>
    </div>
  </Link>;
}
