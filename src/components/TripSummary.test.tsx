import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TripSummary } from "./TripSummary";
import { demoTrip, demoEvents } from "../data/demo";
import { datesBetween } from "../utils/dates";
const days = datesBetween(demoTrip.startDate, demoTrip.endDate);
const known = {...demoEvents[0], pricePerPerson: 100, peopleCount: 1, isFree: false};
const unknown = {...demoEvents[1], pricePerPerson: 0, isFree: false};
const render = (events = [known, unknown]) => renderToStaticMarkup(<TripSummary trip={demoTrip} events={events} days={days} count={days.length} />);
describe("expense presentation", () => {
  it("keeps unknown estimates separate at total, category and day levels", () => {
    const html = render();
    expect(html).toContain("100,00");
    expect(html).toContain("expense-known");
    expect(html).toContain("sem estimativa");
    expect(html).toContain("100% do total definido");
  });
  it("does not show pending counts when all values are known", () => {
    expect(render([known])).not.toContain("expense-pending");
  });
  it("does not present unknown values as free", () => {
    expect(render([unknown])).not.toContain(">Grátis<");
    expect(render([unknown])).toContain("Valor a definir");
  });
  it("renders every day even with no programs", () => {
    expect(render([]).match(/class="expense-day"/g)).toHaveLength(days.length);
    expect(render([])).toContain("Sem estimativas");
  });
});
