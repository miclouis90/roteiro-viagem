import type { FinancialDisbursement, FinancialExchange, FinancialPaymentInput } from "./financialTypes";
export const RATE_SCALE = 1000000;
const code = (currency: unknown): currency is string => typeof currency === "string" && /^[A-Z]{3}$/.test(currency);
export const financialCurrencies = (legacy: string) => [...new Set(["BRL", "USD", legacy])];
function invalid(): never { throw Object.assign(new Error("Revise moedas, câmbio e valores do desembolso."), { code: "invalid-argument" }); }
export function ratio(amount: number, numerator: number, denominator: number) {
  if (![amount,numerator,denominator].every(Number.isSafeInteger) || numerator < 0 || denominator <= 0) invalid();
  const sign = amount < 0 ? -1n : 1n, value = BigInt(Math.abs(amount)) * BigInt(numerator), divisor = BigInt(denominator);
  const result = Number(sign * ((value * 2n + divisor) / (divisor * 2n)));
  if (!Number.isSafeInteger(result)) invalid();
  return result;
}
export function parseRate(value: string) {
  if (!/^\d+(?:[.,]\d{1,6})?$/.test(value.trim())) return NaN;
  const [whole, fraction=""] = value.trim().replace(",", ".").split(".");
  const result = Number(BigInt(whole) * BigInt(RATE_SCALE) + BigInt(fraction.padEnd(6,"0")));
  return Number.isSafeInteger(result) && result > 0 && result <= 1000000000000 ? result : NaN;
}
export const formatRate = (rate: number) => (rate / RATE_SCALE).toFixed(6).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
export function convertCents(amount: number, from: string, to: string, exchange?: FinancialExchange): number | null {
  if (from === to) return amount;
  const a = from === "BRL" ? RATE_SCALE : exchange?.rates[from], b = to === "BRL" ? RATE_SCALE : exchange?.rates[to];
  if (!a || !b) return null;
  try { return ratio(amount,a,b); } catch { return null; }
}
export function validateExchange(input: FinancialExchange): FinancialExchange {
  if (!input || !code(input.referenceCurrency) || !code(input.programCurrency) || !input.rates || Array.isArray(input.rates) || typeof input.rates !== "object"
    || Object.keys(input.rates).length > 20 || !Object.entries(input.rates).every(([currency,rate])=>code(currency) && Number.isSafeInteger(rate) && rate>0 && rate<=1000000000000)
    || (input.rates.BRL !== undefined && input.rates.BRL !== RATE_SCALE)
    || ![input.cashFeeBps,input.cardFeeBps].every(fee=>Number.isInteger(fee)&&fee>=0&&fee<=10000)) invalid();
  return { referenceCurrency:input.referenceCurrency,programCurrency:input.programCurrency,rates:{...input.rates},cashFeeBps:input.cashFeeBps,cardFeeBps:input.cardFeeBps };
}
export function disbursement(input?: Partial<FinancialPaymentInput>): FinancialDisbursement {
  return { settlementCurrency:input?.settlementCurrency || input?.currency || "BRL",settledCents:input?.settledCents ?? input?.paidCents ?? 0,feesCents:input?.feesCents ?? 0,effectiveRateMicros:input?.effectiveRateMicros ?? RATE_SCALE };
}
export function validateDisbursement(input: FinancialPaymentInput): Partial<FinancialDisbursement> {
  const keys = ["settlementCurrency","settledCents","feesCents","effectiveRateMicros"] as const;
  if (keys.every(key=>input[key] === undefined)) return {};
  const d=disbursement(input);
  if (!keys.every(key=>input[key] !== undefined) || !code(d.settlementCurrency)
    || ![d.settledCents,d.feesCents].every(amount=>Number.isSafeInteger(amount)&&amount>=0&&amount<=10000000000000)
    || !Number.isSafeInteger(d.effectiveRateMicros)||d.effectiveRateMicros<=0||d.effectiveRateMicros>1000000000000
    || (input.paidCents===0 && (d.settledCents!==0 || d.feesCents!==0))) invalid();
  return d;
}
