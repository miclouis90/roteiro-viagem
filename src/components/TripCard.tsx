import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowRight, LockKeyhole, MapPin } from "lucide-react";
import type { Trip } from "../types";
import { dateKey, daysBetween, formatDate } from "../utils/dates";
import { dayCountLabel, tripLabels } from "../utils/labels";
import { themeStyle } from "../data/themes";
export function TripCard({
  trip,
  featured = false,
  admin = false,
}: {
  trip: Trip;
  featured?: boolean;
  admin?: boolean;
}) {
  return (
    <Link
      to={`/viagem/${trip.id}`}
      className={`trip-card theme-trip ${featured ? "featured-trip" : ""}`}
      style={themeStyle(trip.theme) as React.CSSProperties}
    >
      <div className="trip-cover" aria-hidden="true">
        <div className="cover-caption">
          <MapPin size={20} />
          {trip.destinationCity}
        </div>
        <span className="cover-direction">
          Um novo destino,
          <br />
          do seu jeito.
        </span>
        <ArrowUpRight size={40} strokeWidth={1} />
        <div className="cover-route" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="trip-card-body">
        {featured && (
          <span className="eyebrow">
            {trip.startDate > dateKey()
              ? "Próxima viagem"
              : trip.endDate >= dateKey()
                ? "Sua viagem está acontecendo"
                : "Uma história para lembrar"}
          </span>
        )}
        <div className="card-title">
          <h2>{trip.title}</h2>
          {!trip.isPublic && (
            <span className="privacy-label">
              <LockKeyhole size={13} />
              Privada
            </span>
          )}
        </div>
        <p className="muted">
          {trip.destinationCity}
          {trip.destinationState && ` · ${trip.destinationState}`}
        </p>
        <p className="trip-dates">
          {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
          <span>·</span>
          {dayCountLabel(daysBetween(trip.startDate, trip.endDate))}
        </p>
        {featured && trip.startDate > dateKey() && (
          <p className="card-countdown">
            Falta{daysBetween(dateKey(), trip.startDate) === 2 ? "" : "m"} {dayCountLabel(daysBetween(dateKey(), trip.startDate) - 1)}.
          </p>
        )}
        <span className={`status-chip status-${trip.status}`}>
          {tripLabels[trip.status]}
        </span>
        {featured && trip.description && (
          <p className="feature-description">{trip.description}</p>
        )}
        <div className="trip-card-footer">
          <span>{trip.travelerName || "Seu próximo roteiro"}</span>
          <span className="card-cta">
            {featured
              ? admin
                ? "Continuar planejando"
                : "Explorar roteiro"
              : "Abrir"}
            <ArrowRight size={17} />
          </span>
        </div>
      </div>
    </Link>
  );
}
