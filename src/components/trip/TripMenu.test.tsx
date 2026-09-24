import { describe, expect, it } from "vitest";
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
});
