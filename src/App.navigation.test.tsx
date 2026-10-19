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
function modeButton(mode: 'Explorar' | 'Mapa') { return [...container.querySelectorAll('.itinerary-mode-switch button')].find(button => button.textContent === mode)!; }
function categoryButton(label: string) { return [...container.querySelectorAll('.explore-categories button')].find(button => button.textContent === label)!; }

it("Explorar filtra categorias de vários dias, busca global e preserva tudo ao alternar Mapa/ficha", async () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
  try {
    const saved = { ...demoEvents[0], id: 'saved-only', title: 'Café guardado', date: '', location: 'Rua dos Ipês', startTime: '' };
    vi.mocked(watchEvents).mockImplementation((_id, next) => { next([saved, ...demoEvents.slice().reverse()]); return () => {}; });
    await mount('/viagem/' + trip.id + '?tab=roteiro&day=2026-10-30&invite=shared');
    const subscriptions = vi.mocked(watchEvents).mock.calls.length;
    expect([...container.querySelectorAll('.explore-categories button')].map(button => button.textContent)).toEqual(['Todos', 'Comer', 'Beber', 'Cultura', 'Passear', 'Transporte', 'Outro']);
    expect([...container.querySelectorAll('.explore-program-copy > strong')].map(title => title.textContent)).toEqual(demoEvents.map(event => event.title));
    expect(container.querySelector('.trip-calendar')?.closest('[hidden]')).not.toBeNull();
    expect(container.querySelector('.timeline')).toBeNull();
    expect(container.querySelector('.saved-places')?.textContent).toContain('Sem data definida');
    await click(categoryButton('Comer'));
    expect(container.querySelectorAll('.explore-program')).toHaveLength(3);
    expect(container.querySelector('.explore-programs')?.textContent).toContain('31 de out. de 2026');
    expect(container.querySelector('.saved-places')?.textContent).toContain('Rua dos Ipês');
    await input('lago sul');
    expect(container.querySelectorAll('.explore-program')).toHaveLength(1);
    expect(container.querySelector('.explore-program')?.textContent).toContain('Mesa para dois');
    await click(container.querySelector('.explore-program'));
    expect(container.querySelector('dialog')?.textContent).toContain('Mesa para dois');
    await click(container.querySelector('dialog [aria-label="Fechar"]'));
    expect(window.location.hash).toContain('day=2026-10-30');
    await click(modeButton('Mapa'));
    await act(async () => { await import('./components/trip/DayMap'); });
    expect(container.querySelectorAll('.day-map-stop')).toHaveLength(2);
    await click(container.querySelector('[aria-label="Ver 31 de outubro"]'));
    expect(container.querySelector('.day-map-stop')?.textContent).toContain('Mesa para dois');
    await click(modeButton('Explorar'));
    expect(categoryButton('Comer').getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector<HTMLInputElement>('.toolbar input')?.value).toBe('lago sul');
    expect(container.querySelectorAll('.explore-program')).toHaveLength(1);
    expect(window.location.hash).toContain('day=2026-10-31');
    expect(window.location.hash).toContain('invite=shared');
    await input('');
    await click(categoryButton('Todos'));
    expect(container.querySelectorAll('.explore-program')).toHaveLength(demoEvents.length);
    await input('museu');
    expect(container.querySelector('.explore-program')?.textContent).toContain('Um encontro com a arte');
    await input('ipes');
    expect(container.querySelectorAll('.explore-program')).toHaveLength(0);
    await click(container.querySelector('.place-list-main'));
    expect(container.querySelector('dialog')?.textContent).toContain('Café guardado');
    expect(container.querySelector('dialog')?.textContent).toContain('Sem dia definido');
    await click(container.querySelector('dialog [aria-label="Fechar"]'));
    expect(watchEvents).toHaveBeenCalledTimes(subscriptions);
  } finally { vi.unstubAllEnvs(); }
});

