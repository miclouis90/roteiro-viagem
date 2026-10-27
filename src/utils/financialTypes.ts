import type { FinancialCategory, DailyCategory } from "../data/financialCategories";
export interface FinancialExpenseInput {
  name: string;
  category: FinancialCategory;
  amountCents: number;
  quantity: number;
  notes: string;
  currency: string;
}
export interface FinancialExpense extends FinancialExpenseInput { id: string }
export interface DailyBudget {
  category: DailyCategory;
  dailyAmountCents: number;
  paymentMethod?: PaymentMethod;
  currency: string;
}
export interface FinancialPlan {
  expenses: FinancialExpense[];
  dailyBudgets: DailyBudget[];
  payments?: FinancialPayment[];
  exchange?: FinancialExchange;
}

export const paymentMethods = [
  { id: "undefined", label: "A definir" },
  { id: "cash", label: "Dinheiro" },
  { id: "card", label: "Cartão" },
  { id: "pix", label: "Transferência / Pix" },
] as const;
export type PaymentMethod = (typeof paymentMethods)[number]["id"];
export const financialStatuses = [
  { id: "planned", label: "Prevista" },
  { id: "reserved", label: "Reservada" },
  { id: "partial", label: "Parcialmente paga" },
  { id: "paid", label: "Paga" },
] as const;
export type FinancialStatus = (typeof financialStatuses)[number]["id"];
export interface FinancialPaymentInput extends Partial<FinancialDisbursement> {
  source: "program" | "expense";
  sourceId: string;
  label: string;
  currency: string;
  status: FinancialStatus;
  paidCents: number;
  paymentMethod: PaymentMethod;
}
export interface FinancialPayment extends FinancialPaymentInput { id: string; lastChangeId: string }
export interface FinancialPaymentChange extends FinancialPaymentInput {
  id: string;
  previousPaidCents: number;
  previousSettlementCurrency?: string;
  previousSettledCents?: number;
  previousFeesCents?: number;
  changedAt: string;
  changedBy: string;
}

export interface FinancialExchange {
  referenceCurrency: string;
  programCurrency: string;
  /** BRL per unit of original currency, scaled by 1,000,000. BRL is always 1. */
  rates: Record<string, number>;
  cashFeeBps: number;
  cardFeeBps: number;
}
export interface FinancialDisbursement {
  settlementCurrency: string;
  /** Cumulative actual principal and fees in settlementCurrency, never revalued on save. */
  settledCents: number;
  feesCents: number;
  /** Effective rate of the latest explicit adjustment, scaled by 1,000,000. */
  effectiveRateMicros: number;
}
