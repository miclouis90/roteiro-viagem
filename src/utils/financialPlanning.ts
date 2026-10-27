import { validateDisbursement } from "./foreignMoney";
import type { Trip, TripEvent } from "../types";
import { categoryOf } from "../data/categories";
import { financialCategories, type FinancialCategory } from "../data/financialCategories";
import type { FinancialPlan, FinancialExpenseInput, DailyBudget, FinancialPaymentInput, FinancialStatus } from "./financialTypes";
import { paymentMethods, financialStatuses } from "./financialTypes";
import { datesBetween } from "./dates";
import { spending } from "./spending";
import { hasUndefinedPrice } from "./eventPrice";

export const cents = (amount: number) => Math.round((amount + Number.EPSILON) * 100);
export function parseFinancialAmount(value: string) {
  const raw = value.trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(raw)) return NaN;
  return cents(Number(raw.replace(",", ".")));
}
function invalid(): never { throw Object.assign(new Error("Revise nome, categoria, valor e quantidade. Use até duas casas decimais."), { code: "invalid-argument" }); }
const validAmount = (amount: number) => Number.isSafeInteger(amount) && amount >= 0 && amount <= 1000000000;
const validCategory = (category: unknown) => financialCategories.some(item => item.id === category);
export function validateExpense(input: FinancialExpenseInput) {
  if (typeof input.name !== "string" || !input.name.trim() || input.name.length > 120 || !validCategory(input.category) || !validAmount(input.amountCents)
    || !Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 10000 || typeof input.notes !== "string" || input.notes.length > 1000
    || typeof input.currency !== "string" || !/^[A-Z]{3}$/.test(input.currency)) invalid();
  return { name: input.name.trim(), category: input.category, amountCents: input.amountCents, quantity: input.quantity, notes: input.notes.trim(), currency: input.currency };
}
export function validateDailyBudget(input: DailyBudget) {
  if (!validCategory(input.category) || String(input.category) === "lodging" || !validAmount(input.dailyAmountCents)
    || typeof input.currency !== "string" || !/^[A-Z]{3}$/.test(input.currency)
    || (input.paymentMethod !== undefined && !paymentMethods.some(method => method.id === input.paymentMethod))) invalid();
  return { category: input.category, dailyAmountCents: input.dailyAmountCents, currency: input.currency, ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}) };
}
export interface FinancialLine {
  id: string;
  name: string;
  category: FinancialCategory;
  amountCents: number;
  origin: "program" | "expense" | "daily";
  date: string;
  unknown?: boolean;
  originalAmountCents?: number;
  originalCurrency?: string;
}
// Project current programs without copying them to financial collections.
// A stay is one event, charged once on check-in, just as in spending().
export function financialProjection(trip: Trip, events: readonly TripEvent[], plan: FinancialPlan) {
  const days = datesBetween(trip.startDate, trip.endDate);
  const active = [...new Map(events.map(event => [event.id, event])).values()].filter(event => event.status !== "cancelado");
  const programs: FinancialLine[] = active.map(event => ({ id: `program:${event.id}`, name: event.title, category: categoryOf(event.category).group,
    amountCents: cents(spending([event]).total), origin: "program", date: event.date, unknown: hasUndefinedPrice(event) }));
  const expenses = [...new Map(plan.expenses.map(expense => [expense.id, expense])).values()];
  const budgets = [...new Map(plan.dailyBudgets.map(budget => [budget.category, budget])).values()];
  const oneOffs: FinancialLine[] = expenses.filter(expense => expense.currency === trip.currency).map(expense => ({
    id: `expense:${expense.id}`, name: expense.name, category: expense.category, amountCents: expense.amountCents * expense.quantity, origin: "expense", date: "",
  }));
  const daily = days.map(day => {
    const dayPrograms = programs.filter(line => line.date === day);
    const additions = budgets.filter(budget => budget.currency === trip.currency).map(budget => {
      const covered = dayPrograms.filter(line => line.category === budget.category).reduce((sum, line) => sum + line.amountCents, 0);
      return { id: `daily:${day}:${budget.category}`, name: "Complemento da previsão diária", category: budget.category,
        amountCents: Math.max(0, budget.dailyAmountCents - covered), origin: "daily" as const, date: day };
    });
    return { day, programsCents: dayPrograms.reduce((sum, line) => sum + line.amountCents, 0), additionsCents: additions.reduce((sum, line) => sum + line.amountCents, 0), additions };
  });
  const lines: FinancialLine[] = [...programs, ...oneOffs, ...daily.flatMap(day => day.additions).filter(line => line.amountCents > 0)];
  const programCents = programs.reduce((sum, line) => sum + line.amountCents, 0);
  const expensesCents = oneOffs.reduce((sum, line) => sum + line.amountCents, 0);
  const dailyCents = daily.reduce((sum, day) => sum + day.additionsCents, 0);
  return { lines, daily, programCents, expensesCents, dailyCents, totalCents: programCents + expensesCents + dailyCents,
    unknownCount: programs.filter(line => line.unknown).length,
    incompatibleCount: expenses.filter(expense => expense.currency !== trip.currency).length + budgets.filter(budget => budget.currency !== trip.currency).length,
    categories: financialCategories.map(category => {
      const entries = lines.filter(line => line.category === category.id);
      return { ...category, totalCents: entries.reduce((sum, line) => sum + line.amountCents, 0),
        programCents: entries.filter(line => line.origin === "program").reduce((sum, line) => sum + line.amountCents, 0),
        expensesCents: entries.filter(line => line.origin === "expense").reduce((sum, line) => sum + line.amountCents, 0),
        dailyCents: entries.filter(line => line.origin === "daily").reduce((sum, line) => sum + line.amountCents, 0), count: entries.length };
    }).filter(category => category.count > 0),
  };
}

