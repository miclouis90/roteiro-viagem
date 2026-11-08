// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const session = vi.hoisted(() => ({ user: { uid: "alice", displayName: "Alice" } as null | { uid: string; displayName: string }, admin: false }));
vi.mock("../lib/firebase", () => ({ db: null, auth: null, demoMode: true, configured: true }));
vi.mock("../hooks/useAuth", () => ({ AuthProvider: ({ children }: { children: ReactNode }) => children, useAuth: () => ({ user: session.user, admin: session.admin, loading: false, error: "", toggleDemo: vi.fn(), login: vi.fn(), logout: vi.fn() }) }));
import App from "../App";
let root: Root, container: HTMLDivElement;
const key = "rumo-personal-events-v1";
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); session.user = { uid: "alice", displayName: "Alice" }; session.admin = false;
  localStorage.removeItem(key); localStorage.setItem("rumo:onboarding-completed", "true"); window.history.replaceState(null, "", "/#/");
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.open = false; } });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {}); container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); localStorage.removeItem(key); localStorage.removeItem("rumo:onboarding-completed"); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function mount() { await act(async () => root.render(<App />)); }
async function click(element: Element | null) { expect(element).not.toBeNull(); await act(async () => (element as HTMLElement).click()); }
function button(text: string) { return [...container.querySelectorAll('button')].find(item => item.textContent === text) || null; }
async function change(name: string, value: string) {
  const field = container.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
  expect(field).not.toBeNull(); const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(field, value); field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? "change" : "input", { bubbles: true })); });
}
async function newForm() { await click(container.querySelector('[aria-label="Novo"]')); await click([...container.querySelectorAll('.new-item-choice button')].find(item => item.querySelector('strong')?.textContent === "Evento")!); }
async function essentials(category = "show") { for (const [name, value] of [["title", "Experiência pessoal"], ["category", category], ["date", "2026-11-20"], ["startTime", "22:00"], ["city", "São Paulo"], ["location", "Teatro da cidade"]]) await change(name, value); }
async function submit() { await act(async () => container.querySelector('form')!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))); }

