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
  it("compares daily amounts with the largest day, without photos or canceled amounts", () => {
    const html = render([
      {...known, date: days[0], pricePerPerson: 100},
      {...known, id: "higher", date: days[1], pricePerPerson: 200},
      {...known, id: "canceled", date: days[2], pricePerPerson: 1000, status: "cancelado"},
    ]);
    const cards = html.match(/<article class="expense-day"[\s\S]*?<\/article>/g)!;
    expect(cards).toHaveLength(days.length);
    expect(cards[0]).toContain('width:50%');
    expect(cards[1]).toContain('width:100%');
    expect(cards[1]).toContain('data-highest="true"');
    expect(cards[1]).toContain('Maior estimativa');
    expect(cards[2]).toContain('width:0%');
    expect(cards[2]).toContain('0 programas');
    expect(html.match(/data-highest="true"/g)).toHaveLength(1);
    expect(html).not.toContain('expense-day-art');
    expect(html).not.toContain('expense-day-carousel');
  });
  it("keeps free, undefined and empty days distinct without highlighting a zero maximum", () => {
    const html = render([
      {...known, isFree: true, date: days[0]},
      {...unknown, date: days[1]},
    ]);
    const cards = html.match(/<article class="expense-day"[\s\S]*?<\/article>/g)!;
    expect(cards[0]).toContain('Grátis');
    expect(cards[1]).toContain('Valor a definir');
    expect(cards[1]).toContain('1 sem estimativa');
    expect(cards[2]).toContain('Sem estimativas');
    expect(cards.every(card => card.includes('width:0%'))).toBe(true);
    expect(html).not.toContain('data-highest');
    expect(html).not.toMatch(/NaN|Infinity/);
  });
  it("distributes known amounts proportionally and excludes canceled programs", () => {
    const food = {...known, pricePerPerson: 75, category: "Almoço"};
    const culture = {...known, id: "culture", pricePerPerson: 25, category: "Museu"};
    const canceled = {...known, id: "canceled", pricePerPerson: 900, category: "Bar", status: "cancelado" as const};
    const html = render([food, culture, canceled]);
    expect(html).toContain('aria-label="75% do total definido"');
    expect(html).toContain('aria-label="25% do total definido"');
    expect(html).not.toContain("900,00");
    expect(html.match(/class="expense-donut-segment/g)).toHaveLength(2);
    expect(html).toContain("Distribuição por categoria");
    expect(html).not.toContain("Resumo da viagem");
    expect(html).not.toContain("Ver calendário");
    expect(html).not.toContain("Seus planos em valores");
  });
  it("does not invent chart slices for free or undefined costs", () => {
    for (const events of [[], [unknown], [{...known, isFree:true}]]) {
      const html = render(events);
      expect(html).not.toContain('class="expense-donut-segment');
      expect(html).not.toMatch(/NaN|Infinity/);
    }
  });
  it("shows defined-estimate coverage in the donut instead of repeating the total", () => {
    const html = render([
      known, unknown,
      {...known, id: 'free', isFree: true},
      {...known, id: 'canceled', status: 'cancelado', pricePerPerson: 900},
    ]);
    const center = html.match(/class="expense-donut-center"[\s\S]*?<\/div>/)![0];
    expect(center).toContain('67% dos programas com valor definido');
    expect(center).toContain('<strong>67%</strong>');
    expect(center).not.toContain('R$');
    expect(center).not.toContain('Total estimado');
    expect(html).toContain('100,00');
    expect(html).toContain('Programas cancelados não entram no total.');
  });
});
