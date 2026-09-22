import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TripNavigation } from "../components/ui/Primitives";
import { EventForm } from "../components/EventForm";
import { TripOverview } from "../components/trip/TripOverview";
import { demoTrip, demoEvents } from "../data/demo";
import { tripTabFromSearch, itineraryViewFromSearch } from "./tripView";
import { nextStep } from "./nextStep";

vi.mock("../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../services/repository", () => ({ saveEvent: vi.fn() }));
const trip = { ...demoTrip, startDate: "2026-10-29", endDate: "2026-11-02" };
const flight = {
  ...demoEvents[0],
  id: "flight",
  title: "Chegada",
  category: "Voo",
  date: "2026-10-29",
  startTime: "08:00",
  endTime: "09:00",
  status: "confirmado" as const,
};
const lunch = {
  ...flight,
  id: "lunch",
  title: "Almoço",
  category: "Almoço",
  startTime: "12:00",
  endTime: "13:00",
};

describe("navegação simplificada", () => {
  it("exibe somente três destinos principais", () => {
    const html = renderToStaticMarkup(
      <TripNavigation value="roteiro" onChange={() => {}} />,
    );
    expect(html.match(/<button/g)).toHaveLength(3);
    for (const text of ["Visão geral", "Roteiro", "Gastos"])
      expect(html).toContain(text);
    expect(html).not.toContain("Lugares");
    expect(html).toContain('aria-current="page"');
  });
  it("preserva links antigos de Lugares e os novos links secundários", () => {
    for (const search of ["tab=lugares", "tab=roteiro&view=lugares"]) {
      const params = new URLSearchParams(search);
      expect(tripTabFromSearch(params)).toBe("roteiro");
      expect(itineraryViewFromSearch(params)).toBe("lugares");
    }
    expect(itineraryViewFromSearch(new URLSearchParams("tab=roteiro"))).toBe(
      "roteiro",
    );
  });
  it("cadastro inicial mostra somente o essencial e um salvar", () => {
    const html = renderToStaticMarkup(
      <EventForm
        trip={trip}
        kind="transport"
        onClose={() => {}}
        onSaved={() => {}}
      />,
    );
    for (const field of ["title", "category", "date", "startTime", "location"])
      expect(html).toContain(`name="${field}"`);
    for (const field of ["price", "people", "notes", "websiteUrl", "status"])
      expect(html).not.toContain(`name="${field}"`);
    expect(html.match(/Salvar programa/g)).toHaveLength(1);
    expect(html).toContain('value="Voo"');
  });
  it("edição permite revelar capacidades existentes sem abrir tudo inicialmente", () => {
    const props = { trip, event: flight, onClose: () => {}, onSaved: () => {} };
    const simple = renderToStaticMarkup(<EventForm {...props} />);
    expect(simple).toContain("Adicionar mais detalhes");
    expect(simple).not.toContain('name="price"');
    const expanded = renderToStaticMarkup(
      <EventForm {...props} expandDetails />,
    );
    for (const field of ["price", "people", "notes", "websiteUrl", "status"])
      expect(expanded).toContain(`name="${field}"`);
    expect(expanded).toContain("Informações do voo");
  });
  it("visão geral apresenta um próximo passo sem empilhar módulos", () => {
    const html = renderToStaticMarkup(
      <TripOverview
        trip={trip}
        events={[flight, lunch]}
        now={new Date(2026, 9, 1)}
        admin
        onDay={() => {}}
        onSelect={() => {}}
      />,
    );
    expect(html).toContain("Próximo passo");
    for (const heading of [
      "Transporte",
      "Próximo programa",
      "Imperdíveis",
      "Gastos",
    ])
      expect(html).not.toContain(`>${heading}<`);
  });
});
describe("próximo passo contextual", () => {
  it("antes da viagem aponta um local pendente e não inventa tarefas", () => {
    const pending = { ...lunch, location: "" };
    expect(
      nextStep(trip, [flight, pending], new Date(2026, 9, 1), true).event?.id,
    ).toBe("lunch");
    expect(
      nextStep(trip, [flight, pending], new Date(2026, 9, 1), false).event,
    ).toBeUndefined();
  });
  it("durante considera também transporte, evitando perder um voo próximo", () => {
    expect(
      nextStep(trip, [lunch, flight], new Date(2026, 9, 29, 7), true).event?.id,
    ).toBe("flight");
    expect(
      nextStep(trip, [lunch, flight], new Date(2026, 9, 29, 10), true).event
        ?.id,
    ).toBe("lunch");
    expect(
      nextStep(
        trip,
        [{ ...flight, status: "cancelado" }, lunch],
        new Date(2026, 9, 29, 7),
        true,
      ).event?.id,
    ).toBe("lunch");
  });
  it("depois oferece memória e roteiro sem cobrança de pendências", () => {
    const next = nextStep(trip, [flight, lunch], new Date(2026, 10, 3), true);
    expect(next.action).toBe("Rever roteiro");
    expect(next.event).toBeUndefined();
  });
});
