import { ArrowRight } from "lucide-react";
import type { EventDetailsData } from "../data/eventDetails";
import { detailSchemas, visibleDetails } from "../data/eventDetails";
import { safeUrl } from "../utils/money";
import { formatDate } from "../utils/dates";
export function EventSpecificDetails({
  details,
  admin,
  part = "all",
  departureTime,
  arrivalTime,
}: {
  details?: EventDetailsData;
  admin: boolean;
  part?: "all" | "info" | "reservation" | "links" | "notes";
  departureTime?: string;
  arrivalTime?: string;
}) {
  const entries = visibleDetails(details, admin).filter((entry) => {
    if (part === "all") return true;
    const group =
      entry.key === "notes"
        ? "notes"
        : entry.input === "url"
          ? "links"
          : /^(reservation|bookingReference|seat|table|ticketCode|ticket$|confirmation|phone)/.test(
                entry.key,
              )
            ? "reservation"
            : "info";
    return group === part;
  });
  if (!entries.length || !details) return null;
  const flight =
    details.type === "flight" && (part === "info" || part === "all");
  const routeKeys = [
    "originAirport",
    "destinationAirport",
    "departureTime",
    "arrivalTime",
    "originCity",
    "destinationCity",
  ];
  return (
    <section className={`specific-details ${flight ? "flight-details" : ""}`}>
      <h3>
        {part === "reservation"
          ? "Reserva"
          : part === "links"
            ? details.type === "lodging" ? "Reserva" : "Ingresso"
            : part === "notes"
              ? "Observações específicas"
              : detailSchemas[details.type].title}
      </h3>
      {flight && (departureTime || arrivalTime || entries.some((entry) => routeKeys.includes(entry.key))) && (
        <div className="flight-route">
          <div>
            <strong>
              {details.originAirport || details.originCity || "Origem"}
            </strong>
            {details.originAirport && details.originCity && (
              <small>{details.originCity}</small>
            )}
            <span>{departureTime ?? details.departureTime}</span>
          </div>
          <ArrowRight size={24} />
          <div>
            <strong>
              {details.destinationAirport ||
                details.destinationCity ||
                "Destino"}
            </strong>
            {details.destinationAirport && details.destinationCity && (
              <small>{details.destinationCity}</small>
            )}
            <span>{arrivalTime ?? details.arrivalTime}</span>
          </div>
        </div>
      )}
      <dl>
        {entries
          .filter((entry) => !flight || !routeKeys.includes(entry.key))
          .map((entry) => (
            <div key={entry.key}>
              <dt>{entry.label}</dt>
              <dd>
                {entry.input === "url"
                  ? safeUrl(String(entry.value)) && (
                      <a
                        className="text-link"
                        href={safeUrl(String(entry.value))}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {details.type === "lodging" ? "Abrir reserva" : "Abrir ingresso"}
                      </a>
                    )
                  : entry.input === "date" ? formatDate(String(entry.value), { day: "numeric", month: "long", year: "numeric" }) : typeof entry.value === "boolean"
                    ? entry.value
                      ? "Sim"
                      : "Não"
                    : entry.value}
              </dd>
            </div>
          ))}
      </dl>
    </section>
  );
}
