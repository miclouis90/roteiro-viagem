// @vitest-environment jsdom
import { act, StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { demoTrip, demoEvents } from "./data/demo";
import { watchEvents, watchTrip, watchTrips } from "./services/repository";
import { exportTrip } from "./services/exportTrip";

const authState = vi.hoisted(() => ({ admin: false, user: null as null | {uid: string; displayName: string} }));
vi.mock("./lib/firebase", () => ({ db: null, auth: null, demoMode: false, configured: true }));
vi.mock("./hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ user: authState.user, admin: authState.admin, loading: false, error: "", login: vi.fn(), logout: vi.fn() }),
}));
vi.mock("./services/repository", () => ({ watchTrips: vi.fn(), watchTrip: vi.fn(), watchEvents: vi.fn(), saveEvent: vi.fn().mockResolvedValue("demo-6") }));
vi.mock("./services/exportTrip", () => ({ exportTrip: vi.fn().mockResolvedValue(undefined) }));
const trip = { ...demoTrip, id: "brasilia-da-mel-2026", title: "Brasília da Mel", isPublic: true };
let container: HTMLDivElement;
let root: Root;
async function mount(path: string) {
  window.history.replaceState(null, "", `/#${path}`);
  await act(async () => { root.render(<StrictMode><App /></StrictMode>); });
}
async function click(element: Element | null) {
  expect(element).not.toBeNull();
  await act(async () => { element!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })); });
}
function expectHome() {
  expect(container.querySelector("main.home")).not.toBeNull();
  expect(container.querySelector(".trip-tabs")).toBeNull();
  expect(container.querySelector("main.home")?.textContent).toContain("Brasília da Mel");
}
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
  localStorage.setItem("rumo:onboarding-completed", "true");
  authState.admin = false;
  authState.user = null;
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.mocked(watchTrips).mockImplementation((_admin, next) => { next([trip]); return () => {}; });
  vi.mocked(watchTrip).mockImplementation((_id, next) => { next(trip); return () => {}; });
  vi.mocked(watchEvents).mockImplementation((id, next) => {
    if (!id) throw new Error("Invalid collection reference: trips/events");
    next([]); return () => {};
  });
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); localStorage.removeItem("rumo:onboarding-completed"); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("Home sem contexto de viagem", () => {
  it("renderiza a listagem ao abrir diretamente /", async () => {
    await mount("/"); expectHome(); expect(watchTrip).not.toHaveBeenCalled(); expect(watchEvents).not.toHaveBeenCalled();
  });
  it("renderiza Home após clicar Viagens e permite reabrir a viagem e suas abas", async () => {
    await mount(`/viagem/${trip.id}`);
    expect(container.querySelector("h1")?.textContent).toBe(trip.title);
    await click(container.querySelector('.trip-home-link[href="#/"]'));
    expect(window.location.hash).toBe("#/"); expectHome();
    expect(vi.mocked(watchEvents).mock.calls.every(([id]) => id === trip.id)).toBe(true);
    await click(container.querySelector(`main.home a[href="#/viagem/${trip.id}"]`));
    expect(container.querySelector("h1")?.textContent).toBe(trip.title);
    for (const label of ["Roteiro", "Gastos", "Visão geral"]) {
      expect(container.querySelectorAll(".trip-tabs button")).toHaveLength(3);
      expect(container.querySelector(".trip-tabs")?.textContent).not.toContain("Viagens");
      await click([...container.querySelectorAll(".trip-tabs button")].find(button => button.textContent === label)!);
      expect(container.querySelector("h1")?.textContent).toBe(label === "Visão geral" ? trip.title : label);
    }
  });
  it("mostra erro da listagem em vez de loading infinito", async () => {
    vi.mocked(watchTrips).mockImplementation((_admin, _next, error) => { error(new Error("offline")); return () => {}; });
    await mount("/"); expect(container.querySelector('[role="alert"]')?.textContent).toContain("Não foi possível carregar as viagens");
  });
});

