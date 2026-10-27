import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "../Modal";
import { financialCategories, dailyCategories, financialCategory, type FinancialCategory, type DailyCategory } from "../../data/financialCategories";
import type { Trip } from "../../types";
import { paymentMethods, type PaymentMethod } from "../../utils/financialTypes";
import type { FinancialExpense, DailyBudget } from "../../utils/financialTypes";
import { financialCurrencies } from "../../utils/foreignMoney";
import { parseFinancialAmount } from "../../utils/financialPlanning";
import { saveFinancialExpense, saveDailyBudget, financialError } from "../../services/financialPlanning";
const inputAmount = (amount?: number) => amount === undefined ? "" : (amount / 100).toFixed(2).replace(".", ",");
export function FinancialEntryForm({ trip, expense, budget, kind, existingBudgets, referenceCurrency, currencyLocked = false, onClose, onSaved }: {
  trip: Trip; expense?: FinancialExpense; budget?: DailyBudget; kind: "expense" | "daily"; referenceCurrency?: string; currencyLocked?: boolean; existingBudgets: DailyBudget[]; onClose: () => void; onSaved: () => void;
}) {
  const daily = kind === "daily";
  const [currency,setCurrency]=useState(expense?.currency||budget?.currency||referenceCurrency||trip.currency);
  const [name, setName] = useState(expense?.name || "");
  const [category, setCategory] = useState<FinancialCategory>(budget?.category || expense?.category || (daily ? "food" : "other"));
  const [amount, setAmount] = useState(inputAmount(budget?.dailyAmountCents ?? expense?.amountCents));
  const [quantity, setQuantity] = useState(String(expense?.quantity ?? 1));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(budget?.paymentMethod || "undefined");
  const [notes, setNotes] = useState(expense?.notes || "");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (daily && !budget && existingBudgets.some(item => item.category === category)) {
      setError("Esta categoria já tem uma previsão diária. Edite a configuração existente."); return;
    }
    setBusy(true);
    try {
      if (daily) await saveDailyBudget(trip.id, { category: category as DailyCategory, dailyAmountCents: parseFinancialAmount(amount), currency, ...(paymentMethod !== "undefined" || budget?.paymentMethod ? { paymentMethod } : {}) });
      else await saveFinancialExpense(trip.id, { name, category, amountCents: parseFinancialAmount(amount), quantity: Number(quantity), notes, currency }, expense?.id);
      onSaved();
    } catch (cause) { setError(financialError(cause)); }
    finally { setBusy(false); }
  }
  return <Modal title={daily ? budget ? "Editar previsão diária" : "Previsão diária" : expense ? "Editar despesa" : "Nova despesa avulsa"} onClose={onClose} busy={busy}>
    <form className="financial-entry-form" onSubmit={submit}>
      <fieldset disabled={busy}>
        {!daily && <label>Nome da despesa<input autoFocus required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="Seguro, chip, ingresso…" /></label>}
        <label>Categoria<select aria-label="Categoria" value={category} disabled={!!budget} onChange={event => setCategory(event.target.value as FinancialCategory)}>
          {(daily ? dailyCategories : financialCategories).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select></label>
        <label>Moeda original<select aria-label="Moeda original" disabled={currencyLocked} value={currency} onChange={event=>setCurrency(event.target.value)}>{[...new Set([...financialCurrencies(trip.currency),expense?.currency,budget?.currency,referenceCurrency].filter((item):item is string=>!!item))].map(item=><option key={item}>{item}</option>)}</select></label>
        {currencyLocked&&<p className="field-help">A moeda original fica preservada porque este item já possui pagamento.</p>}
        <div className="financial-form-values">
          <label>{daily ? "Previsão por dia" : "Valor unitário"} ({currency})<input required inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0,00" /></label>
          {!daily && <label>Quantidade<input required type="number" min="1" max="10000" step="1" value={quantity} onChange={event => setQuantity(event.target.value)} /></label>}
        </div>
        {daily && <label>Forma de pagamento prevista<select aria-label="Forma de pagamento prevista" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as PaymentMethod)}>{paymentMethods.map(method => <option key={method.id} value={method.id}>{method.label}</option>)}</select></label>}
        {daily && <p className="field-help">Escolher a forma prevista não registra pagamento. Todo complemento diário continua pendente.</p>}
        {!daily && <label>Observação (opcional)<textarea maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} rows={3} /></label>}
        {daily && <p className="field-help">Valor total por dia para todas as pessoas da viagem. Em {financialCategory(category).label}, os programas já previstos em cada dia abatem esse valor. Somente a diferença é acrescentada. Hospedagens não entram como previsão recorrente.</p>}

      </fieldset>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy ? "Salvando…" : daily ? "Salvar previsão" : "Salvar despesa"}</button></div>
    </form>
  </Modal>;
}
