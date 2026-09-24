/* global fetch, console, Buffer, setTimeout, clearTimeout */
// Local-only integration checks: starts no service and never targets production.
// Start the Firestore emulator on 127.0.0.1:8089, project demo-rumo-local.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, getDocs, collection, collectionGroup, query, where, onSnapshot, deleteDoc, updateDoc, serverTimestamp, terminate, setLogLevel } from 'firebase/firestore';
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
  await check('legacy admin cannot delete ownerless trip',()=>deny(()=>deleteDoc(tripRef)));
  await check('legacy admin cannot change access before claiming ownership',()=>deny(()=>updateDoc(tripRef,{isPublic:true,updatedAt:serverTimestamp()})));
  await check('legacy explicit ownership claim',()=>updateDoc(tripRef,{ownerId:'local-admin',access:'PRIVATE',updatedAt:serverTimestamp()}));
  await updateDoc(tripRef,{access:'PUBLIC',isPublic:true,updatedAt:serverTimestamp()});
  await check('public trip remains readable', async () => assert.equal((await getDoc(doc(guest,'trips',tripId))).exists(),true));
  await check('public event remains readable', async () => assert.equal((await getDoc(eventRef(guest,'flight'))).exists(),true));
  await check('public read still cannot write', () => deny(() => setDoc(eventRef(guest,'no-write'),event)));

  const outsider = client('rules-outsider', 'outsider');
  await check('legacy owner claim explicitly preserves document and events', async()=>{
    await updateDoc(tripRef,{ownerId:'local-admin',access:'PUBLIC',updatedAt:serverTimestamp()});
    assert.equal((await getDoc(eventRef(admin,'legacy'))).exists(),true);
  });
  await check('cannot transfer owner implicitly',()=>deny(()=>updateDoc(tripRef,{ownerId:'outsider',updatedAt:serverTimestamp()})));
  await check('owner edits content',()=>updateDoc(tripRef,{notes:'Owner edit',updatedAt:serverTimestamp()}));
  const membership=doc(admin,'trips',tripId,'members','local-member');
  await setDoc(membership,{uid:'local-member',role:'editor',displayName:'Mel',email:'mel@example.test',addedAt:serverTimestamp()});
  await check('editor edits trip content',()=>updateDoc(doc(member,'trips',tripId),{notes:'Mel edit',updatedAt:serverTimestamp()}));
  await check('editor creates program',()=>setDoc(eventRef(member,'collaborative'),event));
  await check('editor edits program cost and location',()=>updateDoc(eventRef(member,'collaborative'),{isFree:false,pricePerPerson:25,location:'Novo local',updatedAt:serverTimestamp()}));
  await check('editor deletes program',()=>deleteDoc(eventRef(member,'collaborative')));
  await check('editor cannot delete trip',()=>deny(()=>deleteDoc(doc(member,'trips',tripId))));
  await check('editor cannot change access',()=>deny(()=>updateDoc(doc(member,'trips',tripId),{access:'PUBLIC_EDIT',updatedAt:serverTimestamp()})));
  await check('editor cannot change isPublic',()=>deny(()=>updateDoc(doc(member,'trips',tripId),{isPublic:false,updatedAt:serverTimestamp()})));
  await check('editor cannot claim owner',()=>deny(()=>updateDoc(doc(member,'trips',tripId),{ownerId:'local-member',updatedAt:serverTimestamp()})));
  await check('editor cannot add members',()=>deny(()=>setDoc(doc(member,'trips',tripId,'members','outsider'),{uid:'outsider',role:'editor',displayName:'',email:'',addedAt:serverTimestamp()})));
  await check('editor reads own membership',async()=>assert.equal((await getDoc(doc(member,'trips',tripId,'members','local-member'))).exists(),true));
  await check('editor discovers own memberships',async()=>assert.ok((await getDocs(query(collectionGroup(member,'members'),where('uid','==','local-member')))).size>=1));
  await check('editor cannot list other members',()=>deny(()=>getDocs(collection(member,'trips',tripId,'members'))));
  await check('owner lists members',async()=>assert.equal((await getDocs(collection(admin,'trips',tripId,'members'))).size,1));
  await check('anonymous cannot edit PUBLIC',()=>deny(()=>updateDoc(eventRef(guest,'legacy'),{title:'Attack',updatedAt:serverTimestamp()})));
  await check('non-member cannot edit PUBLIC',()=>deny(()=>updateDoc(eventRef(outsider,'legacy'),{title:'Attack',updatedAt:serverTimestamp()})));
  await check('public home query',async()=>assert.ok((await getDocs(query(collection(guest,'trips'),where('isPublic','==',true)))).size>=1));
  await updateDoc(tripRef,{access:'SHARED',isPublic:false,updatedAt:serverTimestamp()});
  await check('member reads SHARED',async()=>assert.equal((await getDoc(doc(member,'trips',tripId))).exists(),true));
  await check('outsider cannot read SHARED',()=>deny(()=>getDoc(doc(outsider,'trips',tripId))));
  await check('guest cannot read SHARED',()=>deny(()=>getDoc(doc(guest,'trips',tripId))));
  await updateDoc(tripRef,{access:'PRIVATE',updatedAt:serverTimestamp()});
  await check('PRIVATE blocks even retained editors',()=>deny(()=>getDoc(doc(member,'trips',tripId))));
  await check('PRIVATE blocks editor writes',()=>deny(()=>setDoc(eventRef(member,'private-write'),event)));
  await check('PRIVATE blocks outsiders',()=>deny(()=>getDoc(doc(outsider,'trips',tripId))));
  await check('owner reads PRIVATE',async()=>assert.equal((await getDoc(tripRef)).exists(),true));
  await updateDoc(tripRef,{access:'PUBLIC_EDIT',isPublic:true,updatedAt:serverTimestamp()});
  await check('authenticated link visitor creates program',()=>setDoc(eventRef(outsider,'link-edit'),event));
  await check('authenticated link visitor edits trip content',()=>updateDoc(doc(outsider,'trips',tripId),{description:'Together',updatedAt:serverTimestamp()}));
  await check('link visitor cannot change permissions',()=>deny(()=>updateDoc(doc(outsider,'trips',tripId),{access:'PUBLIC',updatedAt:serverTimestamp()})));
  await check('link visitor cannot delete trip',()=>deny(()=>deleteDoc(doc(outsider,'trips',tripId))));
  await check('anonymous cannot write PUBLIC_EDIT',()=>deny(()=>setDoc(eventRef(guest,'anonymous'),event)));
  const anonymousApp=initializeApp({projectId:project,apiKey:'local-only'},'anonymous-auth');
  const anonymousDb=getFirestore(anonymousApp); connectFirestoreEmulator(anonymousDb,'127.0.0.1',port,{mockUserToken:{sub:'anonymous',firebase:{sign_in_provider:'anonymous'}}}); databases.push({db:anonymousDb,app:anonymousApp});
  await check('Firebase anonymous Auth cannot write',()=>deny(()=>setDoc(eventRef(anonymousDb,'anonymous-auth'),event)));
  await check('link visitor joins under own uid',()=>setDoc(doc(outsider,'trips',tripId,'members','outsider'),{uid:'outsider',role:'editor',email:'',displayName:'',addedAt:serverTimestamp()}));
  await check('link visitor cannot join as owner',()=>deny(()=>setDoc(doc(outsider,'trips',tripId,'members','outsider'),{uid:'outsider',role:'owner',email:'',displayName:'',addedAt:serverTimestamp()})));
  await check('link visitor cannot impersonate another uid',()=>deny(()=>setDoc(doc(outsider,'trips',tripId,'members','fake'),{uid:'fake',role:'editor',email:'',displayName:'',addedAt:serverTimestamp()})));
  await updateDoc(tripRef,{access:'SHARED',isPublic:false,updatedAt:serverTimestamp()});
  await check('joined member remains after access restricts to SHARED',()=>setDoc(eventRef(outsider,'after-restrict'),event));
  await check('member leaves trip',()=>deleteDoc(doc(outsider,'trips',tripId,'members','outsider')));
  await check('left member loses read access',()=>deny(()=>getDoc(doc(outsider,'trips',tripId))));
  await check('left member loses write access',()=>deny(()=>setDoc(eventRef(outsider,'after-leave'),event)));
  await check('owner removes editor',()=>deleteDoc(membership));
  await check('removed editor loses access',()=>deny(()=>getDoc(doc(member,'trips',tripId))));
  await check('malformed access rejected',()=>deny(()=>updateDoc(tripRef,{access:'EVERYONE',updatedAt:serverTimestamp()})));
  await check('isPublic/access inconsistency rejected',()=>deny(()=>updateDoc(tripRef,{isPublic:true,updatedAt:serverTimestamp()})));
  await check('owned home query',async()=>assert.ok((await getDocs(query(collection(admin,'trips'),where('ownerId','==','local-admin')))).size>=1));
  await check('removed editor cannot discover all trips',()=>deny(()=>getDocs(collection(member,'trips'))));
  // Concurrent changes to distinct fields preserve one another with partial updates.
  await updateDoc(tripRef,{access:'PUBLIC_EDIT',isPublic:true,updatedAt:serverTimestamp()});
  await Promise.all([updateDoc(eventRef(admin,'legacy'),{location:'Owner place',updatedAt:serverTimestamp()}),updateDoc(eventRef(outsider,'legacy'),{notes:'Editor note',updatedAt:serverTimestamp()})]);
  await check('concurrent partial writes preserve both fields',async()=>{const data=(await getDoc(eventRef(admin,'legacy'))).data();assert.equal(data.location,'Owner place');assert.equal(data.notes,'Editor note');});
  await check('second client receives listener changes without reload',async()=>{
    let stop=()=>{};
    const received=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{stop();reject(new Error('Listener timed out'));},10000);
      stop=onSnapshot(eventRef(outsider,'legacy'),s=>{if(s.data()?.notes==='Live collaboration'){clearTimeout(timer);stop();resolve();}},e=>{clearTimeout(timer);reject(e);});
    });
    await updateDoc(eventRef(admin,'legacy'),{notes:'Live collaboration',updatedAt:serverTimestamp()});
    await received;
  });
  const other=doc(admin,'trips',tripId+'-other');
  await setDoc(other,{...trip,ownerId:'local-admin',access:'PRIVATE'});
  await check('owner deletes own trip',()=>deleteDoc(other));

  console.log(`${passed} local Firestore rules checks passed. No production project was accessed.`);
} finally {
  await Promise.all(databases.map(async ({db,app}) => { await terminate(db); await deleteApp(app); }));
}
