import {
  MapPin,
  CalendarDays,
  Clock3,
  ArrowUpRight,
  Star,
  Pencil,
  Trash2,
  MoreHorizontal,
  Share2,
} from "lucide-react";
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
        <span className="location">
          <MapPin size={13} aria-hidden="true" />
          {event.location || "Local a definir"}
        </span>
        <span className="event-mobile-meta">
          <span>{eventPriceLabel(event, currency)}</span>
          <span className={`timeline-status status-${event.status}`}>
            {eventLabels[event.status]}
          </span>
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
      <div className={`event-details tone-${categoryOf(event.category).tone}`}>
        <div className="detail-chips">
          <CategoryChip name={event.category} />
          <span className={`status-chip status-${event.status}`}>
            {eventLabels[event.status]}
          </span>
        </div>
        <div className="event-when">
          <CalendarDays size={18} aria-hidden="true" />
          <span>
            {formatDate(event.date, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
          <span className="event-clock">
            <Clock3 size={18} aria-hidden="true" />
            <strong>
              {event.startTime}
              {event.endTime && ` — ${event.endTime}`}
            </strong>
          </span>
        </div>
        <p className="inline-icon event-location">
          <MapPin size={17} />
          {event.location || "Local a definir"}
        </p>
        <div className="quick-event-actions">
          {admin && (
            <button className="primary" onClick={onEdit}>
              <Pencil size={16} />
              Editar
            </button>
          )}
          {maps && (
            <a
              className="secondary"
              href={maps}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin size={16} />
              Mapa
            </a>
          )}
          {(onShare || admin) && (
            <details
              className="context-menu event-menu"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget))
                  e.currentTarget.open = false;
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.open = false;
                  e.currentTarget.querySelector("summary")?.focus();
                }
              }}
            >
              <summary aria-label="Mais opções do programa">
                <MoreHorizontal size={22} />
              </summary>
              <div
                className="menu-popover"
                onClick={(e) => {
                  const menu = e.currentTarget.closest("details");
                  if (menu) menu.open = false;
                }}
              >
                {onShare && (
                  <button onClick={onShare}>
                    <Share2 size={16} />
                    Compartilhar
                  </button>
                )}
                {admin && (
                  <button className="danger-text" onClick={onDelete}>
                    <Trash2 size={16} />
                    Excluir
                  </button>
                )}
              </div>
            </details>
          )}
        </div>
        {justSaved && admin && (
          <p className="field-help">
            Programa salvo. Em Editar, você pode adicionar mais detalhes.
          </p>
        )}
        <details className="expandable event-extra">
          <summary>Detalhes do programa</summary>
          <div className="event-extra-body">
            <section className="detail-block">
              <h3>Informações</h3>
              <p className="muted">{priorityLabels[event.priority]}</p>
              {event.description && <p>{event.description}</p>}
            </section>

            <EventSpecificDetails
              details={event.details}
              admin={admin}
              part="info"
            />
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
            <EventSpecificDetails
              details={event.details}
              admin={admin}
              part="reservation"
            />
            <EventSpecificDetails
              details={event.details}
              admin={admin}
              part="links"
            />
            {[event.websiteUrl, event.instagramUrl, event.genericUrl].some(
              (url) => !!safeUrl(url),
            ) && (
              <>
                <section className="detail-block">
                  <h3>Links</h3>
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
                </section>
              </>
            )}
            {event.notes && (
              <section>
                <h3>Observações</h3>
                <p className="muted">{event.notes}</p>
              </section>
            )}
            <EventSpecificDetails
              details={event.details}
              admin={admin}
              part="notes"
            />
          </div>
        </details>
      </div>
    </Modal>
  );
}
