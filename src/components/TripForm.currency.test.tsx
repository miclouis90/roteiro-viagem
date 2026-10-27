// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TripForm } from "./TripForm";
import { demoTrip } from "../data/demo";
import { saveTrip } from "../services/repository";
vi.mock("../services/repository", () => ({ saveTrip: vi.fn().mockResolvedValue("trip") }));
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.open = false; } });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
it("preserva a moeda original dos programas ao editar; referência é configurada separadamente", async () => {
  await act(async () => root.render(<TripForm trip={demoTrip} onClose={vi.fn()} onSaved={vi.fn()} />));
  const currency = container.querySelector<HTMLSelectElement>('select[name="currency"]')!;
  expect(currency.disabled).toBe(true); expect(currency.value).toBe(demoTrip.currency);
  expect(container.textContent).toContain("Moedas e câmbio");
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(saveTrip).toHaveBeenCalledWith(expect.objectContaining({ currency: demoTrip.currency }), demoTrip.id, expect.any(Object));
});
it("permite escolher a moeda original ao criar uma nova viagem", async () => {
  await act(async () => root.render(<TripForm onClose={vi.fn()} onSaved={vi.fn()} />));
  const currency = container.querySelector<HTMLSelectElement>('select[name="currency"]')!;
  expect(currency.disabled).toBe(false);
  for (const [name, value] of [["title", "Nova viagem"], ["city", "Miami"], ["country", "Estados Unidos"]]) container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!.value = value;
  currency.value = "USD";
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(saveTrip).toHaveBeenCalledWith(expect.objectContaining({ currency: "USD" }), undefined, undefined);
});
