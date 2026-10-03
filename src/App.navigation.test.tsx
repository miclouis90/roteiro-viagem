// @vitest-environment jsdom
import { act, StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { demoTrip, demoEvents } from "./data/demo";
import { watchEvents, watchTrip, watchTrips } from "./services/repository";

const authState = vi.hoisted(() => ({ admin: false, user: null as null | {uid: string; displayName: string} }));
vi.mock("./lib/firebase", () => ({ db: null, auth: null, demoMode: false, configured: true }));
vi.mock("./hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ user: authState.user, admin: authState.admin, loading: false, error: "", login: vi.fn(), logout: vi.fn() }),
}));
vi.mock("./services/repository", () => ({ watchTrips: vi.fn(), watchTrip: vi.fn(), watchEvents: vi.fn(), saveEvent: vi.fn().mockResolvedValue("demo-6") }));
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
  expect(container.querySelector("h1")?.textContent).toBe("Oi 👋");
  authState.user = {uid:"test-user",displayName:"  Ana Maria  "};
  await mount("/");
  expect(container.querySelector("h1")?.textContent).toBe("Oi, Ana 👋");
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
  expect(window.location.hash).toBe(`#${path}`);
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
it("keeps itinerary tools secondary and switches days without leaving the trip", async () => {
  await mount(`/viagem/${trip.id}?tab=roteiro`);
  expect(container.querySelector('.itinerary-search')?.hasAttribute('open')).toBe(false);
  const days = container.querySelectorAll('.day-picker button');
  await click(days[1]);
  expect(days[1].getAttribute('aria-pressed')).toBe('true');
  expect(window.location.hash).toContain('day=2026-10-30');
  expect(container.querySelector('.timeline-heading h3')?.textContent).toContain('30');
  expect(container.querySelector('.itinerary-display')).not.toBeNull();
});

it("opens the existing add-program flow for the trip owner", async () => {
  authState.user = { uid: "owner-test", displayName: "Owner" };
  vi.mocked(watchTrip).mockImplementation((_id, next) => { next({...trip, ownerId: "owner-test"}); return () => {}; });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
  await mount(`/viagem/${trip.id}?tab=roteiro&day=2026-10-30`);
  await click(container.querySelector('[aria-label="Adicionar programa"]'));
  await click([...container.querySelectorAll('dialog button')].find(button => button.textContent === 'Programa')!);
  expect(container.querySelector('dialog input[name="title"]')).not.toBeNull();
  expect(container.querySelector('dialog input[name="date"]')?.getAttribute('value')).toBe('2026-10-30');
});

it.each(["roteiro", "lugares"])("preserves %s context through details, editing and tabs", async view => {
  authState.user = { uid: "owner-test", displayName: "Owner" };
  vi.mocked(watchTrip).mockImplementation((_id, next) => { next({...trip, ownerId: "owner-test"}); return () => {}; });
  vi.mocked(watchEvents).mockImplementation((_id, next) => { next([demoEvents[6]]); return () => {}; });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
  const path = `/viagem/${trip.id}?tab=roteiro&day=2026-10-31${view === "lugares" ? "&view=lugares" : ""}`;
  await mount(path);
  const openItem = () => click(container.querySelector('.programs .event-row, .programs .place-list-main'));
  await openItem();
  await click(container.querySelector('dialog [aria-label="Fechar"]'));
  expect(window.location.hash).toBe(`#${path}`);
  await openItem();
  const edit = () => click([...container.querySelectorAll('dialog button')].find(button => button.textContent === 'Editar')!);
  await edit();
  await click(container.querySelector('dialog [aria-label="Fechar"]'));
  expect(container.querySelector('dialog')?.textContent).toContain(demoEvents[6].title);
  expect(container.querySelector('dialog form')).toBeNull();
  await edit();
  await act(async () => { container.querySelector('dialog form')!.dispatchEvent(new Event('submit', {bubbles:true,cancelable:true})); });
  expect(container.querySelector('dialog form')).toBeNull();
  expect(window.location.hash).toBe(`#${path}`);
  await click(container.querySelector('dialog [aria-label="Fechar"]'));
  for (const index of [2, 0, 1]) await click(container.querySelectorAll('.trip-tabs button')[index]);
  expect(window.location.hash).toContain('day=2026-10-31');
  expect(container.querySelector('.itinerary-tabs [aria-pressed="true"]')?.textContent).toBe(view === "lugares" ? 'Lugares' : 'Roteiro');
  expect(container.querySelector('.trip-tabs [aria-current="page"]')?.textContent).toBe('Roteiro');
});
