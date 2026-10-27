// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TripMenu } from "./TripMenu";
const actions = {
  onLeave: () => {},
  onEdit: () => {},
  onShare: () => {},
  onDuplicate: () => {},
  onVisibility: () => {},
  onDelete: () => {},
};
describe("menu por papel na viagem", () => {
  it("proprietário tem administração", () => {
    const html = renderToStaticMarkup(
      <TripMenu owner canLeave={false} {...actions} />,
    );
    for (const label of [
      "Editar viagem",
      "Compartilhar",
      "Gerenciar acesso",
      "Duplicar viagem",
      "Excluir viagem",
    ])
      expect(html).toContain(label);
    expect(html).not.toContain("Sair da viagem");
  });
  it("editor tem edição e saída sem administração", () => {
    const html = renderToStaticMarkup(
      <TripMenu owner={false} canLeave {...actions} />,
    );
    for (const label of ["Editar viagem", "Compartilhar", "Sair da viagem"])
      expect(html).toContain(label);
    for (const label of [
      "Gerenciar acesso",
      "Duplicar viagem",
      "Excluir viagem",
    ])
      expect(html).not.toContain(label);
  });
  it("não oferece saída quando o colaborador não pode sair", () => {
    const html = renderToStaticMarkup(<TripMenu owner={false} canLeave={false} {...actions} />);
    expect(html).toContain("Editar viagem");
    expect(html).not.toContain("Sair da viagem");
    expect(html).not.toContain("Excluir viagem");
  });
});

describe("interação do menu da viagem", () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  async function mount(owner = true, overrides = {}) {
    await act(async () => root.render(
      <><TripMenu owner={owner} canLeave={!owner} {...actions} {...overrides} /><p>Fora do menu</p><button>Outra ação</button></>,
    ));
    const menu = container.querySelector("details")!;
    const trigger = menu.querySelector("summary")!;
    await act(async () => { trigger.focus(); trigger.click(); });
    expect(menu.open).toBe(true);
    return { menu, trigger };
  }
  it("fecha ao clicar fora, inclusive em uma área sem foco", async () => {
    const { menu } = await mount();
    await act(async () => container.querySelector("p")!.click());
    expect(menu.open).toBe(false);
  });
  it("fecha com Escape e devolve o foco ao acionador", async () => {
    const { menu, trigger } = await mount();
    await act(async () => {
      const button = menu.querySelector("button")!;
      button.focus();
      button.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });
  it("mantém aberto ao navegar nos itens e fecha quando o foco sai", async () => {
    const { menu } = await mount();
    await act(async () => menu.querySelector("button")!.focus());
    expect(menu.open).toBe(true);
    await act(async () => container.querySelector<HTMLButtonElement>("details + p + button")!.focus());
    expect(menu.open).toBe(false);
  });
  it.each([
    ["Editar viagem", "onEdit"],
    ["Compartilhar", "onShare"],
    ["Gerenciar acesso", "onVisibility"],
    ["Duplicar viagem", "onDuplicate"],
    ["Excluir viagem", "onDelete"],
  ] as const)("fecha antes de executar %s", async (label, action) => {
    const callback = vi.fn(() => {
      expect(container.querySelector("details")!.open).toBe(false);
      expect(document.activeElement).toBe(container.querySelector("summary"));
    });
    const { menu } = await mount(true, { [action]: callback });
    const button = [...menu.querySelectorAll("button")].find(item => item.textContent === label)!;
    await act(async () => { button.focus(); button.click(); });
    expect(callback).toHaveBeenCalledOnce();
  });
  it.each([
    ["Editar viagem", "onEdit"],
    ["Compartilhar", "onShare"],
    ["Gerenciar acesso", "onVisibility"],
    ["Duplicar viagem", "onDuplicate"],
    ["Excluir viagem", "onDelete"],
  ] as const)("preserva %s após blur mobile sem próximo foco", async (label, action) => {
    const callback = vi.fn();
    const { menu, trigger } = await mount(true, { [action]: callback });
    const button = [...menu.querySelectorAll("button")].find(item => item.textContent === label)!;
    await act(async () => {
      button.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      trigger.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: null }));
    });
    expect(menu.open).toBe(true);
    await act(async () => button.click());
    expect(callback).toHaveBeenCalledOnce();
    expect(menu.open).toBe(false);
  });
  it("fecha ao começar um toque fora e não propaga a ação para o card", async () => {
    const onCardPointer = vi.fn(), onCardClick = vi.fn(), onShare = vi.fn();
    await act(async () => root.render(
      <div onPointerDown={onCardPointer} onClick={onCardClick}>
        <TripMenu owner canLeave={false} {...actions} onShare={onShare} />
        <p>Fora do menu</p>
      </div>,
    ));
    const menu = container.querySelector("details")!;
    const trigger = menu.querySelector("summary")!;
    await act(async () => trigger.click());
    const button = [...menu.querySelectorAll("button")].find(item => item.textContent === "Compartilhar")!;
    await act(async () => {
      button.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      button.click();
    });
    expect(onShare).toHaveBeenCalledOnce();
    expect(onCardPointer).not.toHaveBeenCalled();
    expect(onCardClick).not.toHaveBeenCalled();
    await act(async () => trigger.click());
    await act(async () => container.querySelector("p")!.dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(menu.open).toBe(false);
  });
  it("separa a exclusão das ações comuns", async () => {
    const { menu } = await mount();
    const common = menu.querySelector('[aria-label="Ações da viagem"]')!;
    const destructive = menu.querySelector('[aria-label="Ações destrutivas"]')!;
    expect(common.querySelectorAll("button")).toHaveLength(4);
    expect(common.textContent).not.toContain("Excluir viagem");
    expect(destructive.querySelectorAll("button")).toHaveLength(1);
    expect(destructive.textContent).toBe("Excluir viagem");
  });
  it("preserva a ação de sair exclusiva do colaborador", async () => {
    const onLeave = vi.fn();
    const { menu } = await mount(false, { onLeave });
    expect(menu.querySelector('[aria-label="Ações destrutivas"]')).toBeNull();
    const button = [...menu.querySelectorAll("button")].find(item => item.textContent === "Sair da viagem")!;
    await act(async () => button.click());
    expect(onLeave).toHaveBeenCalledOnce();
    expect(menu.open).toBe(false);
  });
});