it.each([false, true])("mantém um único Trip Shell e a mesma navegação antes do conteúdo (owner=%s)", async owner => {
  if (owner) authState.user = { uid: 'shell-owner', displayName: 'Owner' };
  const currentTrip = { ...trip, ownerId: owner ? 'shell-owner' : 'another-owner', title: 'Uma viagem com um nome longo para manter o contexto sem deslocar a navegação' };
  vi.mocked(watchTrip).mockImplementation((_id, next) => { next(currentTrip); return () => {}; });
  vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
  await mount('/viagem/' + trip.id + '?day=2026-10-31&invite=shared');
  const shell = container.querySelector('.trip-shell');
  const header = shell?.querySelector('.site-header');
  const context = shell?.querySelector('.trip-context');
  const nav = shell?.querySelector('.trip-tabs');
  const subscriptions = vi.mocked(watchEvents).mock.calls.length;
  expect(shell).not.toBeNull();
  for (const label of ['Visão geral', 'Roteiro', 'Gastos', 'Visão geral']) {
    await click([...container.querySelectorAll('.trip-tabs button')].find(button => button.textContent === label)!);
    expect(container.querySelector('.trip-shell')).toBe(shell);
    expect(container.querySelectorAll('.site-header')).toHaveLength(1);
    expect(container.querySelector('.site-header')).toBe(header);
    expect(container.querySelector('.trip-context')).toBe(context);
    expect(container.querySelector('.trip-tabs')).toBe(nav);
    expect(container.querySelectorAll('.trip-tabs')).toHaveLength(1);
    expect(nav?.querySelector('[aria-current="page"]')?.textContent).toBe(label);
    expect(nav!.compareDocumentPosition(container.querySelector('.trip-shell-page')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('.trip-context-name')?.textContent).toBe(currentTrip.title);
    expect(container.querySelectorAll('.trip-home-link')).toHaveLength(1);
    expect(container.querySelector('.trip-home-link')?.getAttribute('href')).toBe('#/');
    expect(window.location.hash).toContain('day=2026-10-31');
    expect(window.location.hash).toContain('invite=shared');
    if (label === 'Visão geral') {
      expect(container.querySelector('.overview-hero h1')?.textContent).toBe(currentTrip.title);
      expect(container.querySelector('.overview-destination-art.destination-brasilia')).not.toBeNull();
    }
    if (label === 'Gastos') {
      expect(container.querySelector('.expense-donut svg')).not.toBeNull();
      expect(container.querySelector('.summary-amount')?.textContent).toContain('696,00');
    }
  }
  expect(watchEvents).toHaveBeenCalledTimes(subscriptions);
});

it("retorna ao modo Mapa e à data após alternar entre as abas do Trip Shell", async () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
  try {
    vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
    await mount('/viagem/' + trip.id + '?tab=roteiro&day=2026-10-31&map=day&invite=shared');
    await act(async () => { await import('./components/trip/DayMap'); });
    const nav = container.querySelector('.trip-tabs');
    for (const index of [2, 0, 1]) await click(container.querySelectorAll('.trip-tabs button')[index]);
    await act(async () => {});
    expect(container.querySelector('.trip-tabs')).toBe(nav);
    expect(modeButton('Mapa').getAttribute('aria-pressed')).toBe('true');
    expect(window.location.hash).toContain('day=2026-10-31');
    expect(window.location.hash).toContain('map=day');
    expect(window.location.hash).toContain('invite=shared');
    expect(container.querySelector('.month-date.selected')?.textContent).toBe('31');
    expect(container.querySelector('.day-map-stop')?.textContent).toContain('Mesa para dois');
    await click(modeButton('Explorar'));
    for (const index of [2, 1]) await click(container.querySelectorAll('.trip-tabs button')[index]);
    expect(modeButton('Explorar').getAttribute('aria-pressed')).toBe('true');
    expect(window.location.hash).not.toContain('map=');
    expect(window.location.hash).toContain('day=2026-10-31');
  } finally { vi.unstubAllEnvs(); }
});