it.each(["show", "theater", "sport", "cultural", "other"])("cria %s com o essencial para usuário comum e abre a ficha privada", async category => {
  const tripsBefore = localStorage.getItem("rumo-demo-v1"), financialBefore = localStorage.getItem("rumo-financial-v1");
  await mount(); await newForm(); expect(container.querySelectorAll('dialog')).toHaveLength(1); await essentials(category); await submit();
  expect(window.location.hash).toContain("/eventos?event="); expect(container.querySelector('dialog h2')?.textContent).toBe("Experiência pessoal");
  const rows = JSON.parse(localStorage.getItem(key)!).alice; expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ category, ownerId: "alice", date: "2026-11-20" }); expect(rows[0]).not.toHaveProperty("priceCents");
  expect(localStorage.getItem("rumo-demo-v1")).toBe(tripsBefore); expect(localStorage.getItem("rumo-financial-v1")).toBe(financialBefore);
});
it("edita pago/grátis e opcionais, relê após remontar e exige confirmação ao excluir", async () => {
  await mount(); await newForm(); await essentials(); await change("endTime", "02:00"); await change("price", "89,39"); await change("ticketUrl", "https://example.test/ingresso"); await change("notes", "RESERVA PRIVADA");
  expect(container.querySelector('form')?.textContent).toContain("dia seguinte"); await submit();
  expect(container.querySelector('dialog')?.textContent).toContain("89,39"); expect(container.querySelector('dialog a')?.getAttribute("rel")).toContain("noopener");
  await click(button("Editar evento")); await change("title", "Experiência editada"); await change("price", "0"); await change("ticketUrl", ""); await change("notes", ""); await submit();
  expect(container.querySelector('dialog')?.textContent).toContain("Grátis"); expect(container.querySelector('dialog')?.textContent).not.toContain("RESERVA PRIVADA");
  const rows = JSON.parse(localStorage.getItem(key)!).alice; expect(rows).toHaveLength(1); expect(rows[0]).not.toHaveProperty("ticketUrl"); expect(rows[0]).not.toHaveProperty("notes");
  await act(async () => root.unmount()); root = createRoot(container); await mount(); expect(container.querySelector('dialog h2')?.textContent).toBe("Experiência editada");
  await click(button("Excluir")); expect(container.querySelector('dialog h2')?.textContent).toBe("Excluir evento?"); await click(button("Cancelar")); expect(JSON.parse(localStorage.getItem(key)!).alice).toHaveLength(1);
  await click(button("Excluir")); await click(button("Excluir evento")); expect(JSON.parse(localStorage.getItem(key)!).alice).toHaveLength(0); expect(container.querySelector('dialog')).toBeNull();
});
it("inclui eventos na Agenda unificada e preserva Meus eventos e os cards de viagens", async () => {
  await mount(); await newForm(); await essentials(); await submit(); await click(container.querySelector('dialog [aria-label="Fechar"]'));
  await click(container.querySelector('.brand')); await click(container.querySelector('#home-view-agenda'));
  expect(container.querySelector('.period-calendar')).not.toBeNull();
  const month = container.querySelector<HTMLSelectElement>('[aria-label="Mês da agenda"]')!;
  const year = container.querySelector<HTMLSelectElement>('[aria-label="Ano da agenda"]')!;
  await act(async () => { year.value = "2026"; year.dispatchEvent(new Event("change", { bubbles: true })); });
  await act(async () => { month.value = "11"; month.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(container.querySelector('[data-event-point]')?.getAttribute('title')).toContain("Experiência pessoal");
  await click(container.querySelector('#home-view-trips')); expect(container.querySelector('.home-trip')).not.toBeNull();
  await click(container.querySelector('.home-personal-link')); expect(container.querySelector('.personal-event-card')?.textContent).toContain("Experiência pessoal");
});
it("oculta registros e fecha formulários ao trocar de conta ou sair", async () => {
  await mount(); await newForm(); await essentials(); await submit(); await click(button("Editar evento"));
  session.user = { uid: "bob", displayName: "Bob" }; await mount(); expect(container.querySelector('dialog')).toBeNull(); expect(container.textContent).not.toContain("Experiência pessoal");
  session.user = null; await mount(); expect(container.querySelector('.personal-event-card')).toBeNull(); expect(container.textContent).toContain("Entre na sua conta");
  expect(container.querySelector('[aria-label="Novo"]')).toBeNull();
});
it("preserva permissão de criação de viagem e não mistura formulários", async () => {
  await mount(); await click(container.querySelector('[aria-label="Novo"]'));
  const trip = [...container.querySelectorAll<HTMLButtonElement>('.new-item-choice button')].find(item => item.querySelector('strong')?.textContent === "Viagem")!;
  expect(trip.disabled).toBe(true); await click(container.querySelector('dialog [aria-label="Fechar"]'));
  session.admin = true; await mount(); await click(container.querySelector('[aria-label="Novo"]')); await click([...container.querySelectorAll('.new-item-choice button')].find(item => item.querySelector('strong')?.textContent === "Viagem")!);
  expect(container.querySelector('dialog h2')?.textContent).toBe("Uma nova viagem"); expect(container.querySelector('.personal-event-form')).toBeNull();
});
it("mantém o formulário e os campos preenchidos quando o valor é inválido", async () => {
  await mount(); await newForm(); await essentials(); await change("price", "12,345"); await submit();
  expect(container.querySelector('form [role="alert"]')?.textContent).toContain("Revise");
  expect(container.querySelector<HTMLInputElement>('[name="title"]')?.value).toBe("Experiência pessoal"); expect(localStorage.getItem(key)).toBeNull();
  await change("price", "12,34"); await submit(); expect(JSON.parse(localStorage.getItem(key)!).alice[0].priceCents).toBe(1234);
});
