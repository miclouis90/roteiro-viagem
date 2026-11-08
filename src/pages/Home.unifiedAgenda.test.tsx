// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const session = vi.hoisted(() => ({ user: { uid: "alice", displayName: "Alice" } as null | { uid: string; displayName: string }, admin: false }));
vi.mock("../lib/firebase", () => ({ db: null, auth: null, demoMode: true, configured: true }));
vi.mock("../hooks/useAuth", () => ({ AuthProvider: ({ children }: { children: ReactNode }) => children, useAuth: () => ({ user: session.user, admin: session.admin, loading: false, error: "", toggleDemo: vi.fn(), login: vi.fn(), logout: vi.fn() }) }));
import App from "../App";
import { demoTrip } from "../data/demo";
import * as service from "../services/personalEvents";
import type { Trip } from "../types";
import type { PersonalEvent } from "../utils/personalEvents";
const trip: Trip = { ...demoTrip, id: "trip-a", title: "Brasília da Mel", startDate: "2026-10-29", endDate: "2026-11-02", status: "confirmada" };
const event: PersonalEvent = { id: "trip-a", ownerId: "alice", title: "Show no parque", category: "show", date: "2026-10-30", startTime: "09:00", endTime: "10:00", city: "São Paulo", location: "Parque central", notes: "PRIVATE ALICE", priceCents: 9999 };
const second = { ...event, id: "theater", title: "Peça da noite", category: "theater" as const, startTime: "19:00" };
let root: Root, container: HTMLDivElement;
function trips(rows: Trip[]) { localStorage.setItem("rumo-demo-v1", JSON.stringify({ trips: rows, events: {} })); }
function events(rows: PersonalEvent[], bob: PersonalEvent[] = []) { localStorage.setItem("rumo-personal-events-v1", JSON.stringify({ alice: rows, bob })); }
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 4, 12));
  session.user = { uid: "alice", displayName: "Alice" }; session.admin = false;
  localStorage.setItem("rumo:onboarding-completed", "true"); trips([trip]); events([second, event]);
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.open = false; } });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {}); container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); for (const key of ["rumo-demo-v1", "rumo-personal-events-v1", "rumo:onboarding-completed"]) localStorage.removeItem(key); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function render() { await act(async () => root.render(<App />)); }
async function mount(path = "/?view=agenda&agendaDay=2026-10-30") { window.history.replaceState(null, "", `/#${path}`); await render(); }
async function click(element: Element | null) { expect(element).toBeTruthy(); await act(async () => (element as HTMLElement).click()); }
function button(text: string, scope = container) { return [...scope.querySelectorAll('button')].find(item => item.textContent === text) || null; }
async function change(selector: string, value: string) {
  const field = container.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!; expect(field).toBeTruthy();
  const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(field, value); field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? "change" : "input", { bubbles: true })); });
}
async function submit() { await act(async () => container.querySelector('form')!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))); }
async function pop(action: () => void) { await act(async () => { const returned = new Promise<void>(resolve => window.addEventListener("popstate", () => resolve(), { once: true })); action(); await returned; }); }

