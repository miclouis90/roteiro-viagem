import { beforeEach, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({listeners:new Map<string,{next:(value:unknown)=>void;error:(error:unknown)=>void;stop:ReturnType<typeof vi.fn>}>(),add:vi.fn(),update:vi.fn(),set:vi.fn(),remove:vi.fn(),tx:{get:vi.fn(),set:vi.fn(),update:vi.fn()}}));
vi.mock("../lib/firebase",()=>({db:{},auth:{currentUser:{uid:"owner",isAnonymous:false}},demoMode:false}));
vi.mock("firebase/firestore",()=>({
 collection:(_db:unknown,...parts:string[])=>({path:parts.join("/")}),doc:(_db:{path?:string},...parts:string[])=>({path:[_db.path,...parts].filter(Boolean).join("/")}),serverTimestamp:()=>"NOW",
 onSnapshot:(ref:{path:string},next:(value:unknown)=>void,error:(error:unknown)=>void)=>{const stop=vi.fn();state.listeners.set(ref.path,{next,error,stop});return stop;},
 runTransaction:(_db:unknown,callback:(tx:typeof state.tx)=>unknown)=>callback(state.tx),
 addDoc:state.add,updateDoc:state.update,setDoc:state.set,deleteDoc:state.remove,
}));
import { watchFinancialPlan, saveFinancialExpense, saveDailyBudget, removeFinancialExpense, removeDailyBudget, financialError, saveFinancialPayment, saveFinancialExchange } from "./financialPlanning";
const expense={name:"Seguro",category:"insurance" as const,amountCents:89939,quantity:2,notes:"PRIVATE-FINANCIAL",currency:"BRL"};
const budget={category:"food" as const,dailyAmountCents:10000,currency:"BRL"};
const rows=(id:string,data:object)=>({docs:[{id,data:()=>data}]});
beforeEach(()=>{vi.clearAllMocks();state.listeners.clear();state.add.mockResolvedValue({id:"one"});});
it("cria uma despesa em coleção privada e nunca replica custos dos programas",async()=>{
 expect(await saveFinancialExpense("trip",expense)).toBe("one");
 expect(state.add).toHaveBeenCalledExactlyOnceWith({path:"trips/trip/financialExpenses"},{...expense,createdAt:"NOW",updatedAt:"NOW"});
 expect(JSON.stringify(state.add.mock.calls)).not.toContain("/events");
});
it("edita a mesma despesa sem recriar ou mudar createdAt",async()=>{
 expect(await saveFinancialExpense("trip",{...expense,quantity:3},"one")).toBe("one");
 expect(state.update).toHaveBeenCalledExactlyOnceWith({path:"trips/trip/financialExpenses/one"},{...expense,quantity:3,updatedAt:"NOW"});expect(state.add).not.toHaveBeenCalled();
});
it("mantém um único documento por categoria ao salvar a previsão diária",async()=>{
 await saveDailyBudget("trip",budget);await saveDailyBudget("trip",{...budget,dailyAmountCents:5000});
 expect(state.set.mock.calls.map(([ref])=>ref.path)).toEqual(["trips/trip/financialDailyBudgets/food","trips/trip/financialDailyBudgets/food"]);
 expect(state.set.mock.calls.at(-1)?.[1]).toEqual({...budget,dailyAmountCents:5000,updatedAt:"NOW"});
});
it("rejeita payload inválido antes da persistência",async()=>{
 await expect(saveFinancialExpense("trip",{...expense,amountCents:NaN})).rejects.toMatchObject({code:"invalid-argument"});
 await expect(saveDailyBudget("trip",{...budget,dailyAmountCents:-1})).rejects.toMatchObject({code:"invalid-argument"});expect(state.add).not.toHaveBeenCalled();expect(state.set).not.toHaveBeenCalled();
});
it("aguarda as duas coleções e libera assinaturas no fechamento",()=>{
 const next=vi.fn(),fail=vi.fn();const stop=watchFinancialPlan("trip",next,fail);
 state.listeners.get("trips/trip/financialExpenses")!.next(rows("one",expense));expect(next).not.toHaveBeenCalled();
 state.listeners.get("trips/trip/financialDailyBudgets")!.next(rows("food",budget));expect(next).not.toHaveBeenCalled();
 state.listeners.get("trips/trip/financialPayments")!.next({docs:[]});expect(next).not.toHaveBeenCalled();
 state.listeners.get("trips/trip/financialSettings/exchange")!.next({exists:()=>false});expect(next).toHaveBeenCalledExactlyOnceWith({expenses:[{...expense,id:"one"}],dailyBudgets:[budget],payments:[]});
 stop();expect([...state.listeners.values()].every(listener=>listener.stop.mock.calls.length===1)).toBe(true);
 state.listeners.get("trips/trip/financialExpenses")!.next(rows("new",expense));expect(next).toHaveBeenCalledOnce();
});
it("interrompe emissões quando o acesso privado é recusado, sem vazar detalhes no erro",()=>{
 const next=vi.fn(),fail=vi.fn();watchFinancialPlan("trip",next,fail);
 state.listeners.get("trips/trip/financialExpenses")!.next(rows("one",expense));
 state.listeners.get("trips/trip/financialDailyBudgets")!.error({code:"permission-denied",message:"PRIVATE-FINANCIAL"});
 state.listeners.get("trips/trip/financialDailyBudgets")!.next(rows("food",budget));expect(next).not.toHaveBeenCalled();expect(fail).toHaveBeenCalledOnce();
 expect(financialError(fail.mock.calls[0][0])).toContain("permission-denied");expect(financialError(fail.mock.calls[0][0])).not.toContain("PRIVATE-FINANCIAL");
});
it("remove somente o item financeiro escolhido",async()=>{
 await removeFinancialExpense("trip","one");await removeDailyBudget("trip","food");
 expect(state.remove.mock.calls.map(([ref])=>ref.path)).toEqual(["trips/trip/financialExpenses/one","trips/trip/financialDailyBudgets/food"]);
});

