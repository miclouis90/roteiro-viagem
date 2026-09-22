import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { demoTrip, demoEvents } from "../data/demo";
import { categories, categoryGroups } from "../data/categories";
import { detailTypeFor, validDetails, visibleDetails, type EventDetailsData } from "../data/eventDetails";
import { themeOf, themeStyle } from "../data/themes";
import { EventSpecificDetails } from "../components/EventSpecificDetails";
import { TripOverview } from "../components/trip/TripOverview";
import { tripOverview, timeUntilEvent } from "./overview";
import { tripTabFromSearch } from "./tripView";
import { spending, spendingLabel } from "./spending";
import { collectPlaces } from "./places";
import { homeTrips } from "./homeTrips";
import { eventInput, tripInput } from "./inputs";
import type { TripEvent } from "../types";

const trip = { ...demoTrip, startDate: "2026-10-29", endDate: "2026-11-02" };
const event = (id: string, overrides: Partial<TripEvent> = {}): TripEvent => ({
  ...demoEvents[0], id, title: id, date: trip.startDate, startTime: "09:00", endTime: "10:00",
  category: "Café", status: "ideia", priority: "imperdível", ...overrides,
});
const flight: EventDetailsData = { type: "flight", company: "LATAM", flightNumber: "LA1234", originAirport: "BSB", destinationAirport: "GRU", originCity: "Brasília", departureTime: "07:45", arrivalTime: "09:20", seat: "12A-PRIVATE", bookingReference: "REF-PRIVATE", notes: "NOTE-PRIVATE" };

describe("detalhes opcionais e compatibilidade", () => {
  it("renderiza eventos antigos sem exigir details ou theme", () => {
    expect(renderToStaticMarkup(<EventSpecificDetails admin details={undefined} />)).toBe("");
    expect(eventInput(event("old"))).not.toHaveProperty("details");
    expect(tripInput(trip)).not.toHaveProperty("theme");
    expect(themeOf().id).toBe("green");
  });
  it("aceita voo completo e detalhes mínimos sem obrigar outros campos", () => {
    expect(validDetails(flight)).toBe(true);
    expect(validDetails({ type: "restaurant", recommendedDish: "Massa" })).toBe(true);
    expect(validDetails({ type: "flight" })).toBe(true);
    expect(eventInput(event("flight", {details: flight})).details).toEqual(flight);
    const html = renderToStaticMarkup(<EventSpecificDetails details={flight} admin />);
    for (const text of ["BSB", "GRU", "Brasília", "07:45", "09:20", "LATAM", "LA1234", "12A-PRIVATE", "REF-PRIVATE"]) expect(html).toContain(text);
  });
  it.each([undefined, null, [], {}, {type:"toString"}, {type:"__proto__"}, {type:"flight",seat:3}, {type:"flight",extra:"x"}, {type:"flight",company:{nested:true}}, {type:"flight",company:"x".repeat(1001)}, {type:"flight",arrivalTime:"25:99"}, {type:"culture",ticketUrl:"javascript:alert(1)"}, {type:"outdoor",weatherDependent:"true"}])("rejeita dados inválidos: %j", (details) => {
    expect(validDetails(details)).toBe(false);
  });
  it("oculta referências, assento, ingresso, reserva e notas na renderização pública", () => {
    const inputs: EventDetailsData[] = [flight,
      {type:"restaurant",reservationName:"NAME-PRIVATE",reservationCode:"CODE-PRIVATE",phone:"PHONE-PRIVATE",neighborhood:"Asa Norte"},
      {type:"culture",ticketUrl:"https://example.com/PRIVATE",ticketCode:"TICKET-PRIVATE",seat:"SEAT-PRIVATE",exhibition:"Arte"},
      {type:"bar",reservation:"RES-PRIVATE",table:"TABLE-PRIVATE",signatureDrink:"Drink"},
      {type:"rail",ticket:"TICKET-PRIVATE",line:"Azul"},
    ];
    for (const details of inputs) {
      const html = renderToStaticMarkup(<EventSpecificDetails details={details} admin={false} />);
      expect(html).not.toContain("PRIVATE");
      expect(visibleDetails(details, false).every((entry) => !entry.private)).toBe(true);
    }
  });
  it("aplica temas conhecidos e fallback sem permitir CSS arbitrário", () => {
    expect(themeOf({accent:"blue"}).id).toBe("blue");
    expect(themeStyle({accent:"lavender"})["--trip-accent"]).toBe("#7456C7");
    expect(themeOf({accent:"unknown"} as never).id).toBe("green");
    expect(tripInput({...trip, theme:{accent:"coral"}}).theme).toEqual({accent:"coral"});
  });
});

