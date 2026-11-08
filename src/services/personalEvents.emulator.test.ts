import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, getDocFromServer, getDocsFromServer, query, where, serverTimestamp, Timestamp, terminate, setLogLevel, type Firestore } from "firebase/firestore";
import type { PersonalEvent, PersonalEventInput } from "../utils/personalEvents";
const state = vi.hoisted(() => ({ db: null as Firestore | null, uid: "", anonymous: false }));
vi.mock("../lib/firebase", () => ({ get db() { return state.db; }, get auth() { return { currentUser: state.uid ? { uid: state.uid, isAnonymous: state.anonymous } : null }; }, demoMode: false }));
import { savePersonalEvent, watchPersonalEvents, removePersonalEvent } from "./personalEvents";
import { unifiedAgenda } from "../utils/unifiedAgenda";
import { demoTrip } from "../data/demo";

describe.skipIf(process.env.RUMO_PERSONAL_EVENTS_EMULATOR !== "true")("eventos pessoais privados no emulador", () => {
  const project = "demo-rumo-local", suffix = String(Date.now());
  const clients: { app: FirebaseApp; db: Firestore; uid: string; anonymous: boolean }[] = [];
  function client(uid = "", anonymous = false) {
    const app = initializeApp({ projectId: project, apiKey: "local-only" }, `personal-${clients.length}-${suffix}`), db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8089, uid ? { mockUserToken: { sub: uid, user_id: uid, ...(anonymous ? { firebase: { identities: {}, sign_in_provider: "anonymous" } } : {}) } } : {});
    const person = { app, db, uid, anonymous }; clients.push(person); return person;
  }
  let alice: ReturnType<typeof client>, bob: ReturnType<typeof client>, admin: ReturnType<typeof client>, guest: ReturnType<typeof client>, anonymous: ReturnType<typeof client>;
  let eventId: string;
  const input: PersonalEventInput = { title: "Evento pessoal local", category: "show", date: "2028-02-29", startTime: "22:00", endTime: "02:00", city: "São Paulo", location: "Local de teste", priceCents: 89939, ticketUrl: "https://example.test/ingresso", notes: "PRIVATE-LOCAL-EVENT" };
  const ref = (person: ReturnType<typeof client>, id = eventId) => doc(person.db, "personalEvents", id);
  function select(person: ReturnType<typeof client>) { state.db = person.db; state.uid = person.uid; state.anonymous = person.anonymous; }
  async function reload(person: ReturnType<typeof client>) {
    select(person);
    return new Promise<PersonalEvent[]>((resolve, reject) => {
      let stop = () => {};
      const timer = setTimeout(() => { stop(); reject(new Error("Local event reload timed out")); }, 10000);
      stop = watchPersonalEvents(person.uid, rows => { clearTimeout(timer); stop(); resolve(rows); }, cause => { clearTimeout(timer); stop(); reject(cause); });
    });
  }
  beforeAll(async () => {
    setLogLevel("silent");
    const rules = readFileSync("firestore.rules", "utf8").replace(/^\uFEFF/, "");
    const response = await fetch(`http://127.0.0.1:8089/emulator/v1/projects/${project}:securityRules`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rules: { files: [{ name: "firestore.rules", content: rules }] } }) });
    expect(response.ok, await response.text()).toBe(true);
    alice = client(`personal-alice-${suffix}`); bob = client(`personal-bob-${suffix}`); admin = client(`personal-admin-${suffix}`); guest = client(); anonymous = client(`personal-anon-${suffix}`, true);
    const fixture = await fetch(`http://127.0.0.1:8089/v1/projects/${project}/databases/(default)/documents/platformAdmins/${admin.uid}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer owner" }, body: JSON.stringify({ fields: { active: { booleanValue: true } } }) }); expect(fixture.ok).toBe(true);
  }, 25000);
  afterAll(async () => { await Promise.all(clients.map(async person => { await terminate(person.db); await deleteApp(person.app); })); }, 15000);

  it("usuário comum cria os cinco tipos sem permissão administrativa e relê após nova sessão", async () => {
    select(alice);
    for (const category of ["show", "theater", "sport", "cultural", "other"] as const) {
      const id = await savePersonalEvent(alice.uid, { ...input, category }); if (category === "show") eventId = id;
      expect((await getDocFromServer(ref(alice, id))).data()).toMatchObject({ ...input, category, ownerId: alice.uid });
    }
    const rows = await reload(client(alice.uid)); expect(rows).toHaveLength(5); expect(rows.find(row => row.id === eventId)).toMatchObject(input);
    select(bob); const id = await savePersonalEvent(bob.uid, { ...input, title: "Evento de outra conta" }); expect((await reload(client(bob.uid))).map(row => row.id)).toEqual([id]);
  }, 20000);
  it("atualiza o mesmo registro, permite gratuito e remove detalhes privados opcionais", async () => {
    select(alice); const { ticketUrl: omittedLink, notes: omittedNotes, endTime: omittedEnd, ...minimum } = input;
    expect(omittedLink && omittedNotes && omittedEnd).toBeTruthy();
    await savePersonalEvent(alice.uid, { ...minimum, title: "Evento editado", priceCents: 0 }, eventId);
    const saved = (await getDocFromServer(ref(alice))).data()!; expect(saved.title).toBe("Evento editado"); expect(saved.priceCents).toBe(0);
    expect(saved).not.toHaveProperty("ticketUrl"); expect(saved).not.toHaveProperty("notes"); expect(saved).not.toHaveProperty("endTime");
    expect((await reload(client(alice.uid))).filter(row => row.id === eventId)).toHaveLength(1);
  });
  it("projeta na Agenda somente os eventos do dono, com múltiplos compromissos durante uma viagem", async () => {
    const rows = await reload(client(alice.uid));
    const trip = { ...demoTrip, startDate: "2028-02-28", endDate: "2028-03-02" };
    const agenda = unifiedAgenda([trip], rows, "", "all");
    expect(agenda.periods).toHaveLength(1); expect(agenda.eventsByDay.get("2028-02-29")).toHaveLength(5);
    expect(agenda.events.every(event => event.ownerId === alice.uid)).toBe(true);
    expect(agenda.events.some(event => event.title === "Evento de outra conta")).toBe(false);
    expect(unifiedAgenda([trip], rows, "", "events").periods).toEqual([]);
    expect(agenda.points.every(point => !Object.hasOwn(point, "priceCents") && !Object.hasOwn(point, "notes"))).toBe(true);
  });
  it("outros usuários, administrador, visitante e anônimo não acessam nem editam/excluem eventos alheios", async () => {
    for (const person of [bob, admin, guest, anonymous]) {
      await expect(getDocFromServer(ref(person))).rejects.toMatchObject({ code: "permission-denied" });
      await expect(getDocsFromServer(query(collection(person.db, "personalEvents"), where("ownerId", "==", alice.uid)))).rejects.toMatchObject({ code: "permission-denied" });
      await expect(updateDoc(ref(person), { notes: "tentativa", updatedAt: serverTimestamp() })).rejects.toMatchObject({ code: "permission-denied" });
      await expect(deleteDoc(ref(person))).rejects.toMatchObject({ code: "permission-denied" });
    }
    expect((await getDocFromServer(ref(alice))).data()?.title).toBe("Evento editado");
  }, 20000);
  it("recusa descoberta sem filtro, criação em nome de outro dono e criação anônima", async () => {
    await expect(getDocsFromServer(collection(alice.db, "personalEvents"))).rejects.toMatchObject({ code: "permission-denied" });
    const payload = { ...input, ownerId: bob.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await expect(setDoc(ref(alice, "wrong-owner"), payload)).rejects.toMatchObject({ code: "permission-denied" });
    for (const person of [guest, anonymous]) await expect(setDoc(ref(person, `blocked-${suffix}`), { ...payload, ownerId: person.uid })).rejects.toMatchObject({ code: "permission-denied" });
  });
  it("bloqueia transferência de propriedade, alteração de criação e acesso público por campos extras", async () => {
    for (const patch of [{ ownerId: bob.uid }, { createdAt: Timestamp.fromMillis(0) }, { isPublic: true }, { access: "PUBLIC" }, { tripId: "anything" }, { status: "confirmado" }]) {
      await expect(updateDoc(ref(alice), { ...patch, updatedAt: serverTimestamp() })).rejects.toMatchObject({ code: "permission-denied" });
    }
    await expect(setDoc(doc(alice.db, "personalEvents", eventId, "private", "extra"), { value: "unapproved" })).rejects.toMatchObject({ code: "permission-denied" });
  });
  it("regras validam datas reais, horários, centavos e payload fechado mesmo fora do formulário", async () => {
    for (const patch of [{ title: " " }, { city: "" }, { location: "" }, { category: "Café" }, { date: "2026-02-29" }, { date: "2100-02-29" }, { date: "2026-04-31" }, { date: "2026-00-01" }, { startTime: "24:00" }, { endTime: "12:75" }, { priceCents: -1 }, { priceCents: 1.5 }, { priceCents: 1000000001 }, { priceCents: null }, { ticketUrl: "javascript:alert(1)" }, { notes: "x".repeat(3001) }, { updatedAt: Timestamp.fromMillis(0) }]) {
      await expect(updateDoc(ref(alice), { ...patch, updatedAt: serverTimestamp(), ...(Object.hasOwn(patch, "updatedAt") ? patch : {}) })).rejects.toMatchObject({ code: "permission-denied" });
    }
    await updateDoc(ref(alice), { date: "2000-02-29", startTime: "23:30", endTime: "02:00", updatedAt: serverTimestamp() });
    expect((await getDocFromServer(ref(alice))).data()?.date).toBe("2000-02-29");
  }, 25000);
  it("somente o dono exclui e a exclusão persiste ao recarregar", async () => {
    select(alice); await removePersonalEvent(alice.uid, eventId);
    // Missing documents expose no owner, so direct reads remain closed rather than allowing existence probes.
    await expect(getDocFromServer(ref(alice))).rejects.toMatchObject({ code: "permission-denied" });
    expect((await reload(client(alice.uid))).some(row => row.id === eventId)).toBe(false);
    expect((await getDocsFromServer(query(collection(alice.db, "personalEvents"), where("ownerId", "==", alice.uid)))).size).toBe(4);
  });
});