it("alterna a distribuição de Gastos e abre um card diário mantendo viagem, dia e convite", async () => {
  vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
  await mount('/viagem/' + trip.id + '?tab=gastos&day=2026-10-31&invite=shared');
  const total = container.querySelector('.summary-amount')?.textContent;
  expect(container.querySelector('.expense-donut-center strong')?.textContent).toBe('100%');
  expect(container.querySelector('.expense-recap')).toBeNull();
  expect(container.querySelector('.expense-calendar-link')).toBeNull();
  const valuesArc = container.querySelector('.expense-donut-segment')?.getAttribute('stroke-dasharray');
  await click([...container.querySelectorAll('.expense-distribution-toggle button')].find(button => button.textContent === 'Programas')!);
  expect(container.querySelector('.expense-donut svg')?.getAttribute('aria-label')).toBe('Distribuição dos programas por categoria');
  expect(container.querySelector('.expense-donut-segment')?.getAttribute('stroke-dasharray')).not.toBe(valuesArc);
  expect(container.querySelector('.expense-donut-center strong')?.textContent).toBe(String(demoEvents.length));
  expect(container.querySelector('.expense-category-line strong')?.getAttribute('aria-label')).toBe('3 programas');
  expect(container.querySelector('.summary-amount')?.textContent).toBe(total);
  await click([...container.querySelectorAll('.expense-distribution-toggle button')].find(button => button.textContent === 'Valores')!);
  expect(container.querySelector('.expense-donut-segment')?.getAttribute('stroke-dasharray')).toBe(valuesArc);
  await click(container.querySelector('.expense-day time[datetime="2026-10-31"]')?.closest('button') || null);
  expect(window.location.hash).toContain('/viagem/' + trip.id);
  expect(window.location.hash).toContain('tab=roteiro');
  expect(window.location.hash).toContain('day=2026-10-31');
  expect(window.location.hash).toContain('invite=shared');
  expect(container.querySelector('.month-date.selected')?.textContent).toBe('31');
});

it("abre cada estimativa diária no Roteiro na data exata, mantendo viagem e convite", async () => {
  vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
  await mount('/viagem/' + trip.id + '?tab=gastos&day=2026-10-29&invite=shared');
  const subscriptions = vi.mocked(watchEvents).mock.calls.length;
  for (const day of ['2026-10-30', '2026-11-02']) {
    const card = [...container.querySelectorAll('.expense-day')].find(element => element.querySelector('time')?.getAttribute('datetime') === day)!;
    await click(card.querySelector('button'));
    expect(window.location.hash).toContain('/viagem/' + trip.id);
    expect(window.location.hash).toContain('tab=roteiro');
    expect(window.location.hash).toContain('day=' + day);
    expect(window.location.hash).toContain('invite=shared');
    expect(container.querySelector('.itinerary-day.selected time')).toBeNull();
    expect(container.querySelector('.itinerary-day.selected')?.getAttribute('aria-label')).toContain(day === '2026-10-30' ? '30 de outubro' : '2 de novembro');
    expect(modeButton('Explorar').getAttribute('aria-pressed')).toBe('true');
    await click(container.querySelectorAll('.trip-tabs button')[2]);
  }
  expect(watchEvents).toHaveBeenCalledTimes(subscriptions);
});

it("Explorar mostra todos os dias sem controles de data e Mapa preserva o dia escolhido", async () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
  try {
  vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
  await mount('/viagem/' + trip.id + '?tab=roteiro&day=2026-10-29');
  expect(container.querySelector('h1')?.textContent).toBe('Roteiro');
  expect(container.querySelector('.itinerary-tabs')).toBeNull();
  expect(container.querySelector('.trip-month')?.hasAttribute('hidden')).toBe(true);
  expect(container.querySelector('.itinerary-calendar-toggle')?.getAttribute('aria-expanded')).toBe('false');
  expect(container.querySelector('.trip-calendar')?.closest('[hidden]')).not.toBeNull();
  expect(container.querySelectorAll('.explore-program')).toHaveLength(demoEvents.length);
  expect(container.querySelector('.timeline')).toBeNull();
  await click(modeButton('Mapa'));
  await act(async () => { await import('./components/trip/DayMap'); });
  expect(container.querySelector('.trip-calendar')?.closest('[hidden]')).toBeNull();
  expect(container.querySelector('.calendar-day-preview')).toBeNull();
  expect(container.querySelector('.itinerary-period')?.textContent).toContain('29 out. – 3 nov.');
  await click(container.querySelector('.itinerary-calendar-toggle'));
  expect(container.querySelector('.trip-month')?.hasAttribute('hidden')).toBe(false);
  expect(container.querySelector('.trip-month-header h2')?.textContent).toBe('Outubro de 2026');
  await click(container.querySelector('[aria-label="Ver 30 de outubro"]'));
  expect(window.location.hash).toContain('day=2026-10-30');
  expect(container.querySelector('.month-date[aria-pressed="true"]')?.textContent).toBe('30');
  expect(container.querySelector('.itinerary-day[aria-pressed="true"]')?.textContent).toBe('sex30');
  expect(container.querySelectorAll('.day-map-stop')).toHaveLength(2);
  await click(modeButton('Explorar'));
  expect(container.querySelectorAll('.unified-schedule .explore-program')).toHaveLength(demoEvents.length);
  expect(container.querySelector('.timeline-heading h2')?.textContent).toBe('Todos os programas');
  expect(container.querySelector('.trip-calendar')?.closest('[hidden]')).not.toBeNull();
  expect(window.location.hash).toContain('day=2026-10-30');
  expect(container.querySelector('.itinerary-export')?.textContent).toBe('Exportar');
  } finally { vi.unstubAllEnvs(); }
});

