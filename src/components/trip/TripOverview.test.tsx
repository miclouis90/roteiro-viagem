import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TripOverview, OverviewSummary } from "./TripOverview";
import { demoTrip, demoEvents } from "../../data/demo";
const event = {...demoEvents[0], title: "Next coffee", date: "2026-10-29", startTime: "09:00", endTime: "10:00"};
function render(events = [event], now = new Date(2026, 9, 1), editable = true) {
  return renderToStaticMarkup(<TripOverview trip={{...demoTrip, description: "Long text ".repeat(80)}} events={events} now={now} onDay={vi.fn()} onSelect={vi.fn()} onAdd={editable ? vi.fn() : undefined} />);
}
describe("overview continuity", () => {
  it("shows days and counts without a next-program block", () => {
    const html = render();
    expect(html).toContain("Seus dias");
    expect(html).toContain("1 programa");
    expect(html).not.toContain("Próximo programa");
    expect(html).not.toContain("glance-stop");
  });
  it("excludes canceled programs from the trip summary", () => {
    expect(render([{...event, status: "cancelado"}])).toContain("Dia livre");
    expect(render([{...event, status: "realizado"}])).toContain("1 programa");
  });
  it("offers creation only for an editable empty itinerary", () => {
    expect(render([])).toContain("overview-add");
    expect(render([], undefined, false)).not.toContain("overview-add");
    expect(render()).not.toContain("overview-add");
  });
  it("keeps the integrated summary based on loaded data", () => {
    const html = renderToStaticMarkup(<OverviewSummary trip={demoTrip} events={[{...event, pricePerPerson: 150, peopleCount: 1, isFree: false}]} now={new Date(2026, 9, 1)} />);
    expect(html).toContain('aria-label="Resumo da viagem"');
    expect(html).toContain("150");
    expect(html).not.toContain("2.320");
  });
  it("keeps long trip descriptions collapsed", () => {
    expect(render()).toContain('aria-expanded="false"');
    expect(render()).toContain("about-preview");
  });
});
