import type { Trip, TripEvent } from "../types";
import { categoryOf } from "../data/categories";
import { datesBetween } from "./dates";
import { financialProjection, currentFinancialStatus, cents, type FinancialLine } from "./financialPlanning";
import type { FinancialPlan, PaymentMethod } from "./financialTypes";
import { paymentMethods } from "./financialTypes";
import { convertCents, disbursement, ratio } from "./foreignMoney";
import { spending } from "./spending";
import { hasUndefinedPrice } from "./eventPrice";
import { financialCategories } from "../data/financialCategories";
export interface CurrencyLine extends FinancialLine { originalAmountCents:number; originalCurrency:string; principalCents:number; plannedFeeCents:number; missingRate:boolean; paidOriginalCents:number; paidCents:number; pendingCents:number; pendingOriginalCents:number; pendingFeeCents:number; paymentMethod:PaymentMethod; status:ReturnType<typeof currentFinancialStatus> }
export function multiCurrencySettlement(trip:Trip,events:readonly TripEvent[],plan:FinancialPlan) {
 const exchange=plan.exchange,referenceCurrency=exchange?.referenceCurrency||trip.currency,programCurrency=exchange?.programCurrency||trip.currency;
 const missing=new Set<string>(),source=new Map<string,{amount:number;currency:string;date:string;category:string;name:string;unknown:boolean}>();
 const convert=(amount:number,from:string,to=referenceCurrency)=>{const value=convertCents(amount,from,to,exchange);if(value===null&&amount!==0){if(from!=="BRL"&&!exchange?.rates[from])missing.add(from);if(to!=="BRL"&&!exchange?.rates[to])missing.add(to);if(!missing.size)missing.add(from);}return amount===0?0:value;};
 const active=[...new Map(events.map(event=>[event.id,event])).values()].filter(event=>event.status!=="cancelado");
 const convertedEvents=active.flatMap(event=>{
  const amount=cents(spending([event]).total),value=convert(amount,programCurrency),id=`program:${event.id}`;
  source.set(id,{amount,currency:programCurrency,date:event.date,category:categoryOf(event.category).group,name:event.title,unknown:hasUndefinedPrice(event)});
  return value===null?[]:[{...event,pricePerPerson:value/100,peopleCount:1}];
 });
 const expenses=[...new Map(plan.expenses.map(expense=>[expense.id,expense])).values()];
 const convertedExpenses=expenses.flatMap(expense=>{
  const amount=expense.amountCents*expense.quantity,value=convert(amount,expense.currency);
  source.set(`expense:${expense.id}`,{amount,currency:expense.currency,date:"",category:expense.category,name:expense.name,unknown:false});
  return value===null?[]:[{...expense,amountCents:value,quantity:1,currency:referenceCurrency}];
 });
 const base=financialProjection({...trip,currency:referenceCurrency},convertedEvents,{expenses:convertedExpenses,dailyBudgets:[]});
 const nativeLines: (FinancialLine&{originalAmountCents:number;originalCurrency:string;missingRate:boolean})[]=base.lines.map(line=>({...line,originalAmountCents:source.get(line.id)!.amount,originalCurrency:source.get(line.id)!.currency,missingRate:false}));
 for(const[id,item]of source) if(!nativeLines.some(line=>line.id===id))nativeLines.push({id,name:item.name,category:item.category as FinancialLine["category"],amountCents:0,origin:id.startsWith("program:")?"program":"expense",date:item.date,unknown:item.unknown,originalAmountCents:item.amount,originalCurrency:item.currency,missingRate:true});
 const budgets=[...new Map(plan.dailyBudgets.map(budget=>[budget.category,budget])).values()];
 const daily=datesBetween(trip.startDate,trip.endDate).map(day=>{
  const additions=budgets.flatMap(budget=>{
   let covered=0,unavailable=false;
   for(const[id,item]of source)if(id.startsWith("program:")&&item.date===day&&item.category===budget.category){const amount=convert(item.amount,item.currency,budget.currency);if(amount===null)unavailable=true;else covered+=amount;}
   const original=Math.max(0,budget.dailyAmountCents-covered),amount=convert(original,budget.currency);
   if(unavailable||amount===null)return[];
   return[{id:`daily:${day}:${budget.category}`,name:"Complemento da previsão diária",category:budget.category,amountCents:amount,origin:"daily" as const,date:day,originalAmountCents:original,originalCurrency:budget.currency,missingRate:false}];
  });
  return{day,programsCents:nativeLines.filter(line=>line.origin==="program"&&line.date===day).reduce((sum,line)=>sum+line.amountCents,0),additionsCents:additions.reduce((sum,line)=>sum+line.amountCents,0),additions};
 });
 nativeLines.push(...daily.flatMap(day=>day.additions).filter(line=>line.originalAmountCents>0));
 const payments=[...new Map((plan.payments||[]).map(payment=>[payment.id,payment])).values()],byId=new Map(payments.map(payment=>[payment.id,payment]));
 const fees=(method:PaymentMethod)=>method==="cash"?exchange?.cashFeeBps||0:method==="card"?exchange?.cardFeeBps||0:0;
 const actual=new Map<string,number>(),paidNative=new Map<string,number>();
 for(const payment of payments){const d=disbursement(payment),total=d.settledCents+d.feesCents;const amount=convert(total,d.settlementCurrency);actual.set(payment.id,amount||0);paidNative.set(d.settlementCurrency,(paidNative.get(d.settlementCurrency)||0)+total);}
 const lines:CurrencyLine[]=nativeLines.map(line=>{
  const payment=byId.get(line.id),compatible=payment?.currency===line.originalCurrency;
  const paidOriginalCents=line.origin!=="daily"&&compatible?payment?.paidCents||0:0;
  const paymentMethod=line.origin==="daily"?budgets.find(budget=>budget.category===line.category)?.paymentMethod||"undefined":payment?.paymentMethod||"undefined";
  const plannedFeeCents=ratio(line.amountCents,fees(paymentMethod),10000),pendingOriginalCents=Math.max(0,line.originalAmountCents-paidOriginalCents);
  const pendingPrincipal=convert(pendingOriginalCents,line.originalCurrency)||0,pendingFeeCents=ratio(pendingPrincipal,fees(paymentMethod),10000);
  return{...line,principalCents:line.amountCents,amountCents:line.amountCents+plannedFeeCents,plannedFeeCents,paymentMethod,paidOriginalCents,paidCents:compatible?actual.get(line.id)||0:0,pendingOriginalCents,pendingCents:pendingPrincipal+pendingFeeCents,pendingFeeCents,
   status:line.origin==="daily"?"planned":currentFinancialStatus(line.originalAmountCents,compatible?payment:undefined,line.unknown)};
 });
 const ids=new Set(lines.filter(line=>line.origin!=="daily").map(line=>line.id));
 const paidCents=[...actual.values()].reduce((sum,value)=>sum+value,0);
 const appliedCents=lines.reduce((sum,line)=>sum+(line.paidOriginalCents>0?ratio(line.paidCents,Math.min(line.paidOriginalCents,line.originalAmountCents),line.paidOriginalCents):0),0);
 const totalCents=lines.reduce((sum,line)=>sum+line.amountCents,0),pendingCents=lines.reduce((sum,line)=>sum+line.pendingCents,0);
 const pendingNative=new Map<string,number>();for(const line of lines)pendingNative.set(line.originalCurrency,(pendingNative.get(line.originalCurrency)||0)+line.pendingOriginalCents);
 const sumOrigin=(origin:FinancialLine["origin"])=>lines.filter(line=>line.origin===origin).reduce((sum,line)=>sum+line.amountCents,0);
 return{...base,referenceCurrency,lines,daily:daily.map(day=>({...day,programsCents:lines.filter(line=>line.origin==="program"&&line.date===day.day).reduce((sum,line)=>sum+line.amountCents,0),additionsCents:lines.filter(line=>line.origin==="daily"&&line.date===day.day).reduce((sum,line)=>sum+line.amountCents,0)})),totalCents,paidCents,pendingCents,excessCents:paidCents-appliedCents,exchangeDifferenceCents:appliedCents+pendingCents-totalCents,
  programCents:sumOrigin("program"),expensesCents:sumOrigin("expense"),dailyCents:sumOrigin("daily"),unknownCount:active.filter(hasUndefinedPrice).length,
  missingQuotes:[...missing],incompatibleCount:lines.filter(line=>line.missingRate).length,
  unmatched:payments.filter(payment=>!ids.has(payment.id)),incompatiblePayments:payments.filter(payment=>source.has(payment.id)&&source.get(payment.id)!.currency!==payment.currency),
  paidNative:[...paidNative].map(([currency,amountCents])=>({currency,amountCents})),pendingNative:[...pendingNative].filter(([,amount])=>amount>0).map(([currency,amountCents])=>({currency,amountCents})),
  paidConverted:payments.some(payment=>disbursement(payment).settlementCurrency!==referenceCurrency),
  pendingByMethod:paymentMethods.map(method=>({ ...method,amountCents:lines.filter(line=>line.paymentMethod===method.id).reduce((sum,line)=>sum+line.pendingCents,0),plannedCents:lines.filter(line=>line.paymentMethod===method.id).reduce((sum,line)=>sum+line.amountCents,0),feesCents:lines.filter(line=>line.paymentMethod===method.id).reduce((sum,line)=>sum+line.pendingFeeCents,0)})),
  categories:financialCategories.map(category=>{const entries=lines.filter(line=>line.category===category.id);return{...category,totalCents:entries.reduce((sum,line)=>sum+line.amountCents,0),programCents:entries.filter(line=>line.origin==="program").reduce((sum,line)=>sum+line.amountCents,0),expensesCents:entries.filter(line=>line.origin==="expense").reduce((sum,line)=>sum+line.amountCents,0),dailyCents:entries.filter(line=>line.origin==="daily").reduce((sum,line)=>sum+line.amountCents,0),count:entries.length};}).filter(category=>category.count>0),
 };
}
