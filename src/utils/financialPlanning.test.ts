import { describe, expect, it } from "vitest";
import { financialProjection, parseFinancialAmount, validateDailyBudget, validateExpense } from "./financialPlanning";
import { demoEvents, demoTrip } from "../data/demo";
import type { TripEvent } from "../types";
import type { FinancialPlan, FinancialExpenseInput } from "./financialTypes";
const trip = { ...demoTrip, startDate: "2026-10-29", endDate: "2026-10-31", currency: "BRL" };
const event = (id: string, category: string, date: string, price: number): TripEvent => ({ ...demoEvents[0], id, title: id, category, date, pricePerPerson: price, peopleCount: 1, isFree: false, status: "confirmado" });
const food1=event("meal-1","Almoço",trip.startDate,60), food2=event("meal-2","Jantar","2026-10-30",130);
const flight=event("flight","Voo",trip.startDate,400);
const stay={...event("stay","Hotel",trip.startDate,900), details:{type:"lodging" as const,checkOutDate:trip.endDate,guests:4}};
const expense:FinancialExpenseInput={name:"Seguro",category:"insurance",amountCents:5000,quantity:2,notes:"",currency:"BRL"};
const plan:FinancialPlan={expenses:[{...expense,id:"insurance"}],dailyBudgets:[{category:"food",dailyAmountCents:10000,currency:"BRL"}]};
describe("planejamento sem duplicação",()=>{
 it("consolida programas, avulsas e somente o complemento de cada dia",()=>{
  const result=financialProjection(trip,[food1,food2,flight,stay],plan);
  expect(result).toMatchObject({programCents:149000,expensesCents:10000,dailyCents:14000,totalCents:173000});
  expect(result.daily.map(day=>day.additionsCents)).toEqual([4000,0,10000]);
  expect(result.categories.find(category=>category.id==="food")).toMatchObject({programCents:19000,dailyCents:14000,totalCents:33000});
  expect(result.categories.reduce((sum,category)=>sum+category.totalCents,0)).toBe(result.totalCents);
  expect(result.lines.reduce((sum,line)=>sum+line.amountCents,0)).toBe(result.totalCents);
 });
 it("uma estadia de várias noites não se repete nem multiplica hóspedes",()=>{
  const result=financialProjection(trip,[stay,stay],{expenses:[],dailyBudgets:[]});
  expect(result.programCents).toBe(90000);expect(result.lines).toHaveLength(1);
  expect(result.daily.map(day=>day.programsCents)).toEqual([90000,0,0]);
 });
 it("não desconta outra categoria e não cria complementos negativos",()=>{
  const result=financialProjection(trip,[food2,flight],plan);
  expect(result.daily.map(day=>day.additionsCents)).toEqual([10000,0,10000]);
 });
 it("exclui cancelados, mantém grátis e indica programas sem valor",()=>{
  const result=financialProjection(trip,[{...food1,status:"cancelado"},{...food2,isFree:true},event("unknown","Almoço",trip.endDate,0)],plan);
  expect(result.programCents).toBe(0);expect(result.dailyCents).toBe(30000);expect(result.unknownCount).toBe(1);
 });
 it("programas sem data somam uma vez sem abater a previsão de um dia arbitrário",()=>{
  const result=financialProjection(trip,[{...food1,date:""}],plan);
  expect(result.programCents).toBe(6000);expect(result.dailyCents).toBe(30000);
 });
 it("atualiza o complemento quando um programa muda de dia ou valor",()=>{
  expect(financialProjection(trip,[food1],plan).daily.map(day=>day.additionsCents)).toEqual([4000,10000,10000]);
  expect(financialProjection(trip,[{...food1,date:trip.endDate,pricePerPerson:150}],plan).daily.map(day=>day.additionsCents)).toEqual([10000,10000,0]);
 });
 it("repetir snapshots ou reconfigurar categoria não duplica registros",()=>{
  const result=financialProjection(trip,[food1,food1],{expenses:[plan.expenses[0],plan.expenses[0]],dailyBudgets:[plan.dailyBudgets[0],{...plan.dailyBudgets[0],dailyAmountCents:5000}]});
  expect(result).toMatchObject({programCents:6000,expensesCents:10000,dailyCents:10000,totalCents:26000});
 });
 it("preserva a moeda da viagem e não soma moedas incompatíveis",()=>{
  const foreign={...trip,currency:"USD"};
  const result=financialProjection(foreign,[flight],plan);
  expect(result).toMatchObject({totalCents:40000,expensesCents:0,dailyCents:0,incompatibleCount:2});
  expect(financialProjection(foreign,[flight],{expenses:[{...plan.expenses[0],currency:"USD"}],dailyBudgets:[]}).totalCents).toBe(50000);
 });
 it("usa centavos inteiros para quantidades e complementos",()=>{
  const result=financialProjection(trip,[{...food1,pricePerPerson:0.1}],{expenses:[{...plan.expenses[0],amountCents:10,quantity:3}],dailyBudgets:[{category:"food",dailyAmountCents:30,currency:"BRL"}]});
  expect(result).toMatchObject({programCents:10,expensesCents:30,dailyCents:80,totalCents:120});
 });
});
describe("validação financeira",()=>{
 it.each(["-1","NaN","1.234","1,234","1e3",""])("recusa valor inválido %s",value=>expect(Number.isNaN(parseFinancialAmount(value))).toBe(true));
 it("aceita decimal em BRL sem interpretar separadores de forma ambígua",()=>{expect(parseFinancialAmount("899,39")).toBe(89939);expect(parseFinancialAmount("899.39")).toBe(89939);expect(parseFinancialAmount("0")).toBe(0);});
 it.each([{quantity:0},{quantity:1.5},{quantity:Infinity},{amountCents:NaN},{amountCents:-1},{amountCents:10.1},{name:" "},{notes:undefined},{category:"bad"}])("recusa campos inválidos %o",patch=>expect(()=>validateExpense({...expense,...patch} as FinancialExpenseInput)).toThrow());
 it("normaliza só os campos permitidos, sem undefined ou detalhes de programas",()=>{expect(validateExpense({...expense,name:" Seguro ",notes:" anotação "})).toEqual({...expense,notes:"anotação"});expect(()=>validateDailyBudget({category:"lodging",dailyAmountCents:1,currency:"BRL"} as never)).toThrow();});
});
