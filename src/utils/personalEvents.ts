import { isAgendaDate } from "./agenda";

export const personalEventCategories = ["show", "theater", "sport", "cultural", "other"] as const;
export type PersonalEventCategory = (typeof personalEventCategories)[number];
export interface PersonalEventInput {
  title: string;
  category: PersonalEventCategory;
  date: string;
  startTime: string;
  city: string;
  location: string;
  endTime?: string;
  priceCents?: number;
  ticketUrl?: string;
  notes?: string;
}
export interface PersonalEvent extends PersonalEventInput { id: string; ownerId: string }
const time = (value: unknown): value is string => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
function invalid(): never { throw Object.assign(new Error("Dados inválidos do evento pessoal."), { code: "invalid-argument" }); }
function text(value: unknown, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max) invalid();
  return value.trim();
}
export function parsePersonalPrice(value: string): number | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(raw)) return NaN;
  const [whole, fraction = ""] = raw.replace(",", ".").split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount <= 1000000000 ? amount : NaN;
}
export function validatePersonalEvent(input: PersonalEventInput): PersonalEventInput {
  const title = text(input.title, 120), city = text(input.city, 120), location = text(input.location, 300);
  if (!personalEventCategories.includes(input.category) || typeof input.date !== "string" || !isAgendaDate(input.date) || !time(input.startTime)) invalid();
  if (input.endTime !== undefined && input.endTime !== "" && !time(input.endTime)) invalid();
  if (input.priceCents !== undefined && (!Number.isSafeInteger(input.priceCents) || input.priceCents < 0 || input.priceCents > 1000000000)) invalid();
  if (input.notes !== undefined && (typeof input.notes !== "string" || input.notes.length > 3000)) invalid();
  if (input.ticketUrl !== undefined && typeof input.ticketUrl !== "string") invalid();
  let ticketUrl = input.ticketUrl?.trim();
  if (ticketUrl) {
    try {
      const parsed = new URL(ticketUrl);
      if (ticketUrl.length > 2048 || !["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password || /\s/.test(ticketUrl)) invalid();
      ticketUrl = ticketUrl.replace(/^https?:/i, protocol => protocol.toLowerCase());
    } catch { invalid(); }
  }
  return { title, category: input.category, date: input.date, startTime: input.startTime, city, location,
    ...(input.endTime ? { endTime: input.endTime } : {}),
    ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
    ...(ticketUrl ? { ticketUrl } : {}), ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}) };
}
export function sortPersonalEvents(events: readonly PersonalEvent[]) {
  return [...events].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}
export const personalEventPrice = (amount: number) => amount === 0 ? "Grátis" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount / 100);
export const personalEventOvernight = (event: Pick<PersonalEventInput, "startTime" | "endTime">) => !!event.endTime && event.endTime < event.startTime;

export function personalEventError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code).replace(/^firestore\//, "") : "";
  switch (code) {
    case "unauthenticated": return "Entre novamente para acessar seus eventos.";
    case "permission-denied": return "Você não tem acesso a este evento. Se for seu, confira se as regras de eventos pessoais foram publicadas.";
    case "invalid-argument": return "Revise título, categoria, data, horários, cidade, local, valor e link de ingresso.";
    case "not-found": return "Este evento não está mais disponível. Atualize a lista.";
    case "unavailable": case "deadline-exceeded": return "Não foi possível conectar. Confira sua conexão e tente novamente.";
    default: return "Não foi possível concluir. Tente novamente; o formulário mantém seus dados.";
  }
}