const payment={source:"expense" as const,sourceId:"one",label:"Seguro",paidCents:3000,status:"partial" as const,paymentMethod:"cash" as const,currency:"BRL"};
function documents(previous?:object){state.tx.get.mockImplementation(async(ref:{path:string})=>{
 const data=ref.path==="trips/trip"?{currency:"BRL"}:ref.path==="trips/trip/financialExpenses/one"?expense:ref.path==="trips/trip/financialSettings/exchange"?undefined:previous;
 return {exists:()=>!!data,data:()=>data};
});}
it("salva pagamento e revisão em uma transação sem criar outra despesa",async()=>{
 documents();await saveFinancialPayment("trip",payment,null);
 expect(state.tx.set).toHaveBeenCalledTimes(2);expect(state.tx.set.mock.calls[0][0].path).toBe("trips/trip/financialPayments/expense:one");
 expect(state.tx.set.mock.calls[1][0].path).toMatch(/^trips\/trip\/financialPayments\/expense:one\/history\//);
 expect(state.tx.set.mock.calls[1][1]).toMatchObject({previousPaidCents:0,paidCents:3000,changedBy:"owner",changedAt:"NOW"});
 expect(state.add).not.toHaveBeenCalled();expect(state.update).not.toHaveBeenCalled();
});
it("corrige o total acumulado sem somar histórico como novo custo e preserva createdAt",async()=>{
 documents({...payment,lastChangeId:"rev1"});await saveFinancialPayment("trip",{...payment,paidCents:5000,paymentMethod:"card"},"rev1");
 expect(state.tx.update).toHaveBeenCalledOnce();expect(state.tx.update.mock.calls[0][1]).not.toHaveProperty("createdAt");
 expect(state.tx.set.mock.calls[0][1]).toMatchObject({previousPaidCents:3000,paidCents:5000,paymentMethod:"card"});
});
it("não sobrescreve uma alteração concorrente nem deixa revisão parcial",async()=>{
 documents({...payment,lastChangeId:"newer"});await expect(saveFinancialPayment("trip",payment,"old")).rejects.toMatchObject({code:"aborted"});
 expect(state.tx.update).not.toHaveBeenCalled();expect(state.tx.set).not.toHaveBeenCalled();
});
it("recusa pagamento excessivo ou status incoerente sem gravar",async()=>{
 documents();await expect(saveFinancialPayment("trip",{...payment,paidCents:999999999,status:"paid"},null)).rejects.toMatchObject({code:"invalid-argument"});
 await expect(saveFinancialPayment("trip",{...payment,status:"paid"},null)).rejects.toMatchObject({code:"invalid-argument"});
 expect(state.tx.set).not.toHaveBeenCalled();
});

it("salva referência/cotações sem regravar despesas ou pagamentos",async()=>{
 documents();const input={referenceCurrency:"USD",programCurrency:"BRL",rates:{USD:5000000},cashFeeBps:100,cardFeeBps:300};
 await saveFinancialExchange("trip",input);
 expect(state.tx.set).toHaveBeenCalledExactlyOnceWith({path:"trips/trip/financialSettings/exchange"},{...input,updatedAt:"NOW"});
 expect(state.tx.update).not.toHaveBeenCalled();expect(state.add).not.toHaveBeenCalled();
});
it("não perde o desembolso anterior nem permite omitir ou trocar sua moeda",async()=>{
 const original={...payment,settlementCurrency:"BRL",settledCents:3500,feesCents:100,effectiveRateMicros:1000000,lastChangeId:"rev1"};documents(original);
 await expect(saveFinancialPayment("trip",payment,"rev1")).rejects.toMatchObject({code:"failed-precondition"});
 await expect(saveFinancialPayment("trip",{...payment,settlementCurrency:"USD",settledCents:3500,feesCents:0,effectiveRateMicros:500000},"rev1")).rejects.toMatchObject({code:"failed-precondition"});
 await saveFinancialPayment("trip",{...original,paidCents:5000,settledCents:5500},"rev1");
 expect(state.tx.set.mock.calls[0][1]).toMatchObject({previousPaidCents:3000,previousSettledCents:3500,previousFeesCents:100,settledCents:5500});
});