it("recolhe o calendário sem perder mês/data e mantém controles compactos nos dois modos", async () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
  try {
    vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
    await mount('/viagem/' + trip.id + '?tab=roteiro&day=2026-10-31&map=day&invite=shared');
    const calendar = container.querySelector('.trip-month')!;
    const toggle = container.querySelector('.itinerary-calendar-toggle')!;
    expect(toggle.getAttribute('aria-controls')).toBe(calendar.id);
    expect(calendar.hasAttribute('hidden')).toBe(true);
    expect(container.querySelectorAll('.itinerary-day')).toHaveLength(6);
    expect(container.querySelector('.itinerary-day.selected')?.textContent).toBe('sáb31');
    expect(container.querySelector('.trip-calendar')!.compareDocumentPosition(container.querySelector('.itinerary-mode-switch')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await click(toggle);
    await click(container.querySelector('[aria-label="Próximo mês"]'));
    await click(toggle);
    expect(calendar.hasAttribute('hidden')).toBe(true);
    await click(modeButton('Explorar'));
    expect(container.querySelector('.trip-calendar')?.closest('[hidden]')).not.toBeNull();
    await click(modeButton('Mapa'));
    await act(async () => { await import('./components/trip/DayMap'); });
    expect(container.querySelector('.itinerary-list')?.hasAttribute('hidden')).toBe(true);
    expect(container.querySelector('.day-map-intro')).toBeNull();
    expect(window.location.hash).toContain('day=2026-10-31');
    await click(toggle);
    expect(container.querySelector('.trip-month-header h2')?.textContent).toBe('Novembro de 2026');
    await click(container.querySelector('[aria-label="1 de novembro de 2026, durante a viagem, 1 programa"]'));
    expect(window.location.hash).toContain('map=day');
    expect(window.location.hash).toContain('day=2026-11-01');
    expect(container.querySelector('.itinerary-day.selected')?.textContent).toBe('dom1');
    expect(container.querySelector('.day-map-stop')?.textContent).toContain('Conversa de boteco');
    await click(toggle);
    await click(container.querySelector('.day-map-stop'));
    await click(container.querySelector('dialog [aria-label="Fechar"]'));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(modeButton('Mapa').getAttribute('aria-pressed')).toBe('true');
    await click(modeButton('Explorar'));
    expect(container.querySelector('.itinerary-list')?.hasAttribute('hidden')).toBe(false);
    expect(container.querySelector('.unified-schedule')?.textContent).toContain('Conversa de boteco');
    expect(window.location.hash).toContain('day=2026-11-01');
    expect(window.location.hash).toContain('invite=shared');
    await click(container.querySelector('.unified-schedule .explore-program'));
    await click(container.querySelector('dialog [aria-label="Fechar"]'));
    expect(container.querySelector('.itinerary-day.selected')?.textContent).toBe('dom1');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  } finally { vi.unstubAllEnvs(); }
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
  const openItem = () => click(container.querySelector('.programs .explore-program, .programs .place-list-main'));
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

it("Lista/Mapa mantém dia, convite, filtros e retorno da ficha no mesmo modo", async () => {
  vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
  try {
    vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
    await mount('/viagem/' + trip.id + '?tab=roteiro&day=2026-10-30&invite=shared');
    const subscriptions = vi.mocked(watchEvents).mock.calls.length;
    await click(filtersButton());
    await select('Status', 'confirmado');
    await click(dialogButton('Ver resultados'));
    const calendar = container.querySelector('.trip-calendar');
    await click(modeButton('Mapa'));
    await act(async () => { await import('./components/trip/DayMap'); });
    expect(container.querySelector('h1')?.textContent).toBe('Roteiro');
    expect(container.querySelector('.trip-calendar')).toBe(calendar);
    expect(container.querySelectorAll('.trip-calendar')).toHaveLength(1);
    expect(calendar?.closest('[hidden]')).toBeNull();
    expect(modeButton('Mapa').getAttribute('aria-pressed')).toBe('true');
    expect(window.location.hash).toContain('day=2026-10-30');
    expect(window.location.hash).toContain('map=day');
    expect(window.location.hash).toContain('invite=shared');
    expect(container.querySelectorAll('.day-map-stop')).toHaveLength(2);
    expect(container.querySelector('.day-map')?.getAttribute('aria-description')).toContain('30 de outubro');
    expect(document.querySelector('#rumo-google-maps')).toBeNull();
    await click(container.querySelector('.day-map-stop'));
    expect(container.querySelector('dialog')?.textContent).toContain(demoEvents[4].title);
    await click(container.querySelector('dialog [aria-label="Fechar"]'));
    expect(container.querySelector('.day-map-stop.selected')?.textContent).toContain(demoEvents[4].title);
    expect(window.location.hash).toContain('map=day');
    await click(modeButton('Explorar'));
    expect(window.location.hash).not.toContain('map=');
    expect(container.querySelector('h1')?.textContent).toBe('Roteiro');
    expect(container.querySelector('.month-date.selected')?.textContent).toBe('30');
    expect(container.querySelector('.clear-filters')).not.toBeNull();
    expect(container.querySelector('.trip-calendar')).toBe(calendar);
    expect(watchEvents).toHaveBeenCalledTimes(subscriptions);
  } finally { vi.unstubAllEnvs(); }
});

it("deep link map=day ativa Mapa no Roteiro e alterna Lista sem depender do histórico", async () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
  try {
    vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
    await mount('/viagem/' + trip.id + '?tab=roteiro&day=2026-10-31&map=day&invite=shared');
    await act(async () => { await import('./components/trip/DayMap'); });
    expect(container.querySelector('h1')?.textContent).toBe('Roteiro');
    expect(modeButton('Mapa').getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('.month-date.selected')?.textContent).toBe('31');
    expect(container.querySelectorAll('.trip-tabs button')).toHaveLength(3);
    expect(container.querySelector('.trip-tabs [aria-current="page"]')?.textContent).toBe('Roteiro');
    await click(modeButton('Explorar'));
    expect(window.location.hash).toBe('#/viagem/' + trip.id + '?tab=roteiro&day=2026-10-31&invite=shared');
    await click(modeButton('Mapa'));
    await click(container.querySelectorAll('.trip-tabs button')[2]);
    expect(window.location.hash).toContain('tab=gastos');
    expect(window.location.hash).not.toContain('map=');
    await click(container.querySelectorAll('.trip-tabs button')[1]);
    expect(container.querySelector('h1')?.textContent).toBe('Roteiro');
    expect(window.location.hash).toContain('day=2026-10-31');
  } finally { vi.unstubAllEnvs(); }
});

it("muda de data no Mapa pelo carrossel e calendário e sincroniza paradas, valores e link", async () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
  try {
    vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
    await mount('/viagem/' + trip.id + '?tab=roteiro&day=2026-10-29&map=day&invite=shared');
    await act(async () => { await import('./components/trip/DayMap'); });
    const subscriptions = vi.mocked(watchEvents).mock.calls.length;
    const firstLink = container.querySelector('.day-map-external')?.getAttribute('href');
    await click(container.querySelector('[aria-label="Ver 30 de outubro"]'));
    expect(window.location.hash).toContain('map=day');
    expect(window.location.hash).toContain('day=2026-10-30');
    expect(window.location.hash).toContain('invite=shared');
    expect(container.querySelector('.month-date.selected')?.textContent).toBe('30');
    expect(container.querySelector('.itinerary-day.selected')?.textContent).toContain('30');
    expect(container.querySelectorAll('.day-map-stop')).toHaveLength(2);
    expect(container.querySelector('.day-map-stops')?.textContent).toContain('08:30');
    expect(container.querySelector('.day-map-summary')?.textContent).toContain('120,00');
    expect(container.querySelector('.day-map-external')?.getAttribute('href')).not.toBe(firstLink);
    await click(container.querySelector('.day-map-stop'));
    expect(container.querySelector('dialog')?.textContent).toContain('Manhã no parque');
    await click(container.querySelector('dialog [aria-label="Fechar"]'));
    expect(modeButton('Mapa').getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('.day-map-stop.selected')?.textContent).toContain('Manhã no parque');
    await click(modeButton('Explorar'));
    expect(window.location.hash).toContain('day=2026-10-30');
    expect(container.querySelector('.unified-schedule')?.textContent).toContain('Manhã no parque');
    await click(modeButton('Mapa'));
    await click(container.querySelector('.itinerary-calendar-toggle'));
    await click(container.querySelector('[aria-label="Próximo mês"]'));
    expect(window.location.hash).toContain('day=2026-10-30');
    expect(container.querySelectorAll('.day-map-stop')).toHaveLength(2);
    await click(container.querySelector('[aria-label="2 de novembro de 2026, durante a viagem"]'));
    expect(window.location.hash).toContain('day=2026-11-02');
    expect(container.querySelector('.trip-month-header h2')?.textContent).toBe('Novembro de 2026');
    expect(container.querySelectorAll('.day-map-stop')).toHaveLength(0);
    expect(container.querySelector('.day-map-external')).toBeNull();
    expect(watchEvents).toHaveBeenCalledTimes(subscriptions);
  } finally { vi.unstubAllEnvs(); }
});

it("normaliza Calendário legado, troca mês/data e abre a ficha mantendo o dia", async () => {
  vi.mocked(watchEvents).mockImplementation((_id, next) => { next(demoEvents); return () => {}; });
  await mount('/viagem/' + trip.id + '?tab=roteiro&view=calendario&day=2026-10-29&invite=shared');
  expect(container.querySelector("h1")?.textContent).toBe("Roteiro");
  expect(window.location.hash).not.toContain("view=");
  expect(window.location.hash).toContain("invite=shared");
  expect(container.querySelectorAll(".unified-schedule .explore-program")).toHaveLength(demoEvents.length);
  await click(modeButton('Mapa'));
  await act(async () => { await import('./components/trip/DayMap'); });
  await click(container.querySelector('.itinerary-calendar-toggle'));
  await click(container.querySelector('[aria-label="30 de outubro de 2026, durante a viagem, 2 programas"]'));
  expect(window.location.hash).toContain("day=2026-10-30");
  expect(container.querySelectorAll(".day-map-stop")).toHaveLength(2);
  await click(container.querySelector('[aria-label="Próximo mês"]'));
  expect(container.querySelector(".trip-month-header h2")?.textContent).toBe("Novembro de 2026");
  expect(container.querySelector(".unified-schedule")?.textContent).toContain("Manhã no parque");
  await click(container.querySelector('[aria-label="Mês anterior"]'));
  expect(container.querySelector(".trip-month-header h2")?.textContent).toBe("Outubro de 2026");
  await click(container.querySelector('[aria-label="Ver 1 de novembro"]'));
  expect(container.querySelector(".trip-month-header h2")?.textContent).toBe("Novembro de 2026");
  expect(container.querySelector('.month-date[aria-pressed="true"]')?.textContent).toBe("1");
  await click(container.querySelector(".day-map-stop"));
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
  expect(container.querySelectorAll('.unified-schedule .explore-program')).toHaveLength(1);
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
  expect(container.querySelectorAll('.unified-schedule .explore-program')).toHaveLength(demoEvents.length);
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
