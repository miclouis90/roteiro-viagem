import { MapPin, ArrowUpRight, Star, Pencil, Trash2 } from "lucide-react";
import type { Trip, TripEvent } from "../types";
import { money, safeUrl } from "../utils/money";
import { eventPriceLabel, hasUndefinedPrice } from "../utils/eventPrice";
import { formatDate } from "../utils/dates";
import { eventLabels, priorityLabels } from "../utils/labels";
import { CategoryChip } from "./ui/Primitives";
import { categoryOf } from "../data/categories";
import { Modal } from "./Modal";
import { EventSpecificDetails } from "./EventSpecificDetails";
export function EventCard({
  event,
  currency,
  onClick,
}: {
  event: TripEvent;
  currency: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`event-row tone-${categoryOf(event.category).tone} ${event.status === "cancelado" ? "cancelled" : ""}`}
      onClick={onClick}
    >
      <span className="event-time">
        {event.startTime}
        <small>{event.endTime}</small>
      </span>
      <span className="timeline-dot" />
      <span className="event-main">
        <strong>{event.title}</strong>
        <span className="event-meta">
          <CategoryChip name={event.category} />
          {event.priority === "imperdível" && (
            <span className="priority-label">
              <Star size={13} />
              Imperdível
            </span>
          )}
        </span>
        <span className="location">{event.location || "Local a definir"}</span>
        <span className="event-mobile-meta">
          {eventPriceLabel(event, currency)} · {eventLabels[event.status]}
        </span>
      </span>
      <span className="event-price">
        {eventPriceLabel(event, currency)}
        <small>{eventLabels[event.status]}</small>
      </span>
      <ArrowUpRight size={17} className="event-arrow" />
    </button>
  );
}
export function EventDetails({
  event,
  trip,
  admin,
  onClose,
  onEdit,
  onDelete,
  onShare,
  justSaved = false,
}: {
  event: TripEvent;
  trip: Trip;
  admin: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare?: () => void;
  justSaved?: boolean;
}) {
  const maps =
    safeUrl(event.mapsUrl) ||
    (event.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location + " " + trip.destinationCity)}`
      : undefined);
  return (
    <Modal title={event.title} onClose={onClose}>
      <div className="event-details">
        <div className="detail-chips">
          <CategoryChip name={event.category} />
          <span className={`status-chip status-${event.status}`}>
            {eventLabels[event.status]}
          </span>
        </div>
        <p>
          {formatDate(event.date, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          <br />
          {event.startTime}
          {event.endTime && ` — ${event.endTime}`}
        </p>
        <p className="inline-icon">
          <MapPin size={17} />
          {event.location || "Local a definir"}
        </p>
        <div className="quick-event-actions">
          {maps && (
            <a
              className="secondary"
              href={maps}
              target="_blank"
              rel="noopener noreferrer"
            >
              Mapa
              <ArrowUpRight size={16} />
            </a>
          )}

          {admin && (
            <button className="secondary" onClick={onEdit}>
              <Pencil size={16} />
              {justSaved ? "Adicionar mais detalhes" : "Editar"}
            </button>
          )}
          {onShare && (
            <button className="secondary" onClick={onShare}>
              Compartilhar
            </button>
          )}
        </div>
        <details className="expandable event-extra">
          <summary>Detalhes do programa</summary>
          <p className="muted">{priorityLabels[event.priority]}</p>
          {event.description && <p>{event.description}</p>}
          <EventSpecificDetails details={event.details} admin={admin} />
          <section className="detail-cost">
            <span className="muted">Gasto estimado</span>
            <h3>{eventPriceLabel(event, trip.currency)}</h3>
            {!event.isFree && !hasUndefinedPrice(event) && (
              <p>
                {money(event.pricePerPerson, trip.currency)} por pessoa ·{" "}
                {event.peopleCount} pessoa(s)
                {event.status === "cancelado" ? " · fora do total" : ""}
              </p>
            )}
          </section>
          {event.notes && (
            <section>
              <h3>Para lembrar</h3>
              <p className="muted">{event.notes}</p>
            </section>
          )}
          <div className="link-row">
            {[
              ["Site oficial", event.websiteUrl],
              ["Instagram", event.instagramUrl],
              ["Outro link", event.genericUrl],
            ].map(
              ([label, url]) =>
                safeUrl(url) && (
                  <a
                    className="ghost"
                    key={label}
                    href={safeUrl(url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {label}
                    <ArrowUpRight size={16} />
                  </a>
                ),
            )}
          </div>
          {admin && (
            <div className="form-actions">
              <button className="ghost danger-text" onClick={onDelete}>
                <Trash2 size={16} />
                Excluir
              </button>
            </div>
          )}
        </details>
      </div>
    </Modal>
  );
}