it("filtra a Home por busca e chips", async () => {
  await mount("/");
  const input = container.querySelector('input[aria-label="Buscar viagem"]')!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => { setter.call(input,"inexistente"); input.dispatchEvent(new Event("input",{bubbles:true})); });
  expect(container.textContent).toContain("Nenhuma viagem encontrada");
  await act(async () => { setter.call(input,"brasilia"); input.dispatchEvent(new Event("input",{bubbles:true})); });
  expectHome();
  await click([...container.querySelectorAll('.home-status button')].find(b => b.textContent === "Concluídas")!);
  expect(container.textContent).toContain("Nenhuma viagem encontrada");
});
it("preserva a criação na Home sem bottom navigation", async () => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
  authState.admin = true;
  await mount("/");
  expect(container.querySelector(".trip-tabs")).toBeNull();

  await click(container.querySelector('button[aria-label="Criar viagem"]'));
  expect(container.querySelector('dialog')?.textContent).toContain("Uma nova viagem");
});
it("oculta a barra ao voltar à Home e restaura ao abrir a viagem", async () => {
  await mount(`/viagem/${trip.id}`);
  expect(container.querySelector('.trip-tabs')).not.toBeNull();
  await click(container.querySelector('.trip-home-link[href="#/"]'));
  expectHome();
  await click(container.querySelector(`main.home a[href="#/viagem/${trip.id}"]`));
  expect(container.querySelector('.trip-tabs')).not.toBeNull();
  expect(container.querySelector('.trip-tabs [aria-current="page"]')?.textContent).toBe('Visão geral');
});
it("cumprimenta pelo primeiro nome e preserva fallback sem usuário", async () => {
  await mount("/");
  expect(container.querySelector(".home-greeting")?.textContent).toBe("Oi 👋");
  expect(container.querySelector("h1")?.textContent).toBe("Para onde vamos agora?");
  authState.user = {uid:"test-user",displayName:"  Ana Maria  "};
  await mount("/");
  expect(container.querySelector(".home-greeting")?.textContent).toBe("Oi, Ana 👋");
});
it("mantém o card inteiro navegável e os atalhos fora do link principal", async () => {
  await mount("/");
  const card = container.querySelector(".home-trip")!;
  expect(card.querySelector(".home-trip-link")?.getAttribute("href")).toBe(`#/viagem/${trip.id}`);
  expect(card.querySelector(".home-trip-link summary")).toBeNull();
  const menu = card.querySelector("details")!;
  menu.open = true;
  await click(menu.querySelector('a[href$="?tab=roteiro"]'));
  expect(window.location.hash).toBe(`#/viagem/${trip.id}?tab=roteiro`);
  expect(container.querySelector('h1')?.textContent).toBe('Roteiro');
});
it("mantém a ordem e separação das viagens com a nova composição visual", async () => {
  vi.useFakeTimers({toFake:["Date"]}); vi.setSystemTime(new Date(2026,9,4,12));
  try {
    const past = {...trip,id:'sp',title:'SPzinho + DIIV',destinationCity:'São Paulo',startDate:'2026-09-26',endDate:'2026-09-28',status:'concluída' as const};
    const later = {...trip,id:'later',title:'Férias em janeiro',startDate:'2027-01-10',endDate:'2027-01-14'};
    vi.mocked(watchTrips).mockImplementation((_admin,next) => { next([later,past,trip]); return () => {}; });
    await mount('/');
    expect([...container.querySelectorAll('.home-carousel h3')].map(h=>h.textContent)).toEqual([trip.title,later.title]);
    expect(container.querySelector('.home-trip-list h3')?.textContent).toBe(past.title);
    expect(container.querySelector('.home-trip-list .status-chip')?.textContent).toBe('Concluída');
    expect(container.querySelectorAll('.home-destination-brasilia')).toHaveLength(2);
    expect(container.querySelector('.home-trip-list .home-destination-abstract')).not.toBeNull();
  } finally { vi.useRealTimers(); }
});
it("abre e fecha o calendário sem alterar filtros ou rota", async () => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable:true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable:true, value() { this.removeAttribute("open"); } });
  await mount("/");
  await click(container.querySelector('[aria-label="Abrir calendário de viagens"]'));
  expect(container.querySelector("dialog[open]")?.textContent).toContain("Calendário de viagens");
  await click(container.querySelector('dialog [aria-label="Fechar"]'));
  expect(container.querySelector("dialog")).toBeNull();
  expectHome();
  expect(window.location.hash).toBe("#/");
});
it("seleciona data, combina filtros e limpa sem nova assinatura de viagens", async () => {
  vi.useFakeTimers({toFake:["Date"]}); vi.setSystemTime(new Date(2026,8,26,12));
  Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value(){this.setAttribute("open","");}});
  Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value(){this.removeAttribute("open");}});
  try {
    await mount("/");
    const subscriptions = vi.mocked(watchTrips).mock.calls.length;
    await click(container.querySelector('[aria-label="Abrir calendário de viagens"]'));
    await click(container.querySelector('[aria-label="Próximo mês"]'));
    expect(container.querySelector('[aria-label="29 de outubro de 2026, com viagem"]')).not.toBeNull();
    await click(container.querySelector('[aria-label="29 de outubro de 2026, com viagem"]'));
    expectHome();
    expect(container.querySelector('dialog')).toBeNull();
    await click([...container.querySelectorAll('.home-status button')].find(b=>b.textContent === 'Concluídas')!);
    expect(container.textContent).toContain('Nenhuma viagem nesta data.');
    await click(container.querySelector('[aria-label="Limpar filtro de data"]'));
    expect(container.querySelector('.home-status [aria-pressed="true"]')?.textContent).toBe('Concluídas');
    await click([...container.querySelectorAll('.home-status button')].find(b=>b.textContent === 'Todas')!);
    expectHome();
    await click(container.querySelector('[aria-label="Abrir calendário de viagens"]'));
    await click(container.querySelector('[aria-label="26 de setembro de 2026"]'));
    expect(container.textContent).toContain('Nenhuma viagem nesta data.');
    expect(watchTrips).toHaveBeenCalledTimes(subscriptions);
  } finally { vi.useRealTimers(); }
});

