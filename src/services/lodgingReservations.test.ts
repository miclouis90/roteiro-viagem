import { beforeEach, expect, it, vi } from "vitest";
import { demoEvents } from "../data/demo";
import { eventInput } from "../utils/inputs";
import type { EventDetailsData } from "../data/eventDetails";
const state = vi.hoisted(() => ({ listeners: new Map<string, { next: (value: unknown) => void; error: () => void; stop: ReturnType<typeof vi.fn> }>(), batch: { set: vi.fn(),update:vi.fn(),delete:vi.fn(),commit:vi.fn() } }));
vi.mock("../lib/firebase",()=>({db:{},auth:{currentUser:{uid:"owner"}},demoMode:false}));
vi.mock("firebase/firestore",()=>({
  collection:(parent:{path?:string},...parts:string[])=>({path:[parent.path,...parts].filter(Boolean).join("/")}),
  doc:(parent:{path?:string},...parts:string[])=>{const path=[parent.path,...parts.length?parts:["generated"]].filter(Boolean).join("/");return {path,id:path.split("/").at(-1)};},
  onSnapshot:(ref:{path:string},next:(value:unknown)=>void,error:()=>void)=>{const stop=vi.fn();state.listeners.set(ref.path,{next,error,stop});return stop;},
  writeBatch:()=>state.batch, serverTimestamp:()=>"NOW", deleteField:()=>"DELETE",
  addDoc:vi.fn(),updateDoc:vi.fn(),deleteDoc:vi.fn(),getDocFromServer:vi.fn(),getDocs:vi.fn(),collectionGroup:vi.fn(),query:vi.fn(),where:vi.fn(),
}));
import { saveEvent, watchEvents, removeEvent } from "./repository";
const input={...eventInput(demoEvents[0]),category:"Hotel",startTime:"",endTime:"",peopleCount:1,pricePerPerson:900,details:{type:"lodging" as const,checkOutDate:"2026-11-02",guests:3,bookingReference:"PRIVATE-CODE",bookingUrl:"https://example.com/PRIVATE",notes:"PRIVATE-NOTE"}};
const rows=(id:string,data:object)=>({docs:[{id,data:()=>data}]});
beforeEach(()=>{vi.clearAllMocks();state.listeners.clear();state.batch.commit.mockResolvedValue(undefined);});

it("salva estadia e reserva separadamente em um único batch",async()=>{
  expect(await saveEvent("trip",input)).toBe("generated");
  const writes=state.batch.set.mock.calls;
  expect(writes).toHaveLength(2);
  expect(writes[0][0].path).toBe("trips/trip/events/generated");
  expect(JSON.stringify(writes[0][1])).not.toContain("PRIVATE");
  expect(writes[1][0].path).toBe("trips/trip/lodgingReservations/generated");
  expect(writes[1][1]).toMatchObject({bookingReference:"PRIVATE-CODE",notes:"PRIVATE-NOTE"});
  expect(state.batch.commit).toHaveBeenCalledOnce();
});
it("uma edição pública não apaga reserva que não foi carregada",async()=>{
  const details: EventDetailsData = { ...input.details };
  delete details.bookingReference;
  delete details.bookingUrl;
  delete details.notes;
  const publicInput={...input,details};
  await saveEvent("trip",{...publicInput,title:"Novo nome"},"hotel",publicInput);
  expect(state.batch.update.mock.calls[0][1]).toEqual({title:"Novo nome",updatedAt:"NOW"});
  expect(state.batch.set).not.toHaveBeenCalled();expect(state.batch.delete).not.toHaveBeenCalled();
});
it("edita só campos privados alterados e remove explicitamente os limpos",async()=>{
  const details: EventDetailsData = { ...input.details };
  delete details.notes;
  await saveEvent("trip",{...input,details:{...details,bookingReference:"NEW"}},"hotel",input);
  expect(state.batch.set.mock.calls[0][1]).toEqual({bookingReference:"NEW",notes:"DELETE",updatedAt:"NOW"});
  expect(JSON.stringify(state.batch.update.mock.calls)).not.toContain("PRIVATE");
});
it("não devolve reserva ao visitante nem abre assinatura privada",()=>{
  const next=vi.fn();const stop=watchEvents("trip",next,vi.fn());
  state.listeners.get("trips/trip/events")!.next(rows("hotel",input));
  expect(state.listeners.has("trips/trip/lodgingReservations")).toBe(false);
  expect(JSON.stringify(next.mock.calls)).not.toContain("PRIVATE");stop();
  expect(state.listeners.get("trips/trip/events")!.stop).toHaveBeenCalledOnce();
});
it("combina reserva só para usuário autorizado e limpa ao perder acesso",()=>{
  const next=vi.fn();const stop=watchEvents("trip",next,vi.fn(),true);
  state.listeners.get("trips/trip/events")!.next(rows("hotel",input));
  expect(next).not.toHaveBeenCalled();
  state.listeners.get("trips/trip/lodgingReservations")!.next(rows("hotel",{bookingReference:"PRIVATE-CODE",updatedAt:"NOW"}));
  expect(next.mock.calls.at(-1)![0][0].details.bookingReference).toBe("PRIVATE-CODE");
  state.listeners.get("trips/trip/lodgingReservations")!.error();
  expect(JSON.stringify(next.mock.calls.at(-1))).not.toContain("PRIVATE");
  stop();expect([...state.listeners.values()].every(listener=>listener.stop.mock.calls.length===1)).toBe(true);
});
it("exclui evento e reserva em conjunto quando autorizado",async()=>{
  await removeEvent("trip","hotel",true);
  expect(state.batch.delete.mock.calls.map(([ref])=>ref.path)).toEqual(["trips/trip/events/hotel","trips/trip/lodgingReservations/hotel"]);
});
