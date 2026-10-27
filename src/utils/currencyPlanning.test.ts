import { describe,it,expect } from "vitest";
import { convertCents,ratio,parseRate,validateExchange,validateDisbursement } from "./foreignMoney";
import { multiCurrencySettlement } from "./currencyPlanning";
import { demoTrip,demoEvents } from "../data/demo";
import type { FinancialPlan,FinancialPayment,FinancialExchange } from "./financialTypes";
const trip={...demoTrip,startDate:"2026-10-29",endDate:"2026-10-29",currency:"BRL"};
const exchange:FinancialExchange={referenceCurrency:"BRL",programCurrency:"BRL",rates:{USD:5000000},cashFeeBps:0,cardFeeBps:0};
const expense={id:"usd",name:"Hotel",category:"lodging" as const,amountCents:10000,quantity:1,currency:"USD",notes:""};
const plan=(patch:Partial<FinancialPlan>={}):FinancialPlan=>({expenses:[expense],dailyBudgets:[],exchange,...patch});
const payment:FinancialPayment={id:"expense:usd",source:"expense",sourceId:"usd",label:"Hotel",currency:"USD",paidCents:5000,paymentMethod:"card",status:"partial",lastChangeId:"rev1",settlementCurrency:"BRL",settledCents:26000,feesCents:300,effectiveRateMicros:5200000};
describe("câmbio exato e originais preservados",()=>{
 it("arredonda half-up com inteiros, inclusive centavos e ajustes negativos",()=>{expect(ratio(1,3,2)).toBe(2);expect(ratio(-1,3,2)).toBe(-2);expect(convertCents(1,"USD","BRL",{...exchange,rates:{USD:1500000}})).toBe(2);expect(parseRate("5,123456")).toBe(5123456);});
 it("converte quantidade pelo total original uma só vez",()=>{const result=multiCurrencySettlement(trip,[],plan({expenses:[{...expense,quantity:3}],exchange:{...exchange,rates:{USD:5123456}}}));expect(result.totalCents).toBe(153704);expect(result.lines[0]).toMatchObject({originalAmountCents:30000,originalCurrency:"USD"});});
 it("trocar referência ou cotação sempre parte do original, nunca do convertido anterior",()=>{
  const input=plan(),original=JSON.stringify(input);expect(multiCurrencySettlement(trip,[],input).totalCents).toBe(50000);
  expect(multiCurrencySettlement(trip,[],{...input,exchange:{...exchange,referenceCurrency:"USD"}}).totalCents).toBe(10000);
  expect(multiCurrencySettlement(trip,[],{...input,exchange:{...exchange,rates:{USD:6000000}}}).totalCents).toBe(60000);expect(JSON.stringify(input)).toBe(original);
 });
 it("mantém custos dos programas na moeda original sem afetar o Resumo",()=>{
  const event={...demoEvents[0],peopleCount:1,pricePerPerson:100,isFree:false};const result=multiCurrencySettlement({...trip,currency:"USD"},[event],plan({expenses:[],exchange:{...exchange,referenceCurrency:"USD",programCurrency:"BRL"}}));
  expect(result.programCents).toBe(2000);expect(event.pricePerPerson).toBe(100);
 });
 it("pagamento efetivo em BRL não muda com o câmbio de planejamento USD",()=>{
  const input=plan({payments:[payment]}),before=JSON.stringify(payment);let result=multiCurrencySettlement(trip,[],input);
  expect(result).toMatchObject({totalCents:50000,paidCents:26300,pendingCents:25000,exchangeDifferenceCents:1300});
  result=multiCurrencySettlement(trip,[],{...input,exchange:{...exchange,rates:{USD:6000000}}});expect(result).toMatchObject({totalCents:60000,paidCents:26300,pendingCents:30000,exchangeDifferenceCents:-3700});expect(JSON.stringify(payment)).toBe(before);
 });
 it("mostra pendência estrangeira e taxas planejadas separadas do desembolso",()=>{
  const result=multiCurrencySettlement(trip,[],plan({payments:[payment],exchange:{...exchange,cardFeeBps:300}}));
  expect(result).toMatchObject({totalCents:51500,paidCents:26300,pendingCents:25750,exchangeDifferenceCents:550});expect(result.pendingNative).toEqual([{currency:"USD",amountCents:5000}]);
  expect(result.pendingByMethod.find(method=>method.id==="card")).toMatchObject({amountCents:25750,feesCents:750,plannedCents:51500});
  expect(result.paidCents+result.pendingCents).toBe(result.totalCents+result.exchangeDifferenceCents+result.excessCents);
 });
 it("previsão diária em outra moeda desconta o programa sem dupla contagem",()=>{
  const event={...demoEvents[0],pricePerPerson:50,peopleCount:1,isFree:false};const result=multiCurrencySettlement(trip,[event],plan({expenses:[],dailyBudgets:[{category:"food",dailyAmountCents:2000,currency:"USD",paymentMethod:"cash"}]}));
  expect(result).toMatchObject({programCents:5000,dailyCents:5000,totalCents:10000,paidCents:0,pendingCents:10000});
 });
 it("mantém hospedagem de várias noites única e sem multiplicar hóspedes",()=>{
  const event={...demoEvents[0],category:"Hotel",pricePerPerson:900,peopleCount:1,isFree:false,details:{type:"lodging" as const,checkOutDate:demoTrip.endDate,guests:4}};
  expect(multiCurrencySettlement(demoTrip,[event,event],plan({expenses:[]})).programCents).toBe(90000);
 });
 it("ausência de cotação é explícita e conserva valores e pendências originais",()=>{
  const result=multiCurrencySettlement(trip,[],plan({exchange:{...exchange,rates:{}}}));expect(result.missingQuotes).toEqual(["USD"]);expect(result.totalCents).toBe(0);expect(result.pendingNative).toEqual([{currency:"USD",amountCents:10000}]);expect(result.lines[0].missingRate).toBe(true);
 });
 it("avalia desembolso em outra moeda na referência, preservando seu valor nativo",()=>{
  const paid={...payment,settlementCurrency:"USD",settledCents:5000,feesCents:0,effectiveRateMicros:1000000};const result=multiCurrencySettlement(trip,[],plan({payments:[paid]}));expect(result.paidConverted).toBe(true);expect(result.paidNative).toEqual([{currency:"USD",amountCents:5000}]);
 });
 it("separa previsão em dinheiro, cartão e a definir sem perder reconciliação",()=>{
  const result=multiCurrencySettlement(trip,[],plan({expenses:[expense,{...expense,id:"brl",currency:"BRL",amountCents:1000}],payments:[{...payment,paidCents:0,status:"planned",settledCents:0,feesCents:0,paymentMethod:"cash"}],exchange:{...exchange,cashFeeBps:100}}));
  expect(result.pendingByMethod.find(method=>method.id==="cash")?.amountCents).toBe(50500);expect(result.pendingByMethod.find(method=>method.id==="undefined")?.amountCents).toBe(1000);expect(result.pendingByMethod.reduce((sum,method)=>sum+method.amountCents,0)).toBe(result.pendingCents);
 });
});
describe("limites de câmbio e desembolso",()=>{
 it.each(["0","-1","1,2345678","NaN","Infinity","1e3"])("recusa cotação %s",value=>expect(Number.isNaN(parseRate(value))).toBe(true));
 it("rejeita taxas, campos incompletos e desembolso positivo sem pagamento",()=>{
  expect(()=>validateExchange({...exchange,cardFeeBps:10001})).toThrow();expect(()=>validateExchange({...exchange,rates:{USD:0}})).toThrow();
  expect(()=>validateDisbursement({...payment,settlementCurrency:undefined})).toThrow();expect(()=>validateDisbursement({...payment,paidCents:0})).toThrow();
 });
});