it("percorre as três etapas do onboarding e começa na Home", async () => {
  await mount("/onboarding");
  expect(container.querySelector('h1')?.textContent).toBe('Planeje do seu jeito');
  expect(watchTrips).not.toHaveBeenCalled();
  await click(container.querySelector('.onboarding-next'));
  expect(container.querySelector('h1')?.textContent).toBe('Construa a viagem junto');
  await click(container.querySelector('.onboarding-back'));
  expect(container.querySelector('h1')?.textContent).toBe('Planeje do seu jeito');
  await click(container.querySelector('.onboarding-next'));
  await click(container.querySelector('.onboarding-next'));
  expect(container.querySelector('h1')?.textContent).toBe('Tudo da viagem em um só lugar');
  expect(container.querySelector('.onboarding-next')?.textContent).toBe('Começar');
  await click(container.querySelector('.onboarding-next'));
  expectHome();
});
it("permite pular o onboarding e preserva deep links", async () => {
  await mount('/onboarding');
  await click(container.querySelector('.onboarding-skip'));
  expectHome();
});
it("abre deep link diretamente sem onboarding", async () => {
  await mount(`/viagem/${trip.id}?tab=roteiro`);
  expect(container.querySelector('h1')?.textContent).toBe('Roteiro');
  expect(container.querySelector(".trip-context-name")?.textContent).toBe(trip.title);
  expect(container.querySelector('.onboarding')).toBeNull();
});

