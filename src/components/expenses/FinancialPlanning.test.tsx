// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { demoTrip, demoEvents } from "../../data/demo";
import { datesBetween } from "../../utils/dates";
import { TripExpenses } from "./TripExpenses";
import { watchFinancialPlan } from "../../services/financialPlanning";
vi.mock("../../lib/firebase",()=>({db:null,auth:null,demoMode:true}));
vi.mock("../../hooks/useAuth",()=>({useAuth:()=>({user:{uid:"owner"}})}));
const days=datesBetween(demoTrip.startDate,demoTrip.endDate);
let root:Root,container:HTMLDivElement;
beforeEach(()=>{
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);localStorage.removeItem("rumo-financial-v1");
 Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value(){this.open=true;}});
 Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value(){this.open=false;}});
 container=document.createElement("div");document.body.append(container);root=createRoot(container);
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();localStorage.removeItem("rumo-financial-v1");vi.unstubAllGlobals();});
async function mount(canPlan=true){await act(async()=>root.render(<TripExpenses trip={demoTrip} events={demoEvents} days={days} count={days.length} canPlan={canPlan} />));}
async function click(label:string){const button=[...container.querySelectorAll<HTMLButtonElement>("button")].find(item=>item.textContent===label)!;expect(button).toBeTruthy();await act(async()=>button.click());}
async function change(label:string,value:string){const field=[...container.querySelectorAll("label")].find(item=>item.textContent?.startsWith(label))!.querySelector("input,select,textarea")!;await act(async()=>{const proto=field instanceof HTMLSelectElement?HTMLSelectElement.prototype:field instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,"value")!.set!.call(field,value);field.dispatchEvent(new Event(field instanceof HTMLSelectElement?"change":"input",{bubbles:true}));});}
async function submit(){await act(async()=>container.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));}
it("preserva Resumo e sua seleção do gráfico ao alternar",async()=>{
 await mount();await click("Programas");const before=container.querySelector(".expense-donut-center")!.textContent;
 await click("Planejamento");expect(container.querySelector('.financial-total')).not.toBeNull();await click("Resumo");
 expect(container.querySelector(".expense-donut-center")!.textContent).toBe(before);expect(container.querySelector('.expenses-v2')!.closest('[hidden]')).toBeNull();
});
it("cria, edita e relê avulsas sem alterar o Resumo ou os programas",async()=>{
 await mount();const before=container.querySelector('.summary-amount')!.textContent;
 await click("Planejamento");await click("Adicionar");await change("Nome da despesa","Seguro");await change("Categoria","insurance");await change("Valor unitário","50,50");await change("Quantidade","2");await change("Observação","Privado");await submit();
 expect(container.querySelector('dialog')).toBeNull();expect(container.querySelector('.financial-record')!.textContent).toContain("101,00");
 const edit=container.querySelector<HTMLButtonElement>('[aria-label="Editar despesa Seguro"]')!;await act(async()=>edit.click());await change("Quantidade","3");await submit();
 expect(container.querySelectorAll('.financial-record')).toHaveLength(1);expect(container.querySelector('.financial-record')!.textContent).toContain("151,50");
 const reloaded=vi.fn();const stop=watchFinancialPlan(demoTrip.id,reloaded,vi.fn());expect(reloaded.mock.calls.at(-1)![0].expenses).toHaveLength(1);expect(reloaded.mock.calls.at(-1)![0].expenses[0]).toMatchObject({amountCents:5050,quantity:3,notes:"Privado"});stop();
 await click("Resumo");expect(container.querySelector('.summary-amount')!.textContent).toBe(before);
});
it("configura e edita a previsão da categoria sem criar uma segunda cópia",async()=>{
 await mount();await click("Planejamento");await click("Configurar");await change("Previsão por dia","100");await submit();
 expect(container.querySelectorAll('.financial-daily')).toHaveLength(days.length);
 await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Editar previsão Comer"]')!.click());await change("Previsão por dia","150");await submit();
 expect(JSON.parse(localStorage.getItem("rumo-financial-v1")!)[demoTrip.id].dailyBudgets).toEqual([{category:"food",dailyAmountCents:15000,currency:demoTrip.currency}]);
 await click("Configurar");await change("Previsão por dia","200");await submit();expect(container.querySelector('[role="alert"]')!.textContent).toContain("já tem uma previsão");
});
it("não carrega nem exibe dados financeiros privados a visitantes e limpa ao perder acesso",async()=>{
 localStorage.setItem("rumo-financial-v1",JSON.stringify({[demoTrip.id]:{expenses:[{id:"x",name:"SEGREDO",category:"other",amountCents:100,quantity:1,notes:"RESERVADO",currency:"BRL"}],dailyBudgets:[]}}));
 await mount(false);await click("Planejamento");expect(container.textContent).not.toContain("SEGREDO");expect(container.textContent).toContain("proprietário");
 await mount(true);expect(container.textContent).toContain("SEGREDO");await mount(false);expect(container.textContent).not.toContain("SEGREDO");expect(container.querySelector('.financial-planning')).toBeNull();
});
it("exige confirmação para remover despesa e preserva o roteiro",async()=>{
 await mount();await click("Planejamento");await click("Adicionar");await change("Nome da despesa","Chip");await change("Valor unitário","30");await submit();
 await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Remover despesa Chip"]')!.click());await click("Cancelar");expect(container.querySelector('.financial-record')).not.toBeNull();
 await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Remover despesa Chip"]')!.click());await click("Remover");expect(container.querySelector('.financial-record')).toBeNull();expect(container.querySelector('.summary-amount')!.textContent).toBeTruthy();
});
it("registra reserva, parcial e quitação na mesma despesa, preservando histórico e recarga",async()=>{
 await mount();const summaryBefore=container.querySelector('.summary-amount')!.textContent;
 await click("Planejamento");await click("Adicionar");await change("Nome da despesa","Seguro pago");await change("Valor unitário","100");await submit();
 const pay=async()=>{await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Pagamento de Seguro pago"]')!.click());};
 await pay();await change("Situação financeira","reserved");await change("Forma de pagamento prevista","cash");await submit();
 expect(container.querySelector('.financial-status')!.textContent).toBe("Reservada");expect(container.querySelector('.financial-paid-amount')!.textContent).toContain("0,00");
 await pay();await change("Total já pago","40");await change("Forma de pagamento prevista","card");await submit();
 expect(container.querySelector('.financial-status')!.textContent).toBe("Parcialmente paga");expect(container.querySelector('.financial-paid-amount')!.textContent).toContain("40,00");
 expect(container.querySelector('[data-payment-method="card"]')!.textContent).toContain("60,00");
 await pay();await click("Marcar como paga");await submit();
 expect(container.querySelector('.financial-paid-amount')!.textContent).toContain("100,00");expect(container.querySelectorAll('[aria-label="Editar despesa Seguro pago"]')).toHaveLength(1);
 const saved=JSON.parse(localStorage.getItem("rumo-financial-v1")!)[demoTrip.id];expect(saved.expenses).toHaveLength(1);expect(saved.payments).toHaveLength(1);expect(saved.paymentHistory[saved.payments[0].id]).toHaveLength(3);
 await pay();await act(async()=>{const details=container.querySelector<HTMLDetailsElement>('.financial-payment-history')!;details.open=true;details.dispatchEvent(new Event("toggle"));});
 expect(container.querySelector('.financial-payment-history')!.textContent).toContain("40,00");await click("Cancelar");
 await click("Resumo");expect(container.querySelector('.summary-amount')!.textContent).toBe(summaryBefore);
 await act(async()=>root.unmount());root=createRoot(container);await mount();await click("Planejamento");expect(container.querySelector('.financial-paid-amount')!.textContent).toContain("100,00");
});
it("forma prevista no orçamento diário não transforma a previsão em pagamento",async()=>{
 await mount();await click("Planejamento");await click("Configurar");await change("Previsão por dia","100");await change("Forma de pagamento prevista","cash");await submit();
 expect(container.querySelector('.financial-paid-amount')!.textContent).toContain("0,00");expect(container.querySelector('[data-payment-method="cash"] strong')!.textContent?.replace(/\s/g, ' ')).toBe("R$ 400,00");
 const plan=JSON.parse(localStorage.getItem("rumo-financial-v1")!)[demoTrip.id];expect(plan.dailyBudgets[0].paymentMethod).toBe("cash");expect(plan.payments).toBeUndefined();
});
it("permite pagar um programa confirmado sem alterar seu status, custos ou dados públicos",async()=>{
 const original=JSON.stringify(demoEvents);await mount();await click("Planejamento");
 await act(async()=>container.querySelector<HTMLButtonElement>(`[aria-label="Pagamento de ${demoEvents[0].title}"]`)!.click());await click("Marcar como paga");await submit();
 expect(container.querySelector('.financial-paid-amount')!.textContent).toContain("64,00");expect(JSON.stringify(demoEvents)).toBe(original);
 const plan=JSON.parse(localStorage.getItem("rumo-financial-v1")!)[demoTrip.id];expect(plan.expenses).toHaveLength(0);expect(plan.payments).toHaveLength(1);expect(plan.payments[0]).toMatchObject({source:"program",sourceId:demoEvents[0].id,paidCents:6400,status:"paid"});
});
it("cadastra USD, converte pela cotação e preserva desembolso/histórico ao mudar planejamento",async()=>{
 await mount();const original=container.querySelector('.summary-amount')!.textContent;await click("Planejamento");await click("Moedas e câmbio");await change("Câmbio de planejamento","5");await submit();
 await click("Adicionar");await change("Nome da despesa","Compra USD");await change("Moeda original","USD");await change("Valor unitário","100");await submit();
 const read=()=>JSON.parse(localStorage.getItem("rumo-financial-v1")!)[demoTrip.id];expect(read().expenses[0]).toMatchObject({currency:"USD",amountCents:10000});
 await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Pagamento de Compra USD"]')!.click());await change("Total já pago","50");await change("Câmbio efetivo","5,2");await change("Taxas totais já pagas","3");await submit();
 expect(container.querySelector('.financial-paid-amount')!.textContent).toContain("263,00");expect(container.querySelector('.financial-native-total')!.textContent).toContain("50,00");
 const before=JSON.stringify(read().paymentHistory);await click("Moedas e câmbio");await change("Câmbio de planejamento","6");await submit();
 expect(container.querySelector('.financial-paid-amount')!.textContent).toContain("263,00");expect(JSON.stringify(read().paymentHistory)).toBe(before);expect(read().payments[0]).toMatchObject({settledCents:26000,feesCents:300,effectiveRateMicros:5200000});
 await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Pagamento de Compra USD"]')!.click());await click("Marcar como paga");await submit();
 expect(read().payments[0]).toMatchObject({paidCents:10000,settledCents:56000,feesCents:300,effectiveRateMicros:6000000});
 expect(read().paymentHistory[read().payments[0].id][0]).toMatchObject({settledCents:26000,effectiveRateMicros:5200000});
 await click("Resumo");expect(container.querySelector('.summary-amount')!.textContent).toBe(original);
});
it("mudar referência não reescreve o valor original e cotação ausente é sinalizada",async()=>{
 await mount();await click("Planejamento");await click("Adicionar");await change("Nome da despesa","Sem câmbio");await change("Moeda original","USD");await change("Valor unitário","10");await submit();
 expect(container.querySelector('.financial-missing-rates')!.textContent).toContain("USD");await click("Moedas e câmbio");await change("Moeda de referência","USD");await change("Câmbio de planejamento","5");await submit();
 const plan=JSON.parse(localStorage.getItem("rumo-financial-v1")!)[demoTrip.id];expect(plan.expenses[0]).toMatchObject({currency:"USD",amountCents:1000});expect(plan.exchange.referenceCurrency).toBe("USD");expect(plan.exchange.programCurrency).toBe("BRL");
 expect(container.querySelector('.financial-total-amount')!.textContent).toContain("US$");
});
