import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CalendarDays, LockKeyhole, Info, ChevronRight, WalletCards } from "lucide-react";
import type { Trip, TripEvent } from "../../types";
import { paymentMethods, financialStatuses } from "../../utils/financialTypes";
import type { DailyBudget, FinancialExpense, FinancialPlan } from "../../utils/financialTypes";
import type { FinancialLine } from "../../utils/financialPlanning";
import { multiCurrencySettlement } from "../../utils/currencyPlanning";
import { disbursement } from "../../utils/foreignMoney";
import { watchFinancialPlan, removeFinancialExpense, removeDailyBudget, financialError } from "../../services/financialPlanning";
import { financialCategory } from "../../data/financialCategories";
import { formatDate } from "../../utils/dates";
import { money } from "../../utils/money";
import { Modal } from "../Modal";
import { FinancialEntryForm } from "./FinancialEntryForm";
import { FinancialExchangeForm } from "./FinancialExchangeForm";
import { FinancialPaymentForm } from "./FinancialPaymentForm";
const empty = (): FinancialPlan => ({ expenses: [], dailyBudgets: [] });
type Editing = { kind: "expense"; expense?: FinancialExpense } | { kind: "daily"; budget?: DailyBudget };
export function FinancialPlanning({ trip, events, onProgram }: { trip: Trip; events: TripEvent[]; onProgram?: (event: TripEvent) => void }) {
  const [exchangeOpen,setExchangeOpen]=useState(false);
  const [paying, setPaying] = useState<FinancialLine | null>(null);
  const [plan, setPlan] = useState<FinancialPlan>(empty);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [retry, setRetry] = useState(0), [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [removing, setRemoving] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false), [removeError, setRemoveError] = useState("");
  useEffect(() => {
    setPlan(empty()); setLoading(true); setError("");
    return watchFinancialPlan(trip.id, data => { setPlan(data); setLoading(false); }, cause => { setPlan(empty()); setError(financialError(cause)); setLoading(false); });
  }, [trip.id, retry]);
  const projection = multiCurrencySettlement(trip, events, plan);
  const value = (amount: number) => money(amount / 100, projection.referenceCurrency);
  const byId = new Map(projection.lines.map(line => [line.id, line]));
  function paymentMeta(id: string) {
    const line = byId.get(id);
    if (!line) return null;
    return <div className="financial-payment-meta"><span className="financial-status" data-status={line.status}>{financialStatuses.find(item => item.id === line.status)?.label}</span><span>Pago {value(line.paidCents)} · Pendente {value(line.pendingCents)}{line.unknown ? " + a definir" : ""}</span><span>{paymentMethods.find(item => item.id === line.paymentMethod)?.label}</span></div>;
  }
  async function remove() {
    if (!removing || busy) return;
    setBusy(true); setRemoveError("");
    try {
      if (removing.kind === "expense" && removing.expense) await removeFinancialExpense(trip.id, removing.expense.id);
      else if (removing.kind === "daily" && removing.budget) await removeDailyBudget(trip.id, removing.budget.category);
      setRemoving(null); setMessage("Item removido do planejamento.");
    } catch (cause) { setRemoveError(financialError(cause)); }
    finally { setBusy(false); }
  }
  if (loading) return <p className="financial-loading" role="status">Carregando planejamento…</p>;
  if (error) return <div className="financial-load-error"><p className="error" role="alert">{error}</p><button className="secondary" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></div>;
  return <section className="financial-planning" aria-label="Planejamento financeiro">
    <div className="financial-fx-summary"><span>Referência: <strong>{projection.referenceCurrency}</strong></span><button type="button" className="financial-add" onClick={()=>setExchangeOpen(true)}>Moedas e câmbio</button></div>
    <header className="financial-total">
      <span className="financial-private-label"><LockKeyhole size={13} aria-hidden="true" />Planejamento privado</span>
      <h2>Custo total previsto</h2><strong className="financial-total-amount">{value(projection.totalCents)}</strong>
      <p>Programas + despesas avulsas + complementos diários</p>
      <div className="financial-origins">{[["Programas", projection.programCents], ["Avulsas", projection.expensesCents], ["Previsão diária", projection.dailyCents]].map(([label, amount]) => <div key={label}><span>{label}</span><strong>{value(Number(amount))}</strong></div>)}</div>
      <div className="financial-payment-totals"><div><span>Total já pago</span><strong className="financial-paid-amount">{value(projection.paidCents)}</strong></div><div><span>Total pendente</span><strong className="financial-pending-amount">{value(projection.pendingCents)}</strong></div></div>
      {projection.unknownCount > 0 && <p className="financial-pending">+ {projection.unknownCount} programas com valor a definir</p>}
    </header>
    {message && <p role="status" className="feedback">{message}</p>}
    {projection.missingQuotes.length > 0 && <p className="notice financial-missing-rates" role="status">Totais parciais: configure o câmbio para {projection.missingQuotes.join(", ")}. Valores sem cotação ou fora do limite de conversão não entram na soma; os originais foram preservados.</p>}
    {projection.excessCents > 0 && <p className="notice financial-reconciliation">{value(projection.excessCents)} já pagos estão acima dos custos atuais ou pertencem a itens removidos/cancelados. Os pagamentos e o histórico foram preservados.</p>}
    {projection.missingQuotes.length===0 && projection.exchangeDifferenceCents !== 0 && <p className="notice financial-exchange-difference">Variação entre previsão de câmbio/taxas e desembolsos: {value(projection.exchangeDifferenceCents)}. Previsão com valores já realizados: {value(projection.paidCents + projection.pendingCents - projection.excessCents)}. A cotação de planejamento não altera os desembolsos registrados.</p>}
    {projection.incompatiblePayments.length > 0 && <p className="notice">A moeda original de um item difere da moeda de seu pagamento anterior. Revise o cadastro; o histórico não foi convertido.</p>}
    {projection.paidConverted && <p className="financial-note">Pagamentos desembolsados em outra moeda são apresentados também pelo equivalente estimado na referência atual. Os valores originais abaixo e seu histórico permanecem fixos.</p>}
    <section className="financial-section financial-methods" aria-labelledby="financial-methods-title"><header><div><h2 id="financial-methods-title">Pendente por forma de pagamento</h2><p>Inclui valores cuja forma ainda está a definir.</p></div></header><div className="financial-method-grid">{projection.pendingByMethod.map(method => <div key={method.id} data-payment-method={method.id}><span>{method.label}</span><strong>{value(method.amountCents)}</strong><small>Previsto {value(method.plannedCents)}{method.feesCents>0&&` · Taxas pendentes ${value(method.feesCents)}`}</small></div>)}</div>
      {projection.pendingNative.filter(item=>item.currency!==projection.referenceCurrency).map(item=><p className="financial-native-total" key={item.currency}>Pendente original: <strong>{money(item.amountCents/100,item.currency)}</strong> · principal, sem taxas estimadas</p>)}
      {projection.paidNative.filter(item=>item.amountCents>0).map(item=><p className="financial-native-total" key={`paid:${item.currency}`}>Desembolso efetivo: <strong>{money(item.amountCents/100,item.currency)}</strong></p>)}
    </section>
    <section className="financial-section financial-category-section" aria-labelledby="financial-category-title">
      <header><div><h2 id="financial-category-title">Por categoria</h2><p>O que já está previsto em cada parte da viagem.</p></div></header>
      <div className="financial-categories">{projection.categories.map(category => {
        const Icon = category.icon;
        return <div className={`financial-category tone-${category.tone}`} key={category.id}>
          <span className="financial-category-icon"><Icon size={19} aria-hidden="true" /></span>
          <div><strong>{category.label}</strong><small>{[
            category.programCents > 0 && `Programas ${value(category.programCents)}`,
            category.expensesCents > 0 && `Avulsas ${value(category.expensesCents)}`,
            category.dailyCents > 0 && `Previsão ${value(category.dailyCents)}`,
          ].filter(Boolean).join(" · ") || "Sem custo definido"}</small></div><b>{value(category.totalCents)}</b>
        </div>;
      })}{!projection.categories.length && <p className="financial-empty">Os custos do roteiro aparecem aqui automaticamente.</p>}</div>
    </section>
    <section className="financial-section" aria-labelledby="financial-expenses-title">
      <header><div><h2 id="financial-expenses-title">Despesas avulsas</h2><p>Seguro, chip, ingressos, taxas e compras.</p></div><button className="financial-add" onClick={() => { setMessage(""); setEditing({ kind: "expense" }); }}><Plus size={16} aria-hidden="true" />Adicionar</button></header>
      {!plan.expenses.length && <p className="financial-empty">Inclua apenas o que ainda não está nos programas do roteiro.</p>}
      {plan.expenses.map(expense => <article className="financial-record" key={expense.id}>
        <div><h3>{expense.name}</h3><p>{financialCategory(expense.category).label} · Despesa avulsa</p><small>{expense.quantity} × {money(expense.amountCents / 100, expense.currency)}{expense.notes && ` · ${expense.notes}`}</small></div>
        <strong>{money(expense.amountCents * expense.quantity / 100, expense.currency)}{expense.currency!==projection.referenceCurrency&&<small className="financial-converted">{byId.get(`expense:${expense.id}`)?.missingRate?"Cotação a definir":`≈ ${value(byId.get(`expense:${expense.id}`)?.amountCents||0)}`}</small>}</strong>
        <div className="financial-record-actions"><button className="icon-button" aria-label={`Pagamento de ${expense.name}`} onClick={() => setPaying(byId.get(`expense:${expense.id}`) || null)}><WalletCards size={16} /></button><button className="icon-button" aria-label={`Editar despesa ${expense.name}`} onClick={() => setEditing({ kind: "expense", expense })}><Pencil size={15} /></button><button className="icon-button" aria-label={`Remover despesa ${expense.name}`} onClick={() => { setRemoveError(""); setRemoving({ kind: "expense", expense }); }}><Trash2 size={15} /></button></div>
        {paymentMeta(`expense:${expense.id}`)}
      </article>)}
    </section>
    <section className="financial-section" aria-labelledby="financial-budget-title">
      <header><div><h2 id="financial-budget-title">Orçamento diário</h2><p>Uma previsão para todos, em cada dia da viagem.</p></div><button className="financial-add" onClick={() => { setMessage(""); setEditing({ kind: "daily" }); }}><Plus size={16} aria-hidden="true" />Configurar</button></header>
      {!plan.dailyBudgets.length && <p className="financial-empty">Defina alimentação ou outras despesas recorrentes. Os programas da mesma categoria já são descontados.</p>}
      {plan.dailyBudgets.map(budget => <article className="financial-record" key={budget.category}>
        <div><h3>{financialCategory(budget.category).label}</h3><p>Previsão diária · {money(budget.dailyAmountCents / 100, budget.currency)} / dia · {paymentMethods.find(item => item.id === (budget.paymentMethod || "undefined"))?.label}</p></div>
        <div className="financial-record-actions"><button className="icon-button" aria-label={`Editar previsão ${financialCategory(budget.category).label}`} onClick={() => setEditing({ kind: "daily", budget })}><Pencil size={15} /></button><button className="icon-button" aria-label={`Remover previsão ${financialCategory(budget.category).label}`} onClick={() => { setRemoveError(""); setRemoving({ kind: "daily", budget }); }}><Trash2 size={15} /></button></div>
      </article>)}
      {plan.dailyBudgets.length > 0 && <div className="financial-daily-list">{projection.daily.map(day => <details className="financial-daily" key={day.day}>
        <summary><CalendarDays size={16} aria-hidden="true" /><time dateTime={day.day}>{formatDate(day.day, { weekday: "short", day: "numeric", month: "short" })}</time><strong>{value(day.programsCents + day.additionsCents)}</strong></summary>
        <p>Programas {value(day.programsCents)} · Complemento diário {value(day.additionsCents)}</p>
        {day.additions.map(line => <p key={line.id}>{financialCategory(line.category).label}: + {value(line.amountCents)} · {paymentMethods.find(item => item.id === byId.get(line.id)?.paymentMethod)?.label || "A definir"} · Pendente</p>)}
      </details>)}</div>}
    </section>
    <details className="financial-programs"><summary>Custos dos programas <span>{value(projection.programCents)}</span></summary>
      <p className="financial-empty">Atualizados automaticamente pelo roteiro. Voos e hospedagens entram uma única vez.</p>
      {projection.lines.filter(line => line.origin === "program").sort((a, b) => a.date.localeCompare(b.date)).map(line => <div className="financial-program-row" key={line.id}>
        <button className="financial-program" disabled={!onProgram} onClick={() => { const event = events.find(item => `program:${item.id}` === line.id); if (event) onProgram?.(event); }}>
          <span><strong>{line.name}</strong><small>Programa · {financialCategory(line.category).label} · {line.date ? formatDate(line.date) : "Sem data"} · {money(line.originalAmountCents/100,line.originalCurrency)}</small></span><b>{line.unknown||line.missingRate ? "A definir" : value(line.amountCents)}</b>{onProgram && <ChevronRight size={15} aria-hidden="true" />}
        </button>
        {paymentMeta(line.id)}<button className="financial-pay-action" onClick={() => setPaying(line)} aria-label={`Pagamento de ${line.name}`}><WalletCards size={15} aria-hidden="true" />Pagamento</button>
      </div>)}

    </details>
    {projection.unmatched.length > 0 && <section className="financial-section financial-unmatched"><header><h2>Pagamentos fora dos custos atuais</h2></header>{projection.unmatched.map(payment => <article className="financial-record" key={payment.id}><div><h3>{payment.label}</h3><p>O item foi removido, cancelado ou está fora da consolidação atual. Histórico preservado.</p></div><strong>{money((disbursement(payment).settledCents+disbursement(payment).feesCents)/100,disbursement(payment).settlementCurrency)} pagos</strong><div className="financial-record-actions"><button className="financial-pay-action" onClick={() => setPaying({ id: payment.id, origin: payment.source, name: payment.label, category: "other", date: "", amountCents: 0,originalAmountCents:0,originalCurrency:payment.currency })}>Revisar pagamento</button></div></article>)}</section>}
    <p className="financial-note"><Info size={17} aria-hidden="true" /><span>Despesas avulsas são somadas uma vez, sem data. A previsão diária acrescenta apenas o que falta após os programas da mesma categoria em cada dia. Custos sem data não abatem previsões. Hospedagem entra uma vez, no check-in. O Resumo continua mostrando apenas os programas.</span></p>
    {exchangeOpen&&<FinancialExchangeForm trip={trip} exchange={plan.exchange} onClose={()=>setExchangeOpen(false)} onSaved={()=>{setExchangeOpen(false);setMessage("Câmbio de planejamento salvo. Desembolsos anteriores preservados.");}}/>}
    {paying && <FinancialPaymentForm trip={trip} line={paying} exchange={plan.exchange} payment={plan.payments?.find(payment => payment.id === paying.id)} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); setMessage("Pagamento salvo. O custo previsto foi preservado."); }} />}
    {editing && <FinancialEntryForm trip={trip} kind={editing.kind} expense={editing.kind === "expense" ? editing.expense : undefined} budget={editing.kind === "daily" ? editing.budget : undefined} existingBudgets={plan.dailyBudgets} referenceCurrency={projection.referenceCurrency} currencyLocked={editing.kind==="expense"&&!!plan.payments?.some(payment=>payment.id===`expense:${editing.expense?.id}`&&payment.paidCents>0)} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setMessage("Planejamento salvo."); }} />}
    {removing && <Modal title="Remover do planejamento?" busy={busy} onClose={() => setRemoving(null)}><p>Somente este item financeiro será removido. Os programas do roteiro serão preservados.</p>{removeError && <p role="alert" className="error">{removeError}</p>}<div className="form-actions"><button className="secondary" disabled={busy} onClick={() => setRemoving(null)}>Cancelar</button><button className="danger" disabled={busy} onClick={remove}>{busy ? "Removendo…" : "Remover"}</button></div></Modal>}
  </section>;
}