it("na primeira entrada mostra onboarding, conclui e mantém Home após recarregar", async () => {
  localStorage.removeItem("rumo:onboarding-completed");
  await mount("/");
  expect(window.location.hash).toBe("#/onboarding");
  expect(container.querySelector('h1')?.textContent).toBe('Planeje do seu jeito');
  expect(watchTrips).not.toHaveBeenCalled();
  await click(container.querySelector('.onboarding-next'));
  await click(container.querySelector('.onboarding-next'));
  await click(container.querySelector('.onboarding-next'));
  expect(localStorage.getItem('rumo:onboarding-completed')).toBe('true');
  expectHome();
  await act(async () => root.unmount());
  root = createRoot(container);
  await mount('/');
  expectHome();
});
it("pular persiste conclusão e permite reabrir onboarding manualmente", async () => {
  localStorage.removeItem('rumo:onboarding-completed');
  await mount('/');
  await click(container.querySelector('.onboarding-skip'));
  expect(localStorage.getItem('rumo:onboarding-completed')).toBe('true');
  expectHome();
  await act(async () => root.unmount()); root = createRoot(container);
  await mount('/onboarding');
  expect(container.querySelector('h1')?.textContent).toBe('Planeje do seu jeito');
});
it.each(['', '?tab=roteiro', '?tab=lugares&invite=shared'])('não intercepta deep link sem conclusão: %s', async suffix => {
  localStorage.removeItem('rumo:onboarding-completed');
  const path = `/viagem/${trip.id}${suffix}`;
  await mount(path);
  if (suffix.includes("lugares")) {
    expect(window.location.hash).toContain("tab=roteiro");
    expect(window.location.hash).toContain("type=places");
    expect(window.location.hash).toContain("invite=shared");
  } else expect(window.location.hash).toBe(`#${path}`);
  expect(container.querySelector('.trip-home-link')?.getAttribute("href")).toBe("#/");
  expect(container.querySelector('.onboarding')).toBeNull();
  expect(container.querySelector('h1')).not.toBeNull();
  expect(localStorage.getItem('rumo:onboarding-completed')).toBeNull();
});
it("não bloqueia a saída se localStorage falhar", async () => {
  localStorage.removeItem('rumo:onboarding-completed');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
  await mount('/');
  await click(container.querySelector('.onboarding-skip'));
  expectHome();
});
async function input(value: string) {
  const element = container.querySelector('input[aria-label="Buscar no roteiro (programas e lugares)"]')!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => { setter.call(element, value); element.dispatchEvent(new Event("input", { bubbles: true })); });
}
async function select(label: string, value: string) {
  const element = [...container.querySelectorAll('dialog label')].find(item => item.textContent?.startsWith(label))?.querySelector('select');
  expect(element).not.toBeNull();
  await act(async () => { element!.value = value; element!.dispatchEvent(new Event("change", { bubbles: true })); });
}
function dialogButton(text: string) { return [...container.querySelectorAll('dialog button')].find(button => button.textContent === text)!; }
function filtersButton() { return container.querySelector('.unified-filters .toolbar button'); }

it("alterna a distribuição de Gastos e abre o calendário mantendo viagem, dia e convite", async () => {
  vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
  await mount('/viagem/' + trip.id + '?tab=gastos&day=2026-10-31&invite=shared');
  const total = container.querySelector('.summary-amount')?.textContent;
  const valuesArc = container.querySelector('.expense-donut-segment')?.getAttribute('stroke-dasharray');
  await click([...container.querySelectorAll('.expense-distribution-toggle button')].find(button => button.textContent === 'Programas')!);
  expect(container.querySelector('.expense-donut svg')?.getAttribute('aria-label')).toBe('Distribuição dos programas por categoria');
  expect(container.querySelector('.expense-donut-segment')?.getAttribute('stroke-dasharray')).not.toBe(valuesArc);
  expect(container.querySelector('.expense-donut-center strong')?.textContent).toBe(String(demoEvents.length));
  expect(container.querySelector('.expense-category-line strong')?.getAttribute('aria-label')).toBe('3 programas');
  expect(container.querySelector('.summary-amount')?.textContent).toBe(total);
  await click([...container.querySelectorAll('.expense-distribution-toggle button')].find(button => button.textContent === 'Valores')!);
  expect(container.querySelector('.expense-donut-segment')?.getAttribute('stroke-dasharray')).toBe(valuesArc);
  await click(container.querySelector('.expense-calendar-link'));
  expect(window.location.hash).toContain('/viagem/' + trip.id);
  expect(window.location.hash).toContain('tab=roteiro');
  expect(window.location.hash).toContain('day=2026-10-31');
  expect(window.location.hash).toContain('invite=shared');
  expect(container.querySelector('.month-date.selected')?.textContent).toBe('31');
});

