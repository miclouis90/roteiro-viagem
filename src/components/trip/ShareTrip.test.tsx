// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoTrip } from "../../data/demo";
import { ShareTrip } from "./ShareTrip";
import { TripMenu } from "./TripMenu";

vi.mock("../../lib/firebase", () => ({ demoMode: false }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ user: { uid: "owner" }, login: vi.fn() }) }));
vi.mock("../../services/collaboration", () => ({
  claimOwnership: vi.fn(), joinTrip: vi.fn(), removeMember: vi.fn(),
  setTripAccess: vi.fn(), watchMembers: vi.fn(() => () => {}),
}));
const trip = { ...demoTrip, ownerId: "owner", access: "PRIVATE" as const, isPublic: false };
function Harness() {
  const [open, setOpen] = useState(false);
  return <>
    <TripMenu owner canLeave={false} onLeave={() => {}} onEdit={() => {}} onDelete={() => {}} onDuplicate={() => {}} onShare={() => setOpen(true)} onVisibility={() => setOpen(true)} />
    {open && <ShareTrip trip={trip} owner legacy={false} editor={false} onClose={() => setOpen(false)} />}
  </>;
}
let root: Root;
let container: HTMLDivElement;
const writeText = vi.fn().mockResolvedValue(undefined);
const share = vi.fn().mockResolvedValue(undefined);
async function click(element: Element) { await act(async () => (element as HTMLElement).click()); }
function button(label: string) {
  return [...container.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent === label)!;
}
async function openShare(label = "Compartilhar") {
  await act(async () => root.render(<Harness />));
  const trigger = container.querySelector("summary")!;
  await click(trigger);
  await act(async () => {
    trigger.focus();
    trigger.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: null }));
  });
  await click(button(label));
  expect(container.querySelector("details")!.open).toBe(false);
  expect(container.querySelector("dialog")!.open).toBe(true);
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.open = false; } });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  Object.defineProperty(navigator, "share", { configurable: true, value: share });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  Reflect.deleteProperty(navigator, "clipboard");
  Reflect.deleteProperty(navigator, "share");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("compartilhamento após o menu mobile", () => {
  it.each(["Compartilhar", "Gerenciar acesso"])("abre %s, copia o link e devolve o foco ao fechar", async label => {
    await openShare(label);
    expect(container.querySelector("dialog h2")!.textContent).toBe(`Compartilhar ${trip.title}`);
    expect(container.querySelector("select")!.value).toBe("PRIVATE");
    expect(document.body.style.overflow).toBe("hidden");
    await click(button("Copiar link"));
    expect(writeText).toHaveBeenCalledExactlyOnceWith(`${window.location.href.split("#")[0]}#/viagem/${trip.id}`);
    expect(container.querySelector('[role="status"]')!.textContent).toBe("Link copiado.");
    await click(container.querySelector('[aria-label="Fechar"]')!);
    expect(container.querySelector("dialog")).toBeNull();
    expect(container.querySelector("details")!.open).toBe(false);
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.activeElement).toBe(container.querySelector("summary"));
  });
  it("compartilha com a API nativa e fecha com Escape sem reabrir o menu", async () => {
    await openShare();
    await click(button("Compartilhar…"));
    expect(share).toHaveBeenCalledExactlyOnceWith({ title: trip.title, url: `${window.location.href.split("#")[0]}#/viagem/${trip.id}` });
    expect(container.querySelector("dialog")!.open).toBe(true);
    await act(async () => container.querySelector("dialog")!.dispatchEvent(new Event("cancel", { bubbles: false, cancelable: true })));
    expect(container.querySelector("dialog")).toBeNull();
    expect(container.querySelector("details")!.open).toBe(false);
  });
  it("permite continuar após cancelar o compartilhamento nativo", async () => {
    share.mockRejectedValueOnce(Object.assign(new Error("Cancelado"), { name: "AbortError" }));
    await openShare();
    await click(button("Compartilhar…"));
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(button("Copiar link").disabled).toBe(false);
    await click(button("Copiar link"));
    expect(container.querySelector('[role="status"]')!.textContent).toBe("Link copiado.");
  });
});
