import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, setDoc, runTransaction } from "firebase/firestore";
import { auth, db, demoMode } from "../lib/firebase";
import type { FinancialPlan, FinancialExpense, FinancialExpenseInput, DailyBudget, FinancialPayment, FinancialPaymentInput, FinancialPaymentChange, FinancialExchange } from "../utils/financialTypes";
import { validateExpense, validateDailyBudget, validatePayment, currentFinancialStatus, cents } from "../utils/financialPlanning";
import type { DailyCategory } from "../data/financialCategories";
import { demoTrip, demoEvents } from "../data/demo";
import type { Trip, TripEvent } from "../types";
import { spending } from "../utils/spending";
import { validateExchange, disbursement } from "../utils/foreignMoney";
import { hasUndefinedPrice } from "../utils/eventPrice";
const key = "rumo-financial-v1";
type LocalPlan = FinancialPlan & { paymentHistory?: Record<string, FinancialPaymentChange[]> };
const empty = (): FinancialPlan => ({ expenses: [], dailyBudgets: [] });
function read(): Record<string, LocalPlan> { return JSON.parse(localStorage.getItem(key) || "{}"); }
function localChange(tripId: string, change: (plan: LocalPlan) => void) {
  const plans = read();
  const plan = plans[tripId] || empty();
  change(plan);
  plans[tripId] = plan;
  localStorage.setItem(key, JSON.stringify(plans));
  window.dispatchEvent(new Event("rumo-financial"));
}
function database() {
  if (!db || !auth?.currentUser || auth.currentUser.isAnonymous) throw Object.assign(new Error("Entre novamente para acessar o planejamento."), { code: "unauthenticated" });
  return db;
}
// These subscriptions are opened only by the private, authorized Planning view.
export function watchFinancialPlan(tripId: string, next: (plan: FinancialPlan) => void, error: (error: unknown) => void) {
  if (demoMode) {
    const update = () => { try { next(read()[tripId] || empty()); } catch (cause) { error(cause); } };
    update();
    window.addEventListener("rumo-financial", update); window.addEventListener("storage", update);
    return () => { window.removeEventListener("rumo-financial", update); window.removeEventListener("storage", update); };
  }
  let expenses: FinancialExpense[] | undefined, dailyBudgets: DailyBudget[] | undefined, payments: FinancialPayment[] | undefined, exchange: FinancialExchange | null | undefined, failed = false, stopped = false;
  const stops: (() => void)[] = [];
  const fail = (cause: unknown) => { if (!stopped && !failed) { failed = true; error(cause); } };
  const emit = () => { if (!stopped && !failed && expenses && dailyBudgets && payments && exchange !== undefined) next({ expenses, dailyBudgets, payments, ...(exchange ? { exchange } : {}) }); };
  try {
    const store = database();
    stops.push(onSnapshot(collection(store, "trips", tripId, "financialExpenses"), snapshot => {
      try { expenses = snapshot.docs.map(item => ({ ...validateExpense(item.data() as FinancialExpenseInput), id: item.id })); emit(); } catch (cause) { fail(cause); }
    }, fail));
    stops.push(onSnapshot(collection(store, "trips", tripId, "financialDailyBudgets"), snapshot => {
      try { dailyBudgets = snapshot.docs.map(item => {
        const budget = validateDailyBudget(item.data() as DailyBudget);
        if (item.id !== budget.category) throw new Error("Previsão diária inválida.");
        return budget;
      }); emit(); } catch (cause) { fail(cause); }
    }, fail));
    stops.push(onSnapshot(collection(store, "trips", tripId, "financialPayments"), snapshot => {
      try { payments = snapshot.docs.map(item => {
        const data = item.data();
        const payment = validatePayment(data as FinancialPaymentInput);
        if (item.id !== paymentId(payment) || typeof data.lastChangeId !== "string") throw new Error("Pagamento inválido.");
        return { ...payment, id: item.id, lastChangeId: data.lastChangeId };
      }); emit(); } catch (cause) { fail(cause); }
    }, fail));
    stops.push(onSnapshot(doc(store, "trips", tripId, "financialSettings", "exchange"), snapshot => {
      try { exchange = snapshot.exists() ? validateExchange(snapshot.data() as FinancialExchange) : null; emit(); } catch (cause) { fail(cause); }
    }, fail));
  } catch (cause) { fail(cause); }
  return () => { stopped = true; stops.forEach(stop => stop()); };
}
export async function saveFinancialExpense(tripId: string, input: FinancialExpenseInput, id?: string) {
  const data = validateExpense(input);
  if (demoMode) {
    const savedId = id || crypto.randomUUID();
    localChange(tripId, plan => { plan.expenses = [...plan.expenses.filter(expense => expense.id !== savedId), { ...data, id: savedId }]; });
    return savedId;
  }
  const store = database();
  if (id) { await updateDoc(doc(store, "trips", tripId, "financialExpenses", id), { ...data, updatedAt: serverTimestamp() }); return id; }
  const saved = await addDoc(collection(store, "trips", tripId, "financialExpenses"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return saved.id;
}
export async function removeFinancialExpense(tripId: string, id: string) {
  if (demoMode) { localChange(tripId, plan => { plan.expenses = plan.expenses.filter(expense => expense.id !== id); }); return; }
  await deleteDoc(doc(database(), "trips", tripId, "financialExpenses", id));
}
export async function saveDailyBudget(tripId: string, input: DailyBudget) {
  const data = validateDailyBudget(input);
  if (demoMode) { localChange(tripId, plan => { plan.dailyBudgets = [...plan.dailyBudgets.filter(budget => budget.category !== data.category), data]; }); return; }
  // One document per category: editing the allowance never creates a second copy.
  await setDoc(doc(database(), "trips", tripId, "financialDailyBudgets", data.category), { ...data, updatedAt: serverTimestamp() });
}
export async function removeDailyBudget(tripId: string, category: DailyCategory) {
  if (demoMode) { localChange(tripId, plan => { plan.dailyBudgets = plan.dailyBudgets.filter(budget => budget.category !== category); }); return; }
  await deleteDoc(doc(database(), "trips", tripId, "financialDailyBudgets", category));
}
export function financialError(cause: unknown) {
  const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code).replace(/^firestore\//, "") : "";
  if (code === "permission-denied") return "O Firestore recusou o acesso ao planejamento. Confira sua participação e se as regras financeiras foram publicadas (permission-denied).";
  if (code === "unauthenticated") return "Entre novamente para acessar o planejamento (unauthenticated).";
  if (code === "unavailable" || code === "deadline-exceeded") return "Não foi possível conectar. Confira sua conexão e tente novamente.";
  if (code === "invalid-argument") return "Revise valores, moedas e situação financeira. Valores monetários aceitam duas casas e cotações até seis; o pagamento não pode superar o custo previsto ou o valor já registrado.";
  if (code === "aborted") return "Este pagamento mudou em outro dispositivo. Feche e abra novamente antes de salvar.";
  if (code === "failed-precondition") return "A moeda original ou a moeda do desembolso não pode mudar enquanto houver valores pagos. Preserve os dados existentes; nenhuma conversão foi gravada.";
  return "Não foi possível concluir. Tente novamente; seus valores não foram descartados.";
}

export const paymentId = (input: Pick<FinancialPaymentInput, "source" | "sourceId">) => input.source + ":" + input.sourceId;
function paymentTarget(source: "program" | "expense", data: Record<string, unknown> | undefined, programCurrency: string) {
  if (!data) return { total: 0, unknown: false, label: "", currency: programCurrency };
  if (source === "expense") { const expense = validateExpense(data as unknown as FinancialExpenseInput); return { total: expense.amountCents * expense.quantity, unknown: false, label: expense.name, currency: expense.currency }; }
  const program = data as unknown as TripEvent;
  return { total: cents(spending([program]).total), unknown: hasUndefinedPrice(program), label: program.title, currency: programCurrency };
}
function checkPayment(input: FinancialPaymentInput, previous: FinancialPayment | undefined, expectedChangeId: string | null, target: ReturnType<typeof paymentTarget>, currency: string) {
  if ((previous?.lastChangeId || null) !== expectedChangeId) throw Object.assign(new Error("Pagamento desatualizado."), { code: "aborted" });
  if (input.currency !== currency || (previous && previous.paidCents > 0 && previous.currency !== input.currency)) throw Object.assign(new Error("Moeda diferente."), { code: "failed-precondition" });
  if (previous && previous.paidCents > 0 && input.paidCents > 0 && disbursement(previous).settlementCurrency !== disbursement(input).settlementCurrency) throw Object.assign(new Error("Moeda de desembolso diferente."), { code: "failed-precondition" });
  if (previous?.settlementCurrency && !input.settlementCurrency && input.paidCents > 0) throw Object.assign(new Error("Preserve o desembolso registrado."), { code: "failed-precondition" });
  if (input.paidCents > Math.max(target.total, previous?.paidCents || 0) || currentFinancialStatus(target.total, input, target.unknown) !== input.status) {
    throw Object.assign(new Error("Pagamento incompatível com o custo atual."), { code: "invalid-argument" });
  }
}
export async function saveFinancialPayment(tripId: string, input: FinancialPaymentInput, expectedChangeId: string | null) {
  const data = validatePayment(input), id = paymentId(data), changeId = crypto.randomUUID();
  if (demoMode) {
    const demo = JSON.parse(localStorage.getItem("rumo-demo-v1") || "null") as { trips: Trip[]; events: Record<string, TripEvent[]> } | null;
    const trip = (demo?.trips || [demoTrip]).find(item => item.id === tripId);
    if (!trip) throw Object.assign(new Error("Viagem indisponível."), { code: "not-found" });
    localChange(tripId, plan => {
      const previous = plan.payments?.find(payment => payment.id === id);
      const source = data.source === "program" ? (demo?.events[tripId] || demoEvents).find(event => event.id === data.sourceId) : plan.expenses.find(expense => expense.id === data.sourceId);
      if (!source && !previous) throw Object.assign(new Error("Despesa indisponível."), { code: "not-found" });
      const target = paymentTarget(data.source, source as unknown as Record<string, unknown>, plan.exchange?.programCurrency || previous?.currency || trip.currency);
      checkPayment(data, previous, expectedChangeId, target, target.currency);
      const saved = { ...data, label: target.label || data.label, id, lastChangeId: changeId };
      plan.payments = [...(plan.payments || []).filter(payment => payment.id !== id), saved];
      plan.paymentHistory ??= {};
      plan.paymentHistory[id] = [...(plan.paymentHistory[id] || []), { ...data, label: saved.label, id: changeId, previousPaidCents: previous?.paidCents || 0, ...previousDisbursement(previous, data), changedAt: new Date().toISOString(), changedBy: "demo" }];
    });
    return;
  }
  const store = database(), ref = doc(store, "trips", tripId, "financialPayments", id);
  await runTransaction(store, async transaction => {
    const trip = await transaction.get(doc(store, "trips", tripId));
    const source = await transaction.get(doc(store, "trips", tripId, data.source === "program" ? "events" : "financialExpenses", data.sourceId));
    const snapshot = await transaction.get(ref);
    const exchange = await transaction.get(doc(store, "trips", tripId, "financialSettings", "exchange"));
    if (!trip.exists() || (!source.exists() && !snapshot.exists())) throw Object.assign(new Error("Despesa indisponível."), { code: "not-found" });
    const previous = snapshot.exists() ? { ...validatePayment(snapshot.data() as FinancialPaymentInput), id, lastChangeId: snapshot.data().lastChangeId as string } : undefined;
    const target = paymentTarget(data.source, source.exists() ? source.data() : undefined, exchange.exists() ? exchange.data().programCurrency : previous?.currency || trip.data().currency);
    checkPayment(data, previous, expectedChangeId, target, target.currency);
    const saved = { ...data, label: target.label || data.label };
    const fields = { ...saved, lastChangeId: changeId, updatedAt: serverTimestamp() };
    if (snapshot.exists()) transaction.update(ref, fields);
    else transaction.set(ref, { ...fields, createdAt: serverTimestamp() });
    transaction.set(doc(ref, "history", changeId), { ...saved, previousPaidCents: previous?.paidCents || 0, ...previousDisbursement(previous, data), changedAt: serverTimestamp(), changedBy: auth!.currentUser!.uid });
  });
}
export function watchPaymentHistory(tripId: string, id: string, next: (changes: FinancialPaymentChange[]) => void, error: (cause: unknown) => void) {
  if (demoMode) {
    const update = () => { try { next([...(read()[tripId]?.paymentHistory?.[id] || [])].reverse()); } catch (cause) { error(cause); } };
    update(); window.addEventListener("rumo-financial", update);
    return () => window.removeEventListener("rumo-financial", update);
  }
  try { return onSnapshot(collection(database(), "trips", tripId, "financialPayments", id, "history"), snapshot => {
    try { next(snapshot.docs.map(item => { const data = item.data(); return { ...validatePayment(data as FinancialPaymentInput), id: item.id,
      previousPaidCents: data.previousPaidCents as number, ...(data.previousSettlementCurrency ? { previousSettlementCurrency: data.previousSettlementCurrency, previousSettledCents: data.previousSettledCents, previousFeesCents: data.previousFeesCents } : {}), changedBy: data.changedBy as string, changedAt: data.changedAt?.toDate?.().toISOString() || "" };
    }).sort((a,b) => b.changedAt.localeCompare(a.changedAt) || b.id.localeCompare(a.id))); } catch (cause) { error(cause); }
  }, error); } catch (cause) { error(cause); return () => {}; }
}

function previousDisbursement(previous: FinancialPayment | undefined, input: FinancialPaymentInput) {
  if (!input.settlementCurrency && !previous?.settlementCurrency) return {};
  const d = disbursement(previous || { currency: input.currency });
  return { previousSettlementCurrency: d.settlementCurrency, previousSettledCents: d.settledCents, previousFeesCents: d.feesCents };
}
export async function saveFinancialExchange(tripId: string, input: FinancialExchange) {
  const data = validateExchange(input);
  if (demoMode) {
    const demo=JSON.parse(localStorage.getItem("rumo-demo-v1")||"null") as { trips: Trip[] } | null;
    const trip=(demo?.trips||[demoTrip]).find(item=>item.id===tripId);
    if (!trip) throw Object.assign(new Error("Viagem indisponível."),{code:"not-found"});
    localChange(tripId,plan=>{
      if(data.programCurrency!==(plan.exchange?.programCurrency||trip.currency))throw Object.assign(new Error("Moeda original preservada."),{code:"invalid-argument"});
      plan.exchange=data;
    });return;
  }
  const store=database(),ref=doc(store,"trips",tripId,"financialSettings","exchange");
  await runTransaction(store,async transaction=>{
    const trip=await transaction.get(doc(store,"trips",tripId)),previous=await transaction.get(ref);
    if(!trip.exists()||data.programCurrency!==(previous.exists()?previous.data().programCurrency:trip.data().currency))throw Object.assign(new Error("Moeda original preservada."),{code:"invalid-argument"});
    transaction.set(ref,{...data,updatedAt:serverTimestamp()});
  });
}