it("troca dias no roteiro único e mantém calendário, resumo e programação sincronizados", async () => {
  vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
  await mount('/viagem/' + trip.id + '?tab=roteiro');
  expect(container.querySelector('h1')?.textContent).toBe('Roteiro');
  expect(container.querySelector('.itinerary-tabs')).toBeNull();
  expect(container.querySelector('.trip-month-header h2')?.textContent).toBe('Outubro de 2026');
  await click(container.querySelector('[aria-label="Ver 30 de outubro"]'));
  expect(window.location.hash).toContain('day=2026-10-30');
  expect(container.querySelector('.month-date[aria-pressed="true"]')?.textContent).toBe('30');
  expect(container.querySelector('.calendar-day-preview[aria-pressed="true"]')?.textContent).toContain('R$');
  expect(container.querySelectorAll('.unified-schedule .event-row')).toHaveLength(2);
  expect(container.querySelector('.timeline-heading h2')?.textContent).toContain('30');
  expect(container.querySelector('.itinerary-export')?.textContent).toBe('Exportar');
});

it("opens the existing add-program flow for the trip owner", async () => {
  authState.user = { uid: "owner-test", displayName: "Owner" };
  vi.mocked(watchTrip).mockImplementation((_id, next) => { next({...trip, ownerId: "owner-test"}); return () => {}; });
  await mount('/viagem/' + trip.id + '?tab=roteiro&day=2026-10-30');
  await click(container.querySelector('[aria-label="Programa"]'));
  await click(dialogButton('Programa'));
  expect(container.querySelector('dialog input[name="title"]')).not.toBeNull();
  expect(container.querySelector('dialog input[name="date"]')?.getAttribute('value')).toBe('2026-10-30');
});

it.each(["all", "places"])("preserva contexto de %s ao abrir, editar, cancelar/salvar e alternar abas", async type => {
  authState.user = { uid: "owner-test", displayName: "Owner" };
  vi.mocked(watchTrip).mockImplementation((_id, next) => { next({...trip, ownerId: "owner-test"}); return () => {}; });
  vi.mocked(watchEvents).mockImplementation((_id, next) => { next([demoEvents[6]]); return () => {}; });
  const path = '/viagem/' + trip.id + '?tab=roteiro&day=2026-10-31' + (type === "places" ? "&type=places" : "");
  await mount(path);
  const openItem = () => click(container.querySelector('.programs .event-row, .programs .place-list-main'));
  await openItem(); await click(container.querySelector('dialog [aria-label="Fechar"]'));
  expect(window.location.hash).toBe('#' + path);
  await openItem();
  await click(dialogButton('Editar'));
  await click(container.querySelector('dialog [aria-label="Fechar"]'));
  expect(container.querySelector('dialog')?.textContent).toContain(demoEvents[6].title);
  expect(container.querySelector('dialog form')).toBeNull();
  await click(dialogButton('Editar'));
  await act(async () => { container.querySelector('dialog form')!.dispatchEvent(new Event('submit', { bubbles:true, cancelable:true })); });
  expect(container.querySelector('dialog form')).toBeNull();
  expect(window.location.hash).toBe('#' + path);
  await click(container.querySelector('dialog [aria-label="Fechar"]'));
  for (const index of [2, 0, 1]) await click(container.querySelectorAll('.trip-tabs button')[index]);
  expect(window.location.hash).toContain('day=2026-10-31');
  expect(container.querySelector('.trip-tabs [aria-current="page"]')?.textContent).toBe('Roteiro');
  expect(container.querySelector('h1')?.textContent).toBe('Roteiro');
  if (type === "places") expect(window.location.hash).toContain('type=places');
});

