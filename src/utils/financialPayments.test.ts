import { describe, expect, it } from "vitest";
import { financialSettlement, financialProjection, validatePayment, currentFinancialStatus } from "./financialPlanning";
import type { FinancialPayment, FinancialPlan } from "./financialTypes";
import { demoTrip, demoEvents } from "../data/demo";
const trip={...demoTrip,startDate:"2026-10-29",endDate:"2026-10-30",currency:"BRL"};
const event={...demoEvents[0],id:"program-1",category:"Almoço",pricePerPerson:100,peopleCount:1,isFree:false,status:"confirmado" as const,date:trip.startDate};
const expense={id:"insurance",name:"Seguro",category:"insurance" as const,amountCents:5000,quantity:2,notes:"",currency:"BRL"};
const payment=(patch:Partial<FinancialPayment>={}):FinancialPayment=>({id:"program:program-1",source:"program",sourceId:"program-1",label:event.title,currency:"BRL",paidCents:4000,status:"partial",paymentMethod:"cash",lastChangeId:"rev1",...patch});
const plan=(payments:FinancialPayment[]=[]):FinancialPlan=>({expenses:[expense],dailyBudgets:[{category:"food",dailyAmountCents:15000,currency:"BRL",paymentMethod:"card"}],payments});
function reconciles(result:ReturnType<typeof financialSettlement>){expect(result.paidCents+result.pendingCents).toBe(result.totalCents+result.excessCents);expect(result.pendingByMethod.reduce((sum,method)=>sum+method.amountCents,0)).toBe(result.pendingCents);}
describe("pagamentos sem alterar o planejamento",()=>{
 it("registros da Fase 1 ficam previstos, não pagos e a definir",()=>{
  const legacy={expenses:[expense],dailyBudgets:[]};const result=financialSettlement(trip,[event],legacy);
  expect(result).toMatchObject({paidCents:0,pendingCents:20000,totalCents:20000});expect(result.lines.every(line=>line.status==="planned")).toBe(true);expect(result.pendingByMethod.find(method=>method.id==="undefined")?.amountCents).toBe(20000);reconciles(result);
 });
 it("programa confirmado não é um pagamento e reserva financeira é independente",()=>{
  const result=financialSettlement(trip,[event],plan([payment({paidCents:0,status:"reserved"})]));
  expect(result.lines.find(line=>line.id==="program:program-1")).toMatchObject({status:"reserved",paidCents:0,pendingCents:10000});expect(event.status).toBe("confirmado");reconciles(result);
 });
 it("concilia parcial em dinheiro, integral no cartão e orçamento diário ainda pendente",()=>{
  const result=financialSettlement(trip,[event],plan([payment(),payment({id:"expense:insurance",source:"expense",sourceId:"insurance",label:"Seguro",paidCents:10000,status:"paid",paymentMethod:"card"})]));
  expect(result).toMatchObject({totalCents:40000,paidCents:14000,pendingCents:26000,excessCents:0});
  expect(result.pendingByMethod.map(method=>[method.id,method.amountCents])).toEqual([["undefined",0],["cash",6000],["card",20000],["pix",0]]);
  expect(result.lines.filter(line=>line.origin==="daily").every(line=>line.paidCents===0&&line.status==="planned")).toBe(true);reconciles(result);
 });
 it("não perde pendências sem forma definida e não duplica snapshots",()=>{
  const entry=payment({paymentMethod:"undefined"});const result=financialSettlement(trip,[event,event],plan([entry,entry]));
  expect(result.paidCents).toBe(4000);expect(result.pendingByMethod.find(method=>method.id==="undefined")?.amountCents).toBe(16000);reconciles(result);
 });
 it("pix e dinheiro permanecem separados",()=>{
  const result=financialSettlement(trip,[event],{expenses:[expense],dailyBudgets:[],payments:[payment({paidCents:0,status:"planned",paymentMethod:"pix"}),payment({id:"expense:insurance",source:"expense",sourceId:"insurance",paidCents:2500,paymentMethod:"cash"})]});
  expect(result.pendingByMethod.find(method=>method.id==="pix")?.amountCents).toBe(10000);expect(result.pendingByMethod.find(method=>method.id==="cash")?.amountCents).toBe(7500);reconciles(result);
 });
 it("pagamentos não mudam nenhum custo ou complemento da Fase 1",()=>{
  const base=plan();const before=financialProjection(trip,[event],base),after=financialSettlement(trip,[event],{...base,payments:[payment()]});
  for(const key of ["totalCents","programCents","expensesCents","dailyCents"] as const)expect(after[key]).toBe(before[key]);
  expect(after.daily).toEqual(before.daily);expect(after.categories).toEqual(before.categories);
 });
 it("hospedagem continua uma vez e pagamento parcial não depende de noites/hóspedes",()=>{
  const stay={...event,id:"stay",category:"Hotel",pricePerPerson:900,details:{type:"lodging" as const,checkOutDate:trip.endDate,guests:4}};
  const result=financialSettlement(trip,[stay,stay],{expenses:[],dailyBudgets:[],payments:[payment({id:"program:stay",sourceId:"stay",paidCents:30000,paymentMethod:"pix"})]});
  expect(result).toMatchObject({totalCents:90000,paidCents:30000,pendingCents:60000});reconciles(result);
 });
 it("preserva excedentes após redução, cancelamento ou exclusão do custo",()=>{
  const recorded=payment({paidCents:10000,status:"paid"});
  for(const events of [[{...event,pricePerPerson:60}],[{...event,status:"cancelado" as const}],[]]){
   const result=financialSettlement(trip,events,{expenses:[],dailyBudgets:[],payments:[recorded]});
   expect(result.paidCents).toBe(10000);expect(result.excessCents).toBe(events.length&&events[0].status!=="cancelado"?4000:10000);reconciles(result);
  }
 });
 it("recalcula situação se o preço aumenta e não converte pagamentos antigos",()=>{
  const result=financialSettlement(trip,[{...event,pricePerPerson:150}],{expenses:[],dailyBudgets:[],payments:[payment({paidCents:10000,status:"paid"})]});
  expect(result.lines[0]).toMatchObject({status:"partial",pendingCents:5000});reconciles(result);
  const foreign=financialSettlement({...trip,currency:"USD"},[event],plan([payment()]));expect(foreign.paidCents).toBe(0);expect(foreign.incompatiblePayments).toHaveLength(1);reconciles(foreign);
 });
});
describe("validação dos pagamentos",()=>{
 it.each([{paidCents:-1},{paidCents:1.5},{paidCents:NaN},{paidCents:Infinity},{paidCents:1e13+1},{paymentMethod:"bitcoin"},{status:"confirmado"},{source:"daily"},{sourceId:"bad/path"},{status:"reserved",paidCents:1},{status:"partial",paidCents:0}])("recusa %o",patch=>expect(()=>validatePayment({...payment(),...patch} as never)).toThrow());
 it("zero não se torna pago sozinho e o status depende do valor atual",()=>{expect(currentFinancialStatus(0)).toBe("planned");expect(currentFinancialStatus(10000,payment())).toBe("partial");expect(currentFinancialStatus(4000,payment())).toBe("paid");});
});