export function validatePayment(input: FinancialPaymentInput) {
  if (!input || !["program", "expense"].includes(input.source) || typeof input.sourceId !== "string" || !/^[^/]{1,128}$/.test(input.sourceId)
    || typeof input.label !== "string" || !input.label.trim() || input.label.length > 120
    || !Number.isSafeInteger(input.paidCents) || input.paidCents < 0 || input.paidCents > 10000000000000
    || !paymentMethods.some(method => method.id === input.paymentMethod) || !financialStatuses.some(status => status.id === input.status)
    || typeof input.currency !== "string" || !/^[A-Z]{3}$/.test(input.currency)
    || (["planned", "reserved"].includes(input.status) && input.paidCents !== 0)
    || (input.status === "partial" && input.paidCents === 0)) invalid();
  return { source: input.source, sourceId: input.sourceId, label: input.label.trim(), currency: input.currency,
    status: input.status, paidCents: input.paidCents, paymentMethod: input.paymentMethod, ...validateDisbursement(input) };
}
export function currentFinancialStatus(amountCents: number, payment?: Pick<FinancialPaymentInput, "paidCents" | "status">, unknown = false): FinancialStatus {
  const paid = payment?.paidCents || 0;
  if (paid > 0) return !unknown && paid >= amountCents ? "paid" : "partial";
  if (!unknown && amountCents === 0 && payment?.status === "paid") return "paid";
  return payment?.status === "reserved" ? "reserved" : "planned";
}
// Payment metadata never adds another cost. Immutable revisions are not summed.
export function financialSettlement(trip: Trip, events: readonly TripEvent[], plan: FinancialPlan) {
  const projection = financialProjection(trip, events, plan);
  const payments = [...new Map((plan.payments || []).map(payment => [payment.id, payment])).values()];
  const sameCurrency = payments.filter(payment => payment.currency === trip.currency);
  const paymentById = new Map(sameCurrency.map(payment => [payment.id, payment]));
  const budgets = new Map(plan.dailyBudgets.map(budget => [budget.category, budget]));
  const lines = projection.lines.map(line => {
    const payment = paymentById.get(line.id);
    const paidCents = line.origin === "daily" ? 0 : payment?.paidCents || 0;
    const paymentMethod = line.origin === "daily" ? budgets.get(line.category as DailyBudget["category"])?.paymentMethod || "undefined" : payment?.paymentMethod || "undefined";
    return { ...line, paidCents, pendingCents: Math.max(0, line.amountCents - paidCents), paymentMethod,
      status: line.origin === "daily" ? "planned" as const : currentFinancialStatus(line.amountCents, payment, line.unknown) };
  });
  const ids = new Set(lines.filter(line => line.origin !== "daily").map(line => line.id));
  const unmatched = sameCurrency.filter(payment => !ids.has(payment.id));
  const paidCents = sameCurrency.reduce((sum, payment) => sum + payment.paidCents, 0);
  const appliedCents = lines.reduce((sum, line) => sum + Math.min(line.amountCents, line.paidCents), 0);
  const pendingCents = lines.reduce((sum, line) => sum + line.pendingCents, 0);
  return { ...projection, lines, paidCents, pendingCents, excessCents: paidCents - appliedCents, unmatched,
    incompatiblePayments: payments.filter(payment => payment.currency !== trip.currency),
    pendingByMethod: paymentMethods.map(method => ({ ...method, amountCents: lines.filter(line => line.paymentMethod === method.id).reduce((sum, line) => sum + line.pendingCents, 0) })),
  };
}