it("Ver no mapa abre o dia correto; ficha e retorno preservam dia, convite e filtros", async () => {
  vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
  try {
    vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
    await mount('/viagem/' + trip.id + '?tab=roteiro&day=2026-10-30&invite=shared');
    const subscriptions = vi.mocked(watchEvents).mock.calls.length;
    await click(filtersButton());
    await select('Status', 'confirmado');
    await click(dialogButton('Ver resultados'));
    await click(container.querySelector('.calendar-map'));
    await act(async () => { await import('./components/trip/DayMap'); });
    expect(container.querySelector('h1')?.textContent).toBe('Mapa do dia');
    expect(window.location.hash).toContain('day=2026-10-30');
    expect(window.location.hash).toContain('map=day');
    expect(window.location.hash).toContain('invite=shared');
    expect(container.querySelectorAll('.day-map-stop')).toHaveLength(2);
    expect(container.querySelector('.day-map')?.textContent).toContain('30 de outubro');
    expect(document.querySelector('#rumo-google-maps')).toBeNull();
    await click(container.querySelector('.day-map-stop'));
    expect(container.querySelector('dialog')?.textContent).toContain(demoEvents[4].title);
    await click(container.querySelector('dialog [aria-label="Fechar"]'));
    expect(container.querySelector('.day-map-stop.selected')?.textContent).toContain(demoEvents[4].title);
    expect(window.location.hash).toContain('map=day');
    await click(container.querySelector('.day-map-back'));
    expect(window.location.hash).not.toContain('map=');
    expect(container.querySelector('h1')?.textContent).toBe('Roteiro');
    expect(container.querySelector('.month-date.selected')?.textContent).toBe('30');
    expect(container.querySelector('.clear-filters')).not.toBeNull();
    expect(watchEvents).toHaveBeenCalledTimes(subscriptions);
  } finally { vi.unstubAllEnvs(); }
});

it("deep link do mapa mantém bottom nav e volta ao mesmo roteiro sem depender do histórico", async () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
  try {
    vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
    await mount('/viagem/' + trip.id + '?tab=roteiro&day=2026-10-31&map=day&invite=shared');
    await act(async () => { await import('./components/trip/DayMap'); });
    expect(container.querySelectorAll('.trip-tabs button')).toHaveLength(3);
    expect(container.querySelector('.trip-tabs [aria-current="page"]')?.textContent).toBe('Roteiro');
    await click(container.querySelector('.day-map-back'));
    expect(window.location.hash).toBe('#/viagem/' + trip.id + '?tab=roteiro&day=2026-10-31&invite=shared');
    await click(container.querySelector('.calendar-map'));
    await click(container.querySelectorAll('.trip-tabs button')[2]);
    expect(window.location.hash).toContain('tab=gastos');
    expect(window.location.hash).not.toContain('map=');
    await click(container.querySelectorAll('.trip-tabs button')[1]);
    expect(container.querySelector('h1')?.textContent).toBe('Roteiro');
    expect(window.location.hash).toContain('day=2026-10-31');
  } finally { vi.unstubAllEnvs(); }
});

it("normaliza Calendário legado, troca mês/data e abre a ficha mantendo o dia", async () => {
  vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
  await mount('/viagem/' + trip.id + '?tab=roteiro&view=calendario&day=2026-10-29&invite=shared');
  expect(container.querySelector("h1")?.textContent).toBe("Roteiro");
  expect(window.location.hash).not.toContain("view=");
  expect(window.location.hash).toContain("invite=shared");
  expect(container.querySelectorAll(".unified-schedule .event-row")).toHaveLength(4);
  await click(container.querySelector('[aria-label="30 de outubro de 2026, durante a viagem, 2 programas"]'));
  expect(window.location.hash).toContain("day=2026-10-30");
  expect(container.querySelectorAll(".unified-schedule .event-row")).toHaveLength(2);
  await click(container.querySelector('[aria-label="Próximo mês"]'));
  expect(container.querySelector(".trip-month-header h2")?.textContent).toBe("Novembro de 2026");
  expect(container.querySelector(".unified-schedule")?.textContent).toContain("Manhã no parque");
  await click(container.querySelector('[aria-label="Mês anterior"]'));
  expect(container.querySelector(".trip-month-header h2")?.textContent).toBe("Outubro de 2026");
  await click(container.querySelector('[aria-label="Ver 1 de novembro"]'));
  expect(container.querySelector(".trip-month-header h2")?.textContent).toBe("Novembro de 2026");
  expect(container.querySelector('.month-date[aria-pressed="true"]')?.textContent).toBe("1");
  await click(container.querySelector(".unified-schedule .event-row"));
  expect(container.querySelector("dialog")?.textContent).toContain("Conversa de boteco");
  await click(container.querySelector('dialog [aria-label="Fechar"]'));
  expect(window.location.hash).toContain("day=2026-11-01");
  expect(container.querySelectorAll(".trip-tabs button")).toHaveLength(3);
});

