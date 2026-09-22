import { categoryOf } from "./categories";
export interface DetailField {
  key: string;
  label: string;
  private?: boolean;
  input?: "time" | "url" | "checkbox";
}
const field = (
  key: string,
  label: string,
  privateField = false,
  input?: DetailField["input"],
): DetailField => ({ key, label, private: privateField, input });
export const detailSchemas = {
  flight: {
    title: "Informações do voo",
    fields: [
      field("company", "Companhia"),
      field("flightNumber", "Número do voo"),
      field("originAirport", "Aeroporto de origem"),
      field("originCity", "Cidade de origem"),
      field("destinationAirport", "Aeroporto de destino"),
      field("destinationCity", "Cidade de destino"),
      field("departureTerminal", "Terminal de partida"),
      field("departureGate", "Portão de embarque"),
      field("arrivalTerminal", "Terminal de chegada"),
      field("boardingTime", "Embarque", false, "time"),
      field("departureTime", "Partida", false, "time"),
      field("arrivalTime", "Chegada", false, "time"),
      field("seat", "Assento", true),
      field("bookingReference", "Código de reserva", true),
      field("baggage", "Bagagem"),
      field("notes", "Notas do voo", true),
    ],
  },
  restaurant: {
    title: "Reserva e dicas",
    fields: [
      field("reservationTime", "Horário da reserva", false, "time"),
      field("reservationName", "Nome da reserva", true),
      field("reservationCode", "Código da reserva", true),
      field("phone", "Telefone", true),
      field("neighborhood", "Bairro"),
      field("recommendedDish", "Prato para experimentar"),
      field("notes", "Notas da reserva", true),
    ],
  },
  bar: {
    title: "Drinks e reserva",
    fields: [
      field("reservation", "Reserva", true),
      field("table", "Mesa", true),
      field("happyHour", "Happy hour"),
      field("signatureDrink", "Drink da casa"),
      field("dressCode", "Traje"),
      field("notes", "Notas do bar", true),
    ],
  },
  culture: {
    title: "Ingresso e programação",
    fields: [
      field("ticketUrl", "Link de ingresso", true, "url"),
      field("ticketCode", "Código do ingresso", true),
      field("session", "Sessão"),
      field("seat", "Assento", true),
      field("openingHours", "Horário de funcionamento"),
      field("exhibition", "Exposição"),
      field("artist", "Artista"),
      field("notes", "Notas da programação", true),
    ],
  },
  outdoor: {
    title: "Detalhes do passeio",
    fields: [
      field("meetingPoint", "Ponto de encontro"),
      field("duration", "Duração"),
      field("whatToBring", "O que levar"),
      field("reservation", "Reserva", true),
      field("weatherDependent", "Depende do clima", false, "checkbox"),
      field("notes", "Notas do passeio", true),
    ],
  },
  transfer: {
    title: "Detalhes do deslocamento",
    fields: [
      field("pickupLocation", "Local de embarque"),
      field("dropoffLocation", "Local de desembarque"),
      field("company", "Empresa"),
      field("driver", "Motorista", true),
      field("confirmation", "Confirmação", true),
      field("duration", "Duração"),
    ],
  },
  car: {
    title: "Detalhes do carro",
    fields: [
      field("pickup", "Retirada"),
      field("returnLocation", "Devolução"),
      field("rentalCompany", "Locadora"),
      field("reservation", "Reserva", true),
      field("vehicle", "Veículo"),
    ],
  },
  rail: {
    title: "Detalhes do trajeto",
    fields: [
      field("origin", "Origem"),
      field("destination", "Destino"),
      field("line", "Linha"),
      field("platform", "Plataforma"),
      field("ticket", "Bilhete", true),
    ],
  },
} satisfies Record<string, { title: string; fields: DetailField[] }>;
export type DetailType = keyof typeof detailSchemas;
export interface EventDetailsData {
  type: DetailType;
  [key: string]: string | boolean;
}
export function detailTypeFor(category: string): DetailType | undefined {
  if (category === "Voo" || category === "Aeroporto") return "flight";
  if (category === "Transfer" || category === "Táxi / app") return "transfer";
  if (category === "Carro") return "car";
  if (["Ônibus", "Metrô", "Trem"].includes(category)) return "rail";
  const group = categoryOf(category).group;
  return group === "food"
    ? "restaurant"
    : group === "night"
      ? "bar"
      : group === "culture"
        ? "culture"
        : group === "outdoor"
          ? "outdoor"
          : undefined;
}
export function validDetails(details: unknown): details is EventDetailsData {
  if (!details || typeof details !== "object" || Array.isArray(details))
    return false;
  const value = details as Record<string, unknown>;
  if (typeof value.type !== "string" || !Object.prototype.hasOwnProperty.call(detailSchemas, value.type))
    return false;
  const fields = detailSchemas[value.type as DetailType].fields;
  return Object.entries(value).every(([key, entry]) => {
    if (key === "type") return true;
    const spec = fields.find((f) => f.key === key);
    if (!spec) return false;
    if (spec.input === "checkbox") return typeof entry === "boolean";
    if (typeof entry !== "string" || entry.length > 1000) return false;
    if (spec.input === "time")
      return entry === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(entry);
    if (spec.input === "url") return entry === "" || /^https?:\/\//.test(entry);
    return true;
  });
}
export function visibleDetails(
  details: EventDetailsData | undefined,
  admin: boolean,
) {
  if (!validDetails(details)) return [];
  return detailSchemas[details.type].fields
    .filter(
      (field) =>
        (admin || !field.private) &&
        details[field.key] !== undefined &&
        details[field.key] !== "",
    )
    .map((field) => ({ ...field, value: details[field.key] }));
}
