// @vitest-environment jsdom
import { act, StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { demoTrip } from "./data/demo";
import { watchEvents, watchTrip, watchTrips } from "./services/repository";

const authState = vi.hoisted(() => ({ admin: false }));
vi.mock("./lib/firebase", () => ({ db: {}, auth: null, demoMode: false, configured: true }));
vi.mock("./hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ user: null, admin: authState.admin, loading: false, error: "", login: vi.fn(), logout: vi.fn() }),
}));
vi.mock("./services/repository", () => ({ watchTrips: vi.fn(), watchTrip: vi.fn(), watchEvents: vi.fn() }));
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
  expect(container.querySelector("main.home")?.textContent).toContain("Brasília da Mel");
}
beforeEach(() => {
  authState.admin = false;
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
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("Home sem contexto de viagem", () => {
  it("renderiza a listagem ao abrir diretamente /", async () => {
    await mount("/"); expectHome(); expect(watchTrip).not.toHaveBeenCalled(); expect(watchEvents).not.toHaveBeenCalled();
  });
  it("renderiza Home após clicar Viagens e permite reabrir a viagem e suas abas", async () => {
    await mount(`/viagem/${trip.id}`);
    expect(container.querySelector("h1")?.textContent).toBe(trip.title);
    await click(container.querySelector('.trip-tabs a[href="#/"]'));
    expect(window.location.hash).toBe("#/"); expectHome();
    expect(vi.mocked(watchEvents).mock.calls.every(([id]) => id === trip.id)).toBe(true);
    await click(container.querySelector(`main.home a[href="#/viagem/${trip.id}"]`));
    expect(container.querySelector("h1")?.textContent).toBe(trip.title);
    for (const label of ["Roteiro", "Gastos", "Visão geral"]) {
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
it("preserva a criação e marca Viagens ativa sem escolher uma viagem implicitamente", async () => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
  authState.admin = true;
  await mount("/");
  expect(container.querySelector('.trip-tabs a[aria-current="page"]')?.textContent).toBe("Viagens");
  expect(container.querySelector('.trip-tabs button:disabled')).not.toBeNull();
  await click(container.querySelector('button[aria-label="Criar viagem"]'));
  expect(container.querySelector('dialog')?.textContent).toContain("Uma nova viagem");
});
it("retorna pela navegação da Home à viagem selecionada", async () => {
  await mount(`/viagem/${trip.id}`);
  await click(container.querySelector('.trip-tabs a[href="#/"]'));
  expectHome();
  await click([...container.querySelectorAll('.trip-tabs button')].find(b => b.textContent === "Roteiro")!);
  expect(container.querySelector('h1')?.textContent).toBe("Roteiro");
});