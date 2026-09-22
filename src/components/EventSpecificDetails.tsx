import { ArrowRight } from "lucide-react";
import type { EventDetailsData } from "../data/eventDetails";
import { detailSchemas, visibleDetails } from "../data/eventDetails";
import { safeUrl } from "../utils/money";
export function EventSpecificDetails({
  details,
  admin,
}: {
  details?: EventDetailsData;
  admin: boolean;
}) {
  const entries = visibleDetails(details, admin);
  if (!entries.length || !details) return null;
  const flight = details.type === "flight";
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
      <h3>{detailSchemas[details.type].title}</h3>
      {flight && entries.some((entry) => routeKeys.includes(entry.key)) && (
        <div className="flight-route">
          <div>
            <strong>
              {details.originAirport || details.originCity || "Origem"}
            </strong>
            {details.originAirport && details.originCity && <small>{details.originCity}</small>}
            <span>{details.departureTime}</span>
          </div>
          <ArrowRight size={24} />
          <div>
            <strong>
              {details.destinationAirport ||
                details.destinationCity ||
                "Destino"}
            </strong>
            {details.destinationAirport && details.destinationCity && <small>{details.destinationCity}</small>}
            <span>{details.arrivalTime}</span>
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
                        Abrir ingresso
                      </a>
                    )
                  : typeof entry.value === "boolean"
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