it.each(["roteiro", "lugares", "calendario"])("mantém CTA Programa e o contexto ao abrir link legado de %s", async view => {
  authState.user = {uid: "owner-test", displayName: "Owner"};
  vi.mocked(watchTrip).mockImplementation((_id, next) => { next({...trip, ownerId: "owner-test"}); return () => {}; });
  await mount('/viagem/' + trip.id + '?tab=roteiro&view=' + view + '&day=2026-10-31');
  expect(container.querySelector('.site-header.itinerary-header .new-trip')?.textContent).toBe('Programa');
  expect(container.querySelector('h1')?.textContent).toBe('Roteiro');
  expect(container.querySelector('.itinerary-tabs')).toBeNull();
  expect(container.querySelector('.trip-context')?.textContent).toContain(trip.title);
  expect(container.querySelector('.trip-home-link')?.getAttribute('href')).toBe('#/');
  expect(window.location.hash).toContain('day=2026-10-31');
  expect(window.location.hash).not.toContain('view=');
});

it("busca programas de outros dias e lugares sem data, combina filtros e limpa sem novas consultas", async () => {
  const saved = {...demoEvents[0], id:"saved-place", title:"Café guardado", date:"", startTime:"", endTime:"", location:"Rua dos Ipês, Brasília", status:"confirmado" as const, priority:"imperdível" as const};
  vi.mocked(watchEvents).mockImplementation((_id, next) => { next([...demoEvents, saved]); return () => {}; });
  await mount('/viagem/' + trip.id + '?tab=roteiro&day=2026-10-29');
  const subscriptions = vi.mocked(watchEvents).mock.calls.length;
  expect(container.querySelector('.saved-places')?.textContent).toContain('Rua dos Ipês');
  await input(demoEvents[6].title);
  expect(container.querySelectorAll('.unified-schedule .event-row')).toHaveLength(1);
  expect(container.querySelector('.unified-schedule')?.textContent).toContain(demoEvents[6].title);
  await input('ipes');
  expect(container.querySelector('.saved-places')?.textContent).toContain('Rua dos Ipês');
  await click(filtersButton());
  await click(dialogButton('Lugares salvos'));
  await click(dialogButton('Comer'));
  await select('Status', 'confirmado');
  await click(dialogButton('Imperdível'));
  await click(dialogButton('Ver resultados'));
  expect(window.location.hash).toContain('type=places');
  expect(container.querySelectorAll('.place-list-main')).toHaveLength(1);
  const map = container.querySelector('.place-list-map');
  expect(map?.getAttribute('href')).toContain('https://www.google.com/maps/search/');
  await click(container.querySelector('.place-list-main'));
  expect(container.querySelector('dialog')?.textContent).toContain('Sem dia definido');
  await click(container.querySelector('dialog [aria-label="Fechar"]'));
  await click(container.querySelector('.clear-filters'));
  expect(container.querySelectorAll('.unified-schedule .event-row')).toHaveLength(4);
  expect(window.location.hash).not.toContain('type=');
  await input('cafe');
  expect(container.querySelector('.unified-schedule')?.textContent).toContain('Café com calma');
  expect(watchEvents).toHaveBeenCalledTimes(subscriptions);
});

it.each([["PDF", "PDF"], ["Excel (XLSX)", "Excel"], ["CSV", "CSV"]])("conecta %s ao serviço existente e exporta o roteiro completo", async (label, format) => {
  vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
  await mount('/viagem/' + trip.id + '?tab=roteiro&day=2026-10-30');
  await input('parque');
  await click(container.querySelector('.itinerary-export'));
  await click(dialogButton(label));
  expect(exportTrip).toHaveBeenCalledWith(trip, demoEvents, format);
  expect(container.querySelector('dialog')).toBeNull();
  expect(window.location.hash).toContain('day=2026-10-30');
});
