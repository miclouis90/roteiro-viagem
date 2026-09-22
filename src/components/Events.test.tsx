import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EventDetails } from "./Events";
import { EventSpecificDetails } from "./EventSpecificDetails";
import { demoEvents, demoTrip } from "../data/demo";
import type { EventDetailsData } from "../data/eventDetails";

const details: EventDetailsData = {type:"flight",company:"LATAM",bookingReference:"PRIVATE-REF",seat:"PRIVATE-SEAT",notes:"PRIVATE-NOTE"};
const event={...demoEvents[0],details};
const actions={onClose:()=>{},onEdit:()=>{},onShare:()=>{},onDelete:()=>{}};
describe("ficha rápida polida",()=>{
  it("prioriza Editar e mantém compartilhamento/exclusão dentro do menu",()=>{
    const html=renderToStaticMarkup(<EventDetails event={event} trip={demoTrip} admin {...actions}/>);
    const edit=html.indexOf('>Editar</button>');
    const map=html.indexOf('Mapa</a>');
    const menu=html.indexOf('class="context-menu event-menu"');
    expect(edit).toBeGreaterThan(0); expect(map).toBeGreaterThan(edit); expect(menu).toBeGreaterThan(map);
    const menuEnd=html.indexOf('</details>',menu);
    expect(html.indexOf('Compartilhar</button>')).toBeGreaterThan(menu);
    expect(html.indexOf('Excluir</button>')).toBeLessThan(menuEnd);
    expect(html.slice(menuEnd)).not.toContain('Excluir');
  });
  it("visitante não vê edição, exclusão ou reservas pessoais",()=>{
    const html=renderToStaticMarkup(<EventDetails event={event} trip={demoTrip} admin={false} {...actions}/>);
    expect(html).not.toContain('>Editar</button>'); expect(html).not.toContain('Excluir'); expect(html).not.toContain('PRIVATE-');
    expect(html).toContain('Compartilhar'); expect(html).toContain('LATAM');
  });
  it("organiza detalhes em blocos sem duplicar campos",()=>{
    const info=renderToStaticMarkup(<EventSpecificDetails details={details} admin part="info"/>);
    const reservation=renderToStaticMarkup(<EventSpecificDetails details={details} admin part="reservation"/>);
    const notes=renderToStaticMarkup(<EventSpecificDetails details={details} admin part="notes"/>);
    expect(info).toContain('LATAM'); expect(info).not.toContain('PRIVATE-');
    expect(reservation).toContain('Reserva'); expect(reservation).toContain('PRIVATE-REF'); expect(reservation).not.toContain('PRIVATE-NOTE');
    expect(notes).toContain('PRIVATE-NOTE'); expect(notes).not.toContain('PRIVATE-REF');
    expect(renderToStaticMarkup(<EventSpecificDetails details={{type:"restaurant",neighborhood:"Asa Norte"}} admin part="reservation"/>)).toBe('');
  });
});
