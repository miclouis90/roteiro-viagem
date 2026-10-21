// Opt-in integration test. Every request targets the local demo project.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { connectFirestoreEmulator, doc, getDocFromServer, getDocsFromServer, collection, setDoc, updateDoc, serverTimestamp, terminate, getFirestore, setLogLevel, type Firestore } from "firebase/firestore";
import { demoTrip, demoEvents } from "../data/demo";
import { eventInput, tripInput } from "../utils/inputs";
import { splitLodgingReservation } from "../utils/lodging";
import { eventSaveFailure } from "../utils/eventSaveError";
import { spending } from "../utils/spending";
import type { EventInput, TripEvent } from "../types";

const current = vi.hoisted(() => ({ db: null as Firestore | null, uid: "owner" }));
vi.mock("../lib/firebase", () => ({ get db() { return current.db; }, get auth() { return {currentUser:{uid:current.uid}}; }, demoMode:false }));
import { saveEvent, watchEvents } from "./repository";

describe.skipIf(process.env.RUMO_LODGING_EMULATOR !== "true")("Hospedagem: persistência real no emulador", () => {
  const project = "demo-rumo-local";
  const tripId = `lodging-regression-${Date.now()}`;
  const clients: {db:Firestore;app:FirebaseApp;uid:string}[] = [];
  const rules = readFileSync("firestore.rules", "utf8");
  let owner: ReturnType<typeof client>, editor: ReturnType<typeof client>, visitor: ReturnType<typeof client>, linkVisitor: ReturnType<typeof client>;
  function client(uid = "") {
    const app = initializeApp({projectId:project,apiKey:"local-only"}, `lodging-${uid || "guest"}-${clients.length}`);
    const db = getFirestore(app);
    connectFirestoreEmulator(db,"127.0.0.1",8089,uid ? {mockUserToken:{sub:uid,user_id:uid}} : {});
    const result={db,app,uid}; clients.push(result); return result;
  }
  function selectClient(person: ReturnType<typeof client>) { current.db=person.db;current.uid=person.uid; }
  async function loadRules(content: string) {
    const response = await fetch(`http://127.0.0.1:8089/emulator/v1/projects/${project}:securityRules`, {
      method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({rules:{files:[{name:"firestore.rules",content:content.replace(/^\uFEFF/,"")}]}}),
    });
    expect(response.ok, await response.text()).toBe(true);
  }
  const input: EventInput={...eventInput(demoEvents[0]),title:"Hospedagem de teste",category:"Hotel",date:"2027-03-19",startTime:"14:00",endTime:"",location:"Endereço fictício",pricePerPerson:899.39,peopleCount:1,isFree:false,
    details:{type:"lodging",checkOutDate:"2027-03-21",checkOutTime:"12:00",guests:2,bookingReference:"LOCAL-PRIVATE-CODE",bookingUrl:"https://example.com/LOCAL-PRIVATE-LINK",notes:"LOCAL-PRIVATE-NOTE"}};
  const ref=(db:Firestore,id:string,privateData=false)=>doc(db,"trips",tripId,privateData?"lodgingReservations":"events",id);
  async function freshRead(id:string,expectedCode?:string,uid="owner") {
    const fresh=client(uid); selectClient(fresh);
    return new Promise<TripEvent[]>((resolve,reject)=>{
      let stop=()=>{};
      const timer=setTimeout(()=>{stop();reject(new Error("Timed out reloading local lodging"));},10000);
      stop=watchEvents(tripId,events=>{
        const stay=events.find(event=>event.id===id);
        if (!stay || (expectedCode && stay.details?.bookingReference!==expectedCode)) return;
        clearTimeout(timer);stop();resolve(events);
      },error=>{clearTimeout(timer);stop();reject(error);},true);
    });
  }
  beforeAll(async()=>{
    setLogLevel("silent");
    await loadRules(rules);
    // Local-only platform-admin fixture: creating trips requires this existing role.
    const fixture=await fetch(`http://127.0.0.1:8089/v1/projects/${project}/databases/(default)/documents/platformAdmins/owner`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer owner"},body:JSON.stringify({fields:{active:{booleanValue:true}}})});
    expect(fixture.ok).toBe(true);
    owner=client("owner");editor=client("editor");visitor=client();linkVisitor=client("link-visitor");
    const trip=tripInput(demoTrip);
    await setDoc(doc(owner.db,"trips",tripId),{...trip,startDate:"2027-03-19",endDate:"2027-03-21",ownerId:"owner",access:"PUBLIC",isPublic:true,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    await setDoc(doc(owner.db,"trips",tripId,"members","editor"),{uid:"editor",role:"editor",displayName:"Editor local",email:"editor@example.test",addedAt:serverTimestamp()});
  },20000);
  afterAll(async()=>{await loadRules(rules);await Promise.all(clients.map(async({db,app})=>{await terminate(db);await deleteApp(app);}));},20000);

  it.skipIf(!process.env.RUMO_PRE_LODGING_RULES)("reproduz a exceção do SDK com a cópia das regras publicadas, sem dados privados no diagnóstico", async()=>{
    await loadRules(readFileSync(process.env.RUMO_PRE_LODGING_RULES!,"utf8"));
    selectClient(owner);
    // The screenshot has empty private fields: even the public stay alone is denied.
    await expect(saveEvent(tripId,splitLodgingReservation(input).publicInput)).rejects.toMatchObject({code:"permission-denied"});
    const cause=await saveEvent(tripId,input).then(()=>null,error=>error);
    expect(cause?.code).toBe("permission-denied");
    expect(cause?.message).toMatch(/PERMISSION_DENIED|Missing or insufficient permissions/);
    const failure=eventSaveFailure(cause,true);
    expect(JSON.stringify(failure)).not.toContain("LOCAL-PRIVATE");
    const nativeMessage=String(cause.message).split("\n")[0].trim();
    expect(nativeMessage).toMatch(/^(?:(?:7 )?PERMISSION_DENIED:|Missing or insufficient permissions\.?)$/);
    console.info("SDK real no emulador com cópia das regras publicadas:",{code:cause.code,message:nativeMessage});
    expect((await getDocsFromServer(collection(owner.db,"trips",tripId,"events"))).empty).toBe(true);
    await loadRules(rules);
  },20000);

  it("proprietário e colaborador criam/editam hospedagens pagas e gratuitas, com releitura sem cache",async()=>{
    for (const person of [owner,editor]) for (const free of [false,true]) {
      selectClient(person);
      const original={...input,isFree:free,pricePerPerson:free?0:899.39};
      const id=await saveEvent(tripId,original);
      expect((await getDocFromServer(ref(person.db,id))).data()?.pricePerPerson).toBe(original.pricePerPerson);
      const code=`LOCAL-PRIVATE-${person.uid}-${free?"free":"paid"}`;
      const edited:EventInput={...original,title:`Estadia ${person.uid} ${free?"gratuita":"paga"}`,pricePerPerson:free?0:950.25,details:{...original.details!,bookingReference:code,notes:"LOCAL-PRIVATE-EDITED"}};
      if (free) { delete edited.details!.notes; delete edited.details!.bookingUrl; }
      await saveEvent(tripId,edited,id,original);
      const events=await freshRead(id,code,person.uid);
      const stay=events.find(event=>event.id===id)!;
      expect(stay).toMatchObject({...edited,id});
      if (free) { expect(stay.details).not.toHaveProperty("notes");expect(stay.details).not.toHaveProperty("bookingUrl"); }
      expect(events.filter(event=>event.id===id)).toHaveLength(1);
      const publicDoc=(await getDocFromServer(ref(visitor.db,id))).data();
      expect(JSON.stringify(publicDoc)).not.toContain("LOCAL-PRIVATE");
      expect(publicDoc).toMatchObject({peopleCount:1,pricePerPerson:free?0:950.25,details:{guests:2,checkOutDate:"2027-03-21"}});
      await expect(getDocFromServer(ref(visitor.db,id,true))).rejects.toMatchObject({code:"permission-denied"});
    }
    const events=(await getDocsFromServer(collection(owner.db,"trips",tripId,"events"))).docs.map(doc=>({...doc.data(),id:doc.id}) as TripEvent);
    expect(events).toHaveLength(4);
    expect(spending(events)).toMatchObject({total:1900.5,freeCount:2,count:4});
    expect(["2027-03-19","2027-03-20","2027-03-21"].reduce((sum,day)=>sum+spending(events.filter(event=>event.date===day)).total,0)).toBe(1900.5);
  },30000);

  it("visitante não grava reserva privada nem apaga a reserva ao editar somente dados públicos",async()=>{
    selectClient(visitor);await expect(saveEvent(tripId,input)).rejects.toMatchObject({code:"permission-denied"});
    await updateDoc(doc(owner.db,"trips",tripId),{access:"PUBLIC_EDIT",isPublic:true,updatedAt:serverTimestamp()});
    selectClient(linkVisitor);
    const before=(await getDocsFromServer(collection(owner.db,"trips",tripId,"events"))).size;
    await expect(saveEvent(tripId,input)).rejects.toMatchObject({code:"permission-denied"});
    expect((await getDocsFromServer(collection(owner.db,"trips",tripId,"events"))).size).toBe(before);
    const {publicInput}=splitLodgingReservation(input);
    const id=await saveEvent(tripId,publicInput);
    await expect(getDocFromServer(ref(linkVisitor.db,id,true))).rejects.toMatchObject({code:"permission-denied"});
    selectClient(owner);const privateId=await saveEvent(tripId,input);
    selectClient(linkVisitor);await saveEvent(tripId,{...publicInput,title:"Nome editado pelo link"},privateId,publicInput);
    const reloaded=await freshRead(privateId,"LOCAL-PRIVATE-CODE");
    expect(reloaded.find(event=>event.id===privateId)?.details?.bookingReference).toBe("LOCAL-PRIVATE-CODE");
  },20000);
  it("não tenta persistir undefined silenciosamente nem deixa gravação parcial",async()=>{
    selectClient(owner);
    const count=(await getDocsFromServer(collection(owner.db,"trips",tripId,"events"))).size;
    const invalid={...input,details:{...input.details,guests:undefined}} as unknown as EventInput;
    const cause=await saveEvent(tripId,invalid).then(()=>null,error=>error);
    expect(cause?.code).toBe("invalid-argument");
    expect(eventSaveFailure(cause,true).diagnostic.message).toBe("Unsupported field value: undefined");
    expect((await getDocsFromServer(collection(owner.db,"trips",tripId,"events"))).size).toBe(count);
  },15000);
});