it("combina período e vários eventos pontuais no mesmo dia, distinguindo IDs e horários", async () => {
  await mount();
  expect(container.querySelectorAll('.trip-agenda-day .home-trip')).toHaveLength(1); expect(container.querySelectorAll('.trip-agenda-day .personal-event-card')).toHaveLength(2);
  expect([...container.querySelectorAll('.trip-agenda-day .personal-event-card strong')].map(item => item.textContent)).toEqual([event.title, second.title]);
  expect(container.querySelector('[data-date="2026-10-30"]')?.getAttribute('aria-label')).toContain("1 viagem e 2 eventos");
  expect(container.querySelector('[data-period="trip-a"]')).not.toBeNull(); expect(container.querySelector('[data-event-point="trip-a"]')).not.toBeNull();
  await click(container.querySelector('[data-date="2026-10-31"]'));
  expect(container.querySelectorAll('.trip-agenda-day .home-trip')).toHaveLength(1); expect(container.querySelectorAll('.trip-agenda-day .personal-event-card')).toHaveLength(0);
});
it("filtra tipos e busca global, preservando separadamente busca e status da visualização Viagens", async () => {
  trips([trip, { ...trip, id: "idea", title: "Outra viagem", status: "planejamento" }]);
  await mount("/"); await change('[aria-label="Buscar viagem"]', "brasilia"); await click(button("Confirmadas"));
  await click(container.querySelector('#home-view-agenda')); await click(container.querySelector('[data-date="2026-10-30"]'));
  expect(container.querySelectorAll('.trip-agenda-day .home-trip')).toHaveLength(2);
  await click(button("Eventos", container.querySelector('.agenda-type-filter') as HTMLDivElement)); expect(container.querySelectorAll('[data-period]')).toHaveLength(0);
  await change('[aria-label="Buscar na agenda"]', "PECA"); expect(container.querySelectorAll('.trip-agenda-day .personal-event-card')).toHaveLength(1);
  expect(container.querySelector('.trip-agenda-day .personal-event-card strong')?.textContent).toBe(second.title);
  await click(container.querySelector('#home-view-trips')); expect(container.querySelector<HTMLInputElement>('[aria-label="Buscar viagem"]')?.value).toBe("brasilia");
  expect(container.querySelector('.home-status [aria-pressed="true"]')?.textContent).toBe("Confirmadas");
  await click(container.querySelector('#home-view-agenda')); expect(container.querySelector<HTMLInputElement>('[aria-label="Buscar na agenda"]')?.value).toBe("PECA"); expect(container.querySelector('.agenda-type-filter [aria-pressed="true"]')?.textContent).toBe("Eventos");
  await change('[aria-label="Buscar na agenda"]', ""); await click(button("Viagens", container.querySelector('.agenda-type-filter') as HTMLDivElement)); expect(container.querySelectorAll('[data-event-point]')).toHaveLength(0);
});
it("abre ficha pelo calendário/lista e volta à mesma Agenda por Escape/fechar e navegador", async () => {
  await mount(); const base = window.location.hash;
  await click(container.querySelector('[data-event-point="trip-a"]')); expect(container.querySelector('dialog h2')?.textContent).toBe(event.title); expect(window.location.hash).toContain("agendaEvent=trip-a");
  await pop(() => window.history.back()); expect(window.location.hash).toBe(base); expect(container.querySelector('dialog')).toBeNull();
  await click(container.querySelector('.trip-agenda-day .personal-event-card'));
  await pop(() => (container.querySelector('dialog [aria-label="Fechar"]') as HTMLButtonElement).click());
  expect(window.location.hash).toBe(base); expect(container.querySelector('[data-date="2026-10-30"]')?.getAttribute('aria-pressed')).toBe("true");
  await click(container.querySelector('.trip-agenda-day .home-trip-link')); expect(window.location.hash).toBe(`#/viagem/${trip.id}`);
  await pop(() => window.history.back()); expect(window.location.hash).toBe(base);
});
it("edita e exclui pela Agenda sem duplicar eventos ou alterar viagem/gastos", async () => {
  const originalTrips = localStorage.getItem("rumo-demo-v1"), originalCosts = localStorage.getItem("rumo-financial-v1");
  await mount(); const base = window.location.hash; await click(container.querySelector('.trip-agenda-day .personal-event-card')); await click(button("Editar evento"));
  await change('[name="title"]', "Show editado"); await change('[name="date"]', "2026-11-03"); await submit();
  expect(container.querySelector('dialog h2')?.textContent).toBe("Show editado");
  await pop(() => (container.querySelector('dialog [aria-label="Fechar"]') as HTMLButtonElement).click()); expect(window.location.hash).toBe(base);
  expect(container.querySelectorAll('.trip-agenda-day .personal-event-card')).toHaveLength(1); expect(container.querySelector('[data-date="2026-10-30"]')?.getAttribute('data-event-count')).toBe("1");
  await click(container.querySelector('.trip-agenda-day .personal-event-card')); await click(button("Excluir")); await click(button("Cancelar")); expect(container.querySelector('dialog h2')?.textContent).toBe(second.title);
  await click(button("Excluir")); await pop(() => (button("Excluir evento") as HTMLButtonElement).click());
  expect(container.querySelectorAll('.trip-agenda-day .personal-event-card')).toHaveLength(0); expect(container.querySelectorAll('.trip-agenda-day .home-trip')).toHaveLength(1);
  expect(JSON.parse(localStorage.getItem("rumo-personal-events-v1")!).alice).toHaveLength(1); expect(localStorage.getItem("rumo-demo-v1")).toBe(originalTrips); expect(localStorage.getItem("rumo-financial-v1")).toBe(originalCosts);
});
it("mantém mês, ano, dia, filtro, busca e ficha após recarregar", async () => {
  const crossing = { ...trip, startDate: "2026-12-29", endDate: "2027-01-03" }; trips([crossing]); events([{ ...event, date: "2027-01-01", title: "Virada" }]);
  await mount("/?view=agenda&agendaDay=2026-12-31"); await click(container.querySelector('[aria-label="Próximo mês da agenda"]'));
  expect(container.querySelector('[data-period="trip-a"]')).not.toBeNull(); await click(container.querySelector('[data-date="2027-01-01"]'));
  await click(button("Eventos", container.querySelector('.agenda-type-filter') as HTMLDivElement)); await change('[aria-label="Buscar na agenda"]', "virada"); await click(container.querySelector('[data-event-point="trip-a"]'));
  const hash = window.location.hash; await act(async () => root.unmount()); root = createRoot(container); await render();
  expect(window.location.hash).toBe(hash); expect(container.querySelector('dialog h2')?.textContent).toBe("Virada");
  expect(container.querySelector('[data-date="2027-01-01"]')?.getAttribute('aria-pressed')).toBe("true"); expect(container.querySelector<HTMLInputElement>('[aria-label="Buscar na agenda"]')?.value).toBe("virada");
});
it("retira imediatamente dados/fichas privados ao trocar de conta ou sair", async () => {
  events([event], [{ ...event, id: "bob-only", ownerId: "bob", title: "BOB PRIVADO" }]); await mount(); await click(container.querySelector('[data-event-point="trip-a"]'));
  expect(container.textContent).toContain("PRIVATE ALICE"); session.user = { uid: "bob", displayName: "Bob" }; await render();
  expect(container.querySelector('dialog')).toBeNull(); expect(container.textContent).not.toContain("PRIVATE ALICE"); expect(container.textContent).not.toContain(event.title); expect(container.textContent).toContain("BOB PRIVADO");
  session.user = null; await render(); expect(container.querySelectorAll('.personal-event-card')).toHaveLength(0); expect(container.querySelectorAll('[data-event-point]')).toHaveLength(0); expect(container.textContent).not.toContain("BOB PRIVADO");
});
it("não reabre assinaturas nem grava dados ao mudar dia, mês, filtro ou busca", async () => {
  const watch = vi.spyOn(service, "watchPersonalEvents"); const raw = localStorage.getItem("rumo-personal-events-v1"); await mount(); expect(watch).toHaveBeenCalledTimes(1);
  await click(container.querySelector('[data-date="2026-10-31"]')); await click(button("Eventos", container.querySelector('.agenda-type-filter') as HTMLDivElement)); await change('[aria-label="Buscar na agenda"]', "show"); await click(container.querySelector('[aria-label="Próximo mês da agenda"]'));
  expect(watch).toHaveBeenCalledTimes(1); expect(localStorage.getItem("rumo-personal-events-v1")).toBe(raw);
});
it("combina alterações rápidas de tipo, busca, ano e mês sem sobrescrever a URL", async () => {
  await mount();
  await act(async () => {
    button("Eventos", container.querySelector('.agenda-type-filter') as HTMLDivElement)!.click();
    const search = container.querySelector<HTMLInputElement>('[aria-label="Buscar na agenda"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(search, "show"); search.dispatchEvent(new Event("input", { bubbles: true }));
    const year = container.querySelector<HTMLSelectElement>('[aria-label="Ano da agenda"]')!;
    year.value = "2028"; year.dispatchEvent(new Event("change", { bubbles: true }));
    const month = container.querySelector<HTMLSelectElement>('[aria-label="Mês da agenda"]')!;
    month.value = "02"; month.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const params = new URLSearchParams(window.location.hash.split('?')[1]);
  expect(params.get("agendaType")).toBe("events"); expect(params.get("agendaQuery")).toBe("show"); expect(params.get("agendaMonth")).toBe("2028-02"); expect(params.get("agendaDay")).toBe("2028-02-29");
  expect(container.querySelector('.agenda-type-filter [aria-pressed="true"]')?.textContent).toBe("Eventos");
  await act(async () => { const next = container.querySelector<HTMLButtonElement>('[aria-label="Próximo mês da agenda"]')!; next.click(); next.click(); });
  expect(new URLSearchParams(window.location.hash.split('?')[1]).get("agendaMonth")).toBe("2028-04");
});
it("falha fechada da fonte privada mantém viagens disponíveis e não expõe eventos", async () => {
  vi.spyOn(service, "watchPersonalEvents").mockImplementationOnce((_owner, _next, error) => { error({ code: "permission-denied", message: "PRIVATE ALICE" }); return () => {}; });
  await mount(); expect(container.querySelector('[role="alert"]')?.textContent).toContain("acesso");
  expect(container.querySelectorAll('.trip-agenda-day .home-trip')).toHaveLength(1); expect(container.querySelectorAll('.personal-event-card')).toHaveLength(0);
  expect(container.textContent).not.toContain("PRIVATE ALICE"); expect(container.textContent).not.toContain(event.title);
});
it("resume calendários densos e pagina a lista sem perder registros", async () => {
  trips([trip, ...Array.from({ length: 200 }, (_, i) => ({ ...trip, id: `overlap-${i}`, startDate: "2026-10-01", endDate: "2026-10-03" }))]);
  events(Array.from({ length: 60 }, (_, i) => ({ ...event, id: `event-${i}` }))); await mount();
  expect(container.querySelectorAll('[data-period]').length).toBeLessThanOrEqual(12); expect(container.querySelectorAll('[data-event-point]')).toHaveLength(1); expect(container.querySelector('[data-date="2026-10-30"]')?.getAttribute('data-event-count')).toBe("60");
  expect(container.querySelectorAll('.agenda-day-list > *')).toHaveLength(20);
  while (container.querySelector('.agenda-day-more')) await click(container.querySelector('.agenda-day-more'));
  expect(container.querySelectorAll('.agenda-day-list > *')).toHaveLength(61);
}, 15000);
it("agrupa grandes históricos por ano, mostra mais sob demanda e mantém próxima viagem em destaque", async () => {
  const history = Array.from({ length: 80 }, (_, i) => ({ ...trip, id: `past-${i}`, title: `História ${i}`, destinationCity: i < 20 ? "Recife" : "São Paulo", startDate: `${2025 - Math.floor(i / 20)}-01-01`, endDate: `${2025 - Math.floor(i / 20)}-01-03`, status: "concluída" as const }));
  trips([trip, ...history]); await mount("/"); expect(container.querySelector('.home-carousel h3')?.textContent).toBe(trip.title); expect(container.querySelectorAll('.home-history-year')).toHaveLength(4); expect(container.querySelectorAll('.home-history .home-trip')).toHaveLength(12);
  await click(container.querySelector('.home-history-more')); expect(container.querySelectorAll('.home-history .home-trip')).toHaveLength(20);
  await change('[aria-label="Buscar viagem"]', "sao paulo"); expect(container.querySelectorAll('.home-history-year')).toHaveLength(3); expect(container.querySelector('.home-history .home-trip')?.textContent).toContain("São Paulo");
  await change('[aria-label="Buscar viagem"]', "História 79"); expect(container.querySelector('.home-history summary strong')?.textContent).toBe("2022"); expect(container.querySelectorAll('.home-history .home-trip')).toHaveLength(1);
  await change('[aria-label="Buscar viagem"]', ""); expect(container.querySelector('.home-carousel h3')?.textContent).toBe(trip.title);
}, 15000);
