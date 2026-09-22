/* global fetch, console, Buffer */
// Local-only integration checks: starts no service and never targets production.
// Start the Firestore emulator on 127.0.0.1:8089, project demo-rumo-local.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, updateDoc, serverTimestamp, terminate, setLogLevel } from 'firebase/firestore';
setLogLevel('silent');
const project = 'demo-rumo-local';
const port = 8089;
const databases = [];
function client(name, uid) {
  const app = initializeApp({projectId:project, apiKey:'local-only'}, name);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', port, uid ? { mockUserToken: { sub: uid, user_id: uid } } : {});
  databases.push({db,app}); return db;
}
async function loadFixture(path) {
  const js = ts.transpileModule(readFileSync(path,'utf8'), { compilerOptions:{module:ts.ModuleKind.ES2022} }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
const deny = (fn) => assert.rejects(fn, error => error.code === 'permission-denied');
try {
  const response = await fetch(`http://127.0.0.1:${port}/v1/projects/${project}/databases/(default)/documents/platformAdmins/local-admin`, { method:'PATCH', headers:{'Content-Type':'application/json', Authorization:'Bearer owner'}, body:JSON.stringify({fields:{active:{booleanValue:true}}}) });
  assert.equal(response.ok, true, await response.text());
  const admin = client('rules-admin', 'local-admin'), member = client('rules-member', 'local-member'), guest = client('rules-guest');
  const {melTrip} = await loadFixture('src/data/melTrip.ts');
  const {melEvents} = await loadFixture('src/data/melEvents.ts');
  const tripId = `test-${Date.now()}`;
  const trip = {...melTrip, createdAt:serverTimestamp(), updatedAt:serverTimestamp()};
  const program = {...melEvents[0]};
  delete program.id;
  const event = {...program, createdAt:serverTimestamp(), updatedAt:serverTimestamp()};
  const tripRef = doc(admin,'trips',tripId);
  const eventRef = (db, id) => doc(db,'trips',tripId,'events',id);
  await check('old trip without theme remains valid', () => setDoc(tripRef,trip));
  await check('old event without details remains valid', () => setDoc(eventRef(admin,'legacy'),event));
  for (const accent of ['green','blue','lavender','coral','gold']) await check(`theme ${accent}`, () => updateDoc(tripRef,{theme:{accent},updatedAt:serverTimestamp()}));
  for (const theme of [null,[],{accent:'red'},{accent:'blue',arbitrary:'field'},{accent:{nested:true}},'blue']) await check('invalid theme rejected', () => deny(() => updateDoc(tripRef,{theme,updatedAt:serverTimestamp()})));
  const valid = [
    {type:'flight',company:'LATAM',flightNumber:'LA1234',originAirport:'BSB',destinationAirport:'GRU',boardingTime:'07:00',departureTime:'07:45',arrivalTime:'09:20',seat:'12A',bookingReference:'EXAMPLE'},
    {type:'restaurant',reservationTime:'12:00',reservationName:'Teste',recommendedDish:'Prato'},
    {type:'bar',happyHour:'18h',signatureDrink:'Drink'},
    {type:'culture',ticketUrl:'https://example.com/ticket',ticketCode:'TEST',exhibition:'Exposição'},
    {type:'outdoor',weatherDependent:true,whatToBring:'Água'},
    {type:'transfer',pickupLocation:'Aeroporto',driver:'Teste'},
    {type:'car',rentalCompany:'Teste',vehicle:'Compacto'},
    {type:'rail',line:'Azul',platform:'2',ticket:'TEST'},
  ];
  for (const details of valid) await check(`details ${details.type}`, () => setDoc(eventRef(admin,details.type),{...event,details}));
  for (const details of [null,[],{}, {type:'unknown'}, {type:'flight',extra:'no'}, {type:'flight',company:10}, {type:'flight',company:'x'.repeat(1001)}, {type:'flight',company:{nested:'no'}}, {type:'flight',boardingTime:'25:99'}, {type:'outdoor',weatherDependent:'yes'}, {type:'culture',ticketUrl:'javascript:alert(1)'}, {type:'bar',company:'wrong kind'}]) await check('invalid details rejected', () => deny(() => setDoc(eventRef(admin,`invalid-${passed}`),{...event,details})));
  await check('new unknown top-level field rejected', () => deny(() => setDoc(eventRef(admin,'unknown'),{...event,surprise:true})));
  await check('ordinary authenticated user cannot write', () => deny(() => setDoc(eventRef(member,'no-write'),event)));
  await check('guest cannot read private trip', () => deny(() => getDoc(doc(guest,'trips',tripId))));
  await check('guest cannot read private event', () => deny(() => getDoc(eventRef(guest,'legacy'))));
  await check('admin remains unable to grant admin access', () => deny(() => setDoc(doc(admin,'platformAdmins','local-member'),{active:true})));
  await updateDoc(tripRef,{isPublic:true,updatedAt:serverTimestamp()});
  await check('public trip remains readable', async () => assert.equal((await getDoc(doc(guest,'trips',tripId))).exists(),true));
  await check('public event remains readable', async () => assert.equal((await getDoc(eventRef(guest,'flight'))).exists(),true));
  await check('public read still cannot write', () => deny(() => setDoc(eventRef(guest,'no-write'),event)));
  console.log(`${passed} local Firestore rules checks passed. No production project was accessed.`);
} finally {
  await Promise.all(databases.map(async ({db,app}) => { await terminate(db); await deleteApp(app); }));
}
