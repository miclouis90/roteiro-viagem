import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, doc, setDoc, getDocFromServer, getDocsFromServer, collection, serverTimestamp, updateDoc, writeBatch, terminate, setLogLevel, type Firestore } from "firebase/firestore";
import { demoTrip, demoEvents } from "../data/demo";
import { tripInput, eventInput } from "../utils/inputs";
const current=vi.hoisted(()=>({db:null as Firestore|null,uid:""}));
vi.mock("../lib/firebase",()=>({get db(){return current.db;},get auth(){return {currentUser:{uid:current.uid,isAnonymous:false}};},demoMode:false}));
import { saveFinancialExpense, saveDailyBudget, watchFinancialPlan, removeFinancialExpense, saveFinancialPayment, saveFinancialExchange } from "./financialPlanning";
import { multiCurrencySettlement } from "../utils/currencyPlanning";
import { financialSettlement } from "../utils/financialPlanning";
import type { FinancialPlan, FinancialPaymentInput } from "../utils/financialTypes";
describe.skipIf(process.env.RUMO_FINANCIAL_EMULATOR!=="true")("Planejamento privado no emulador",()=>{
 const project="demo-rumo-local",tripId=`financial-${Date.now()}`;
 const clients:{db:Firestore;app:FirebaseApp;uid:string}[]=[];
 function client(uid=""){
  const app=initializeApp({projectId:project,apiKey:"local-only"},`financial-${uid||"guest"}-${clients.length}`),db=getFirestore(app);
  connectFirestoreEmulator(db,"127.0.0.1",8089,uid?{mockUserToken:{sub:uid,user_id:uid}}:{});
  const person={app,db,uid};clients.push(person);return person;
 }
 function selectClient(person:ReturnType<typeof client>){current.db=person.db;current.uid=person.uid;}
 let owner:ReturnType<typeof client>,editor:ReturnType<typeof client>,visitor:ReturnType<typeof client>,linkVisitor:ReturnType<typeof client>;
 const expense={name:"Seguro",category:"insurance" as const,amountCents:89939,quantity:2,notes:"FINANCE-PRIVATE",currency:"BRL"};
 const budget={category:"food" as const,dailyAmountCents:10000,currency:"BRL"};
 const expenseRef=(db:Firestore,id:string)=>doc(db,"trips",tripId,"financialExpenses",id);
 const budgetRef=(db:Firestore)=>doc(db,"trips",tripId,"financialDailyBudgets","food");
 async function reload(uid:string){
  const fresh=client(uid);selectClient(fresh);
  return new Promise<FinancialPlan>((resolve,reject)=>{
   let stop=()=>{};
   const timer=setTimeout(()=>{stop();reject(new Error("Local planning reload timed out"));},10000);
   stop=watchFinancialPlan(tripId,plan=>{clearTimeout(timer);stop();resolve(plan);},cause=>{clearTimeout(timer);stop();reject(cause);});
  });
 }
 beforeAll(async()=>{
  setLogLevel("silent");
  const rules=readFileSync("firestore.rules","utf8").replace(/^\uFEFF/,"");
  const loaded=await fetch(`http://127.0.0.1:8089/emulator/v1/projects/${project}:securityRules`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({rules:{files:[{name:"firestore.rules",content:rules}]}})});expect(loaded.ok,await loaded.text()).toBe(true);
  const adminFixture=await fetch(`http://127.0.0.1:8089/v1/projects/${project}/databases/(default)/documents/platformAdmins/finance-owner`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer owner"},body:JSON.stringify({fields:{active:{booleanValue:true}}})});expect(adminFixture.ok).toBe(true);
  owner=client("finance-owner");editor=client("finance-editor");visitor=client();linkVisitor=client("finance-link");
  await setDoc(doc(owner.db,"trips",tripId),{...tripInput(demoTrip),currency:"BRL",ownerId:owner.uid,access:"PUBLIC_EDIT",isPublic:true,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  await setDoc(doc(owner.db,"trips",tripId,"members",editor.uid),{uid:editor.uid,role:"editor",displayName:"Editor local",email:"local@example.test",addedAt:serverTimestamp()});
 },25000);
 afterAll(async()=>{await Promise.all(clients.map(async({db,app})=>{await terminate(db);await deleteApp(app);}));},20000);
 it("proprietário e colaborador criam e editam com persistência sem duplicar registros",async()=>{
  for(const person of [owner,editor]){
   selectClient(person);const id=await saveFinancialExpense(tripId,expense);await saveFinancialExpense(tripId,{...expense,quantity:3},id);
   await saveDailyBudget(tripId,budget);await saveDailyBudget(tripId,{...budget,dailyAmountCents:15000});
   const plan=await reload(person.uid);expect(plan.expenses.find(item=>item.id===id)).toMatchObject({...expense,quantity:3});expect(plan.expenses.filter(item=>item.id===id)).toHaveLength(1);
   expect(plan.dailyBudgets).toEqual([{...budget,dailyAmountCents:15000}]);
   expect((await getDocFromServer(expenseRef(person.db,id))).data()?.amountCents).toBe(89939);
  }
  expect((await getDocsFromServer(collection(owner.db,"trips",tripId,"events"))).size).toBe(0);
 },30000);
 it("visitantes públicos, autenticados por link e anônimos não leem nem gravam planejamento",async()=>{
  const id=(await getDocsFromServer(collection(owner.db,"trips",tripId,"financialExpenses"))).docs[0].id;
  for(const person of [visitor,linkVisitor]){
   await expect(getDocFromServer(expenseRef(person.db,id))).rejects.toMatchObject({code:"permission-denied"});
   await expect(getDocsFromServer(collection(person.db,"trips",tripId,"financialExpenses"))).rejects.toMatchObject({code:"permission-denied"});
   await expect(getDocFromServer(budgetRef(person.db))).rejects.toMatchObject({code:"permission-denied"});
   await expect(setDoc(expenseRef(person.db,"blocked"),{...expense,createdAt:serverTimestamp(),updatedAt:serverTimestamp()})).rejects.toMatchObject({code:"permission-denied"});
   await expect(setDoc(budgetRef(person.db),{...budget,updatedAt:serverTimestamp()})).rejects.toMatchObject({code:"permission-denied"});
  }
 },30000);
 it("as regras recusam campos extras, valores fracionários em centavos, quantidades e moedas inválidas",async()=>{
  const base={...expense,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
  for(const patch of [{amountCents:-1},{amountCents:1.5},{amountCents:1000000001},{quantity:0},{quantity:1.5},{currency:"XXX"},{category:"bad"},{notes:42},{extra:"PRIVATE"},{updatedAt:null}]){
   await expect(setDoc(expenseRef(owner.db,"invalid"),{...base,...patch})).rejects.toMatchObject({code:"permission-denied"});
  }
  for(const patch of [{category:"night"},{dailyAmountCents:-1},{dailyAmountCents:1.5},{currency:"XXX"},{extra:true}])await expect(setDoc(budgetRef(owner.db),{...budget,updatedAt:serverTimestamp(),...patch})).rejects.toMatchObject({code:"permission-denied"});
  await expect(setDoc(doc(owner.db,"trips",tripId,"financialDailyBudgets","lodging"),{...budget,category:"lodging",updatedAt:serverTimestamp()})).rejects.toMatchObject({code:"permission-denied"});
 },30000);
 it("acesso PRIVATE bloqueia até colaboradores retidos, sem alterar permissões existentes",async()=>{
  await updateDoc(doc(owner.db,"trips",tripId),{access:"PRIVATE",isPublic:false,updatedAt:serverTimestamp()});
  await expect(getDocFromServer(budgetRef(editor.db))).rejects.toMatchObject({code:"permission-denied"});
  await expect(setDoc(budgetRef(editor.db),{...budget,updatedAt:serverTimestamp()})).rejects.toMatchObject({code:"permission-denied"});
  expect((await getDocFromServer(budgetRef(owner.db))).exists()).toBe(true);
  await updateDoc(doc(owner.db,"trips",tripId),{access:"PUBLIC_EDIT",isPublic:true,updatedAt:serverTimestamp()});
 });
 it("permite avulsa gratuita, remoção e relê sem documento de programa duplicado",async()=>{
  selectClient(owner);const id=await saveFinancialExpense(tripId,{...expense,amountCents:0});expect((await reload(owner.uid)).expenses.find(item=>item.id===id)?.amountCents).toBe(0);
  selectClient(owner);await removeFinancialExpense(tripId,id);expect((await reload(owner.uid)).expenses.some(item=>item.id===id)).toBe(false);
 });
 it("pagamento de programa é privado, parcial/integral e independente da confirmação",async()=>{
  await setDoc(doc(owner.db,"trips",tripId,"events","payment-program"),{...eventInput(demoEvents[0]),status:"confirmado",pricePerPerson:100,peopleCount:1,isFree:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  selectClient(owner);const input:FinancialPaymentInput={source:"program",sourceId:"payment-program",label:"Programa",paidCents:4000,status:"partial",currency:"BRL",paymentMethod:"cash"};
  await saveFinancialPayment(tripId,input,null);
  let plan=await reload(editor.uid);let payment=plan.payments!.find(item=>item.id==="program:payment-program")!;
  expect(payment).toMatchObject({paidCents:4000,status:"partial",paymentMethod:"cash"});
  selectClient(editor);await saveFinancialPayment(tripId,{...input,paidCents:10000,status:"paid",paymentMethod:"card"},payment.lastChangeId);
  plan=await reload(owner.uid);payment=plan.payments!.find(item=>item.id==="program:payment-program")!;expect(payment.paidCents).toBe(10000);expect(plan.payments!.filter(item=>item.id===payment.id)).toHaveLength(1);
  const changes=await getDocsFromServer(collection(owner.db,"trips",tripId,"financialPayments",payment.id,"history"));expect(changes.size).toBe(2);
  expect(changes.docs.map(item=>item.data().paidCents).sort((a,b)=>a-b)).toEqual([4000,10000]);
  const program=(await getDocFromServer(doc(owner.db,"trips",tripId,"events","payment-program"))).data()!;expect(program.status).toBe("confirmado");expect(program).not.toHaveProperty("paidCents");
  await updateDoc(doc(owner.db,"trips",tripId,"events","payment-program"),{pricePerPerson:60,updatedAt:serverTimestamp()});
  const result=financialSettlement({...demoTrip,id:tripId},[{...program,id:"payment-program",pricePerPerson:60} as typeof demoEvents[number]],plan);
  expect(result.paidCents).toBe(10000);expect(result.excessCents).toBe(4000);expect(result.paidCents+result.pendingCents).toBe(result.totalCents+result.excessCents);
  await updateDoc(doc(owner.db,"trips",tripId,"events","payment-program"),{pricePerPerson:100,updatedAt:serverTimestamp()});
 },30000);
 it("pagamento de avulsa não duplica a despesa e rejeita edição concorrente",async()=>{
  selectClient(owner);const id=await saveFinancialExpense(tripId,{...expense,amountCents:10000,quantity:1});
  const input:FinancialPaymentInput={source:"expense",sourceId:id,label:"Seguro",paidCents:2500,status:"partial",currency:"BRL",paymentMethod:"pix"};
  await saveFinancialPayment(tripId,input,null);let payment=(await reload(owner.uid)).payments!.find(item=>item.sourceId===id)!;
  selectClient(owner);await expect(saveFinancialPayment(tripId,{...input,paidCents:5000},null)).rejects.toMatchObject({code:"aborted"});
  await saveFinancialPayment(tripId,{...input,paidCents:10000,status:"paid",paymentMethod:"card"},payment.lastChangeId);
  const plan=await reload(owner.uid);payment=plan.payments!.find(item=>item.sourceId===id)!;expect(payment.paidCents).toBe(10000);expect(plan.expenses.filter(item=>item.id===id)).toHaveLength(1);
  expect((await getDocsFromServer(collection(owner.db,"trips",tripId,"financialPayments",payment.id,"history"))).size).toBe(2);
 },30000);
 it("público e PUBLIC_EDIT não leem pagamentos/histórico, nem gravam metadados privados",async()=>{
  const ref=doc(owner.db,"trips",tripId,"financialPayments","program:payment-program");const saved=(await getDocFromServer(ref)).data()!;
  for(const person of [visitor,linkVisitor]){
   await expect(getDocFromServer(doc(person.db,"trips",tripId,"financialPayments",ref.id))).rejects.toMatchObject({code:"permission-denied"});
   await expect(getDocsFromServer(collection(person.db,"trips",tripId,"financialPayments"))).rejects.toMatchObject({code:"permission-denied"});
   await expect(getDocFromServer(doc(person.db,"trips",tripId,"financialPayments",ref.id,"history",saved.lastChangeId))).rejects.toMatchObject({code:"permission-denied"});
   await expect(updateDoc(doc(person.db,"trips",tripId,"financialPayments",ref.id),{paidCents:0,updatedAt:serverTimestamp()})).rejects.toMatchObject({code:"permission-denied"});
  }
  await updateDoc(doc(owner.db,"trips",tripId),{access:"PRIVATE",isPublic:false,updatedAt:serverTimestamp()});
  await expect(getDocFromServer(doc(editor.db,"trips",tripId,"financialPayments",ref.id))).rejects.toMatchObject({code:"permission-denied"});
  await updateDoc(doc(owner.db,"trips",tripId),{access:"PUBLIC_EDIT",isPublic:true,updatedAt:serverTimestamp()});
 },30000);
 it("exige revisão atômica, valida pagamentos e impede alteração do histórico",async()=>{
  const ref=doc(owner.db,"trips",tripId,"financialPayments","program:payment-program"),saved=(await getDocFromServer(ref)).data()!;
  await expect(updateDoc(ref,{paidCents:5000,status:"partial",updatedAt:serverTimestamp()})).rejects.toMatchObject({code:"permission-denied"});
  for(const patch of [{paidCents:-1},{paidCents:1.5},{paidCents:15000},{paymentMethod:"invalid"},{status:"confirmado"},{currency:"XXX"}]){
   const id=crypto.randomUUID(),data:Record<string,unknown>={...saved,...patch,lastChangeId:id,updatedAt:serverTimestamp()};
   const batch=writeBatch(owner.db);batch.set(ref,data);batch.set(doc(ref,"history",id),{source:data.source,sourceId:data.sourceId,label:data.label,currency:data.currency,paidCents:data.paidCents,status:data.status,paymentMethod:data.paymentMethod,previousPaidCents:saved.paidCents,changedBy:owner.uid,changedAt:serverTimestamp()});
   await expect(batch.commit()).rejects.toMatchObject({code:"permission-denied"});
  }
  await expect(updateDoc(doc(owner.db,"trips",tripId,"financialPayments",ref.id,"history",saved.lastChangeId),{paidCents:1})).rejects.toMatchObject({code:"permission-denied"});
  expect((await getDocFromServer(ref)).data()!.paidCents).toBe(10000);
 },30000);
 it("forma do orçamento diário persiste e seus complementos continuam não pagos",async()=>{
  selectClient(owner);await saveDailyBudget(tripId,{...budget,paymentMethod:"cash"});const plan=await reload(owner.uid);
  expect(plan.dailyBudgets.find(item=>item.category==="food")!.paymentMethod).toBe("cash");
  const snapshot=await getDocsFromServer(collection(owner.db,"trips",tripId,"events"));
  const result=financialSettlement({...demoTrip,id:tripId},snapshot.docs.map(item=>({...item.data(),id:item.id}) as typeof demoEvents[number]),plan);
  expect(result.lines.filter(line=>line.origin==="daily").every(line=>line.paidCents===0&&line.status==="planned")).toBe(true);
  expect(result.pendingByMethod.find(method=>method.id==="cash")!.amountCents).toBe(result.dailyCents);
  expect(result.pendingByMethod.reduce((sum,method)=>sum+method.amountCents,0)).toBe(result.pendingCents);
 },20000);

 it("moedas/câmbio persistem e mudar cotação não regrava os desembolsos nem o histórico",async()=>{
  selectClient(owner);await saveFinancialExchange(tripId,{referenceCurrency:"BRL",programCurrency:"BRL",rates:{USD:5000000},cashFeeBps:0,cardFeeBps:0});
  const id=await saveFinancialExpense(tripId,{...expense,name:"Hotel em USD",currency:"USD",amountCents:10000,quantity:1});
  const input:FinancialPaymentInput={source:"expense",sourceId:id,label:"Hotel em USD",currency:"USD",paidCents:4000,status:"partial",paymentMethod:"card",settlementCurrency:"BRL",settledCents:20800,feesCents:200,effectiveRateMicros:5200000};
  await saveFinancialPayment(tripId,input,null);let plan=await reload(owner.uid);const payment=plan.payments!.find(item=>item.sourceId===id)!;
  expect(payment).toMatchObject({currency:"USD",paidCents:4000,settlementCurrency:"BRL",settledCents:20800,feesCents:200,effectiveRateMicros:5200000});
  selectClient(owner);await saveFinancialPayment(tripId,{...input,paidCents:10000,status:"paid",settledCents:56800,feesCents:400,effectiveRateMicros:6000000},payment.lastChangeId);
  plan=await reload(owner.uid);const target=plan.payments!.find(item=>item.sourceId===id)!,ref=doc(owner.db,"trips",tripId,"financialPayments",target.id);
  const before=(await getDocFromServer(ref)).data()!,historyBefore=(await getDocsFromServer(collection(ref,"history"))).docs.map(item=>({id:item.id,...item.data()}));
  selectClient(owner);await saveFinancialExchange(tripId,{...plan.exchange!,rates:{USD:7000000},referenceCurrency:"USD"});
  const reloaded=await reload(owner.uid);expect(reloaded.exchange).toMatchObject({referenceCurrency:"USD",rates:{USD:7000000}});
  expect((await getDocFromServer(ref)).data()).toEqual(before);
  const historyAfter=(await getDocsFromServer(collection(ref,"history"))).docs.map(item=>({id:item.id,...item.data()}));expect(historyAfter).toEqual(historyBefore);expect(historyAfter).toHaveLength(2);
  expect(historyAfter.map(item=>Number((item as Record<string,unknown>).settledCents)).sort((a,b)=>a-b)).toEqual([20800,56800]);
  const original=(await getDocFromServer(expenseRef(owner.db,id))).data()!;expect(original).toMatchObject({currency:"USD",amountCents:10000,quantity:1});
  const result=multiCurrencySettlement({...demoTrip,id:tripId},[],{...reloaded,expenses:reloaded.expenses.filter(item=>item.id===id),dailyBudgets:[],payments:[reloaded.payments!.find(item=>item.id===target.id)!]});
  expect(result.totalCents).toBe(10000);expect(result.paidNative).toEqual([{currency:"BRL",amountCents:57200}]);
  expect(result.paidCents+result.pendingCents).toBe(result.totalCents+result.excessCents+result.exchangeDifferenceCents);
  await expect(updateDoc(expenseRef(owner.db,id),{currency:"BRL",updatedAt:serverTimestamp()})).rejects.toMatchObject({code:"permission-denied"});
 },30000);
 it("configurações são privadas, cotação/taxas inválidas são recusadas e moeda de programas é imutável",async()=>{
  const ref=doc(owner.db,"trips",tripId,"financialSettings","exchange"),base=(await getDocFromServer(ref)).data()!;
  await expect(updateDoc(doc(owner.db,"trips",tripId),{currency:"USD",updatedAt:serverTimestamp()})).rejects.toMatchObject({code:"permission-denied"});
  await updateDoc(doc(owner.db,"trips",tripId),{title:"Mesma viagem, valores originais preservados",updatedAt:serverTimestamp()});
  for(const person of [visitor,linkVisitor]){
   await expect(getDocFromServer(doc(person.db,"trips",tripId,"financialSettings","exchange"))).rejects.toMatchObject({code:"permission-denied"});
   await expect(setDoc(doc(person.db,"trips",tripId,"financialSettings","exchange"),{...base,updatedAt:serverTimestamp()})).rejects.toMatchObject({code:"permission-denied"});
  }
  for(const patch of [{rates:{USD:0}},{rates:{USD:1.5}},{rates:{USD:-1}},{rates:{USD:1000000000001}},{cashFeeBps:10001},{referenceCurrency:"XXX"},{programCurrency:"USD"}])await expect(setDoc(ref,{...base,...patch,updatedAt:serverTimestamp()})).rejects.toMatchObject({code:"permission-denied"});
 });

});
