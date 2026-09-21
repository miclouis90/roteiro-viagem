import { MapPin, ArrowUpRight } from "lucide-react";
import type { Trip, TripEvent } from "../types";
import { categoryOf } from "../data/categories";
import { cost, money, safeUrl } from "../utils/money";
import { formatDate } from "../utils/dates";
import { Modal } from "./Modal";
export function EventCard({
  event,
  currency,
  onClick,
}: {
  event: TripEvent;
  currency: string;
  onClick: () => void;
}) {
  const c = categoryOf(event.category);
  return (
    <button
      className={`event-card ${event.status === "cancelado" ? "cancelled" : ""}`}
      onClick={onClick}
    >
      <span className="event-time">
        {event.startTime}
        <small>{event.endTime}</small>
      </span>
      <span className={`category-icon ${c.group}`}>{c.icon}</span>
      <span className="event-main">
        <span className="event-meta">
          {event.category}
          {event.priority === "imperdível" && (
            <span className="must">★ Imperdível</span>
          )}
        </span>
        <strong>{event.title}</strong>
        <span className="location">
          <MapPin size={13} />
          {event.location || "Local a definir"}
        </span>
      </span>
      <span className="event-price">
        {event.isFree ? "Gratuito" : money(cost(event), currency)}
        <small>{event.status}</small>
      </span>
      <ArrowUpRight className="event-arrow" size={18} />
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
}: {
  event: TripEvent;
  trip: Trip;
  admin: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const c = categoryOf(event.category);
  const maps =
    safeUrl(event.mapsUrl) ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location + " " + trip.destinationCity)}`;
  return (
    <Modal title={event.title} onClose={onClose}>
      <div className="details">
        <span className={`category-icon ${c.group}`}>{c.icon}</span>
        <div className="badges">
          <span>{event.category}</span>
          <span>{event.status}</span>
          <span>{event.priority}</span>
        </div>
        <p>
          {formatDate(event.date, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}{" "}
          · {event.startTime}
          {event.endTime && ` — ${event.endTime}`}
        </p>
        <p>
          <MapPin size={16} /> {event.location || "Local a definir"}
        </p>
        <p>{event.description || "Sem descrição adicional."}</p>
        <div className="cost-box">
          <small>Custo estimado</small>
          <h2>
            {event.isFree ? "Gratuito" : money(cost(event), trip.currency)}
          </h2>
          {!event.isFree && (
            <span>
              {money(event.pricePerPerson, trip.currency)} × {event.peopleCount}{" "}
              pessoa(s)
              {event.status === "cancelado"
                ? " · cancelado, excluído do total"
                : ""}
            </span>
          )}
        </div>
        {event.notes && <p className="note">{event.notes}</p>}
        <div className="link-row">
          {event.location && (
            <a href={maps} target="_blank" rel="noopener noreferrer">
              Abrir localização ↗
            </a>
          )}
          {[
            ["Site oficial", event.websiteUrl],
            ["Instagram", event.instagramUrl],
            ["Outro link", event.genericUrl],
          ].map(
            ([label, url]) =>
              safeUrl(url) && (
                <a
                  key={label}
                  href={safeUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label} ↗
                </a>
              ),
          )}
        </div>
        {admin && (
          <div className="form-actions">
            <button className="danger" onClick={onDelete}>
              Excluir programa
            </button>
            <button className="primary" onClick={onEdit}>
              Editar programa
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