describe("visão geral contextual", () => {
  const events = [event("Chegada", {category:"Voo",startTime:"07:00"}), event("Café"), event("Museu",{category:"Museu",startTime:"11:00",endTime:"12:00"}), event("Jantar",{category:"Jantar",startTime:"19:00",endTime:"20:00"}), event("Amanhã",{date:"2026-10-30"})];
  it("abre a visão geral por padrão, inclusive links antigos e parâmetros desconhecidos", () => {
    expect(tripTabFromSearch(new URLSearchParams())).toBe("geral");
    expect(tripTabFromSearch(new URLSearchParams("tab=old"))).toBe("geral");
    expect(tripTabFromSearch(new URLSearchParams("tab=roteiro"))).toBe("roteiro");
  });
  it("mostra contagem antes, dia atual durante e memória depois", () => {
    const before = tripOverview(trip,events,new Date(2026,9,28,12));
    expect(before.phase).toBe("before"); expect(before.remainingDays).toBe(1);
    expect(before.next?.id).toBe("Café"); expect(before.days).toHaveLength(5);
    expect(before.days[4].count).toBe(0);
    const during = tripOverview(trip,events,new Date(2026,9,30,8));
    expect(during.phase).toBe("during"); expect(during.dayNumber).toBe(2);
    const after = tripOverview(trip,events,new Date(2026,10,3,8));
    expect(after.phase).toBe("after"); expect(after.next).toBeUndefined();
  });
  it("considera o horário, eventos em andamento e ignora cancelados e realizados", () => {
    expect(tripOverview(trip, events, new Date(2026,9,29,9,30)).next?.id).toBe("Café");
    expect(tripOverview(trip, events, new Date(2026,9,29,10,30)).next?.id).toBe("Museu");
    const changed = events.map((e) => e.id === "Museu" ? {...e,status:"cancelado" as const} : e.id === "Café" ? {...e,status:"realizado" as const} : e);
    expect(tripOverview(trip, changed, new Date(2026,9,29,9)).next?.id).toBe("Jantar");
  });
  it("não repete eventos em Transporte, Próximo, Hoje e Imperdíveis", () => {
    for (const now of [new Date(2026,9,1), new Date(2026,9,29,8)]) {
      const view = tripOverview(trip,events,now);
      const ids = [...view.transport,...(view.next ? [view.next] : []),...view.todayPreview,...view.highlights].map(e=>e.id);
      expect(new Set(ids).size).toBe(ids.length);
      const html = renderToStaticMarkup(<TripOverview trip={trip} events={events} now={now} admin={false} onDay={()=>{}} onHighlights={()=>{}} onExpenses={()=>{}} onSelect={()=>{}} onAdd={()=>{}} />);
      expect(html).toContain("Roteiro em um olhar");
      expect(html).toContain("Dia livre");
      expect(html).not.toContain("Adicionar programa");
    }
  });
  it("calcula tempo restante sem arredondar uma hora e quinze para dois dias", () => {
    expect(timeUntilEvent(event("c"),new Date(2026,9,29,7,45))).toBe("em 1h15");
    expect(timeUntilEvent(event("c"),new Date(2026,9,29,9,15))).toBe("Agora");
  });
});

describe("coleção, categorias e gastos", () => {
  it("preserva as 18 categorias anteriores e agrupa os 8 transportes", () => {
    const original = ["Café","Almoço","Jantar","Petiscos","Bar","Drinks","Vinho","Balada","Evento cultural","Museu","Exposição","Teatro","Show","Parque","Passeio turístico","Compras","Experiência","Outro"];
    expect(categories.map(c=>c.name)).toEqual(expect.arrayContaining(original));
    expect(categories.filter(c=>c.group === "transport")).toHaveLength(8);
    for (const category of categories) expect(categoryGroups.some(g=>g.id === category.group)).toBe(true);
    expect(detailTypeFor("Voo")).toBe("flight"); expect(detailTypeFor("Café")).toBe("restaurant"); expect(detailTypeFor("Museu")).toBe("culture");
  });
  it("agrupa locais equivalentes preservando cada visita e ordem", () => {
    const visits = [event("second",{date:"2026-10-30",location:" café norte "}), event("first",{location:"Café Norte"}), event("other",{location:"Outro lugar"})];
    const places = collectPlaces(visits);
    expect(places).toHaveLength(2); expect(places[0].events.map(e=>e.id)).toEqual(["first","second"]);
    expect(visits[0].id).toBe("second");
  });
  it("separa estimativa conhecida de valor indefinido e não soma cancelados", () => {
    const values = [event("paid",{pricePerPerson:50,peopleCount:2,isFree:false}),event("unknown",{pricePerPerson:0,isFree:false}),event("free",{pricePerPerson:0,isFree:true}),event("cancelled",{pricePerPerson:999,isFree:false,status:"cancelado"})];
    expect(spending(values)).toEqual({total:100,undefinedCount:1,count:3,freeCount:1});
    expect(spendingLabel(values,"BRL")).toContain("+ a definir");
    expect(spendingLabel([values[1]],"BRL")).toBe("Valor a definir");
    expect(spendingLabel([values[2]],"BRL")).toBe("Grátis");
  });
  it("destaca viagem em andamento antes de uma futura e depois a próxima", () => {
    const later = {...trip,id:"later",startDate:"2026-12-01",endDate:"2026-12-05"};
    expect(homeTrips([later,trip],"2026-10-30").featured?.id).toBe(trip.id);
    expect(homeTrips([later,trip],"2026-11-03").featured?.id).toBe("later");
  });
});
