import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../Modal";
import type { Trip } from "../../types";
import { money } from "../../utils/money";
import type { FinancialLine } from "../../utils/financialPlanning";
import { currentFinancialStatus, parseFinancialAmount } from "../../utils/financialPlanning";
import { financialStatuses, paymentMethods, type FinancialPayment, type FinancialPaymentChange, type FinancialStatus, type PaymentMethod, type FinancialExchange } from "../../utils/financialTypes";
import { convertCents, disbursement, financialCurrencies, formatRate, parseRate, ratio, RATE_SCALE } from "../../utils/foreignMoney";
import { financialError, saveFinancialPayment, watchPaymentHistory } from "../../services/financialPlanning";
export function FinancialPaymentForm({ trip, line, payment, exchange, onClose, onSaved }: {
 trip:Trip;line:FinancialLine&{originalAmountCents?:number;originalCurrency?:string};payment?:FinancialPayment;exchange?:FinancialExchange;onClose:()=>void;onSaved:()=>void;
}) {
 const currency=line.originalCurrency||trip.currency,total=line.originalAmountCents??line.amountCents;
 const previous=disbursement(payment||{currency:exchange?.referenceCurrency||currency});
 const [paid,setPaid]=useState(((payment?.paidCents||0)/100).toFixed(2).replace(".",","));
 const [status,setStatus]=useState<FinancialStatus>(currentFinancialStatus(total,payment,line.unknown)),[method,setMethod]=useState<PaymentMethod>(payment?.paymentMethod||"undefined");
 const [settlementCurrency,setSettlementCurrency]=useState(previous.settlementCurrency);
 const initialRate=convertCents(RATE_SCALE,currency,previous.settlementCurrency,exchange)||payment?.effectiveRateMicros;
 const [rate,setRate]=useState(initialRate?formatRate(initialRate):"");
 const [settled,setSettled]=useState((previous.settledCents/100).toFixed(2).replace(".",",")),[fees,setFees]=useState((previous.feesCents/100).toFixed(2).replace(".",","));
 const [expectedChangeId]=useState(payment?.lastChangeId||null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [historyOpen,setHistoryOpen]=useState(false),[history,setHistory]=useState<FinancialPaymentChange[]>([]),[historyError,setHistoryError]=useState("");
 const amount=parseFinancialAmount(paid),value=(amount:number)=>money(amount/100,currency);
 useEffect(()=>{if(!historyOpen||!payment)return;setHistoryError("");return watchPaymentHistory(trip.id,payment.id,setHistory,cause=>{setHistory([]);setHistoryError(financialError(cause));});},[historyOpen,payment,trip.id]);
 function suggest(text:string,quote=rate,targetCurrency=settlementCurrency){
  const amount=parseFinancialAmount(text),effective=targetCurrency===currency?RATE_SCALE:parseRate(quote);
  if(amount===0){setSettled("0,00");setFees("0,00");}
  else if(Number.isSafeInteger(amount)&&Number.isSafeInteger(effective)){try{setSettled((Math.max(0,previous.settledCents+ratio(amount-(payment?.paidCents||0),effective,RATE_SCALE))/100).toFixed(2).replace(".",","));}catch{setSettled("");}}
 }
 function changePaid(text:string){setPaid(text);const next=parseFinancialAmount(text);if(Number.isFinite(next))setStatus(currentFinancialStatus(total,{paidCents:next,status},line.unknown));suggest(text);}
 function chooseStatus(next:FinancialStatus){setStatus(next);if(next==="planned"||next==="reserved"){setPaid("0,00");suggest("0");}else if(next==="paid"){const text=(total/100).toFixed(2).replace(".",",");setPaid(text);suggest(text);}}
 async function submit(event:FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError("");try{
  const source=line.origin==="expense"?"expense":"program",principal=parseFinancialAmount(settled),fee=parseFinancialAmount(fees);
  const unchanged=payment&&amount===payment.paidCents&&principal===previous.settledCents&&fee===previous.feesCents;
  await saveFinancialPayment(trip.id,{source,sourceId:line.id.slice(source.length+1),label:line.name,currency,paidCents:amount,status,paymentMethod:method,settlementCurrency,settledCents:principal,feesCents:fee,effectiveRateMicros:unchanged?previous.effectiveRateMicros:settlementCurrency===currency?RATE_SCALE:parseRate(rate)},expectedChangeId);onSaved();
 }catch(cause){setError(financialError(cause));}finally{setBusy(false);}}
 return <Modal title={`Pagamento · ${line.name}`} busy={busy} onClose={onClose}><form className="financial-entry-form" onSubmit={submit}>
  <p className="field-help">O valor pago é acumulado na moeda original. Câmbio e desembolso de pagamentos anteriores ficam preservados; a sugestão aplica a cotação apenas à diferença deste pagamento.</p>
  <div className="financial-payment-overview"><div><span>Custo original</span><strong>{line.unknown?"A definir":value(total)}</strong></div><div><span>Saldo pendente original</span><strong>{value(Math.max(0,total-(Number.isFinite(amount)?amount:0)))}</strong></div></div>
  <fieldset disabled={busy}>
   <label>Situação financeira<select aria-label="Situação financeira" value={status} onChange={event=>chooseStatus(event.target.value as FinancialStatus)}>{financialStatuses.map(item=><option key={item.id} value={item.id} disabled={(item.id==="paid"||item.id==="partial")&&!!line.unknown}>{item.label}</option>)}</select></label>
   <label>Total já pago ({currency})<input required inputMode="decimal" value={paid} onChange={event=>changePaid(event.target.value)}/></label>
   <button type="button" className="secondary" disabled={!!line.unknown} onClick={()=>chooseStatus("paid")}>Marcar como paga</button>
   <label>Forma de pagamento prevista<select aria-label="Forma de pagamento prevista" value={method} onChange={event=>setMethod(event.target.value as PaymentMethod)}>{paymentMethods.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
   <details className="financial-fx-extra" open={currency!==settlementCurrency||undefined}><summary>Desembolso e câmbio efetivo</summary>
    <label>Moeda do desembolso<select aria-label="Moeda do desembolso" disabled={(payment?.paidCents||0)>0} value={settlementCurrency} onChange={event=>{const next=event.target.value,quote=convertCents(RATE_SCALE,currency,next,exchange);setSettlementCurrency(next);setRate(quote?formatRate(quote):"");suggest(paid,quote?formatRate(quote):"",next);}}>{[...new Set([...financialCurrencies(currency),trip.currency,previous.settlementCurrency])].map(item=><option key={item}>{item}</option>)}</select></label>
    {settlementCurrency!==currency&&<label>Câmbio efetivo · 1 {currency} em {settlementCurrency}<input inputMode="decimal" value={rate} onChange={event=>{setRate(event.target.value);suggest(paid,event.target.value);}}/></label>}
    <label>Total efetivamente desembolsado ({settlementCurrency})<input inputMode="decimal" value={settled} onChange={event=>{setSettled(event.target.value);const next=parseFinancialAmount(event.target.value),deltaOriginal=amount-(payment?.paidCents||0),deltaActual=next-previous.settledCents;if(currency!==settlementCurrency&&Number.isFinite(next)&&deltaOriginal!==0&&deltaActual!==0&&Math.sign(deltaOriginal)===Math.sign(deltaActual)){try{setRate(formatRate(ratio(Math.abs(deltaActual),RATE_SCALE,Math.abs(deltaOriginal))));}catch{setRate("");}}}}/></label>
    <label>Taxas totais já pagas ({settlementCurrency})<input inputMode="decimal" value={fees} onChange={event=>setFees(event.target.value)}/></label>
    <p className="field-help">O desembolso acima é o principal, sem taxas. Valores reais são confirmados ao salvar e não mudam com a cotação de planejamento. A moeda do desembolso fica fixa enquanto houver pagamento; correções são registradas no histórico.</p>
   </details>
   {line.unknown&&<p className="field-help">Defina o custo no programa antes de registrar pagamento.</p>}
   {(payment?.paidCents||0)>total&&<p className="notice">O pagamento supera o custo atual ou pertence a um item removido. Ele foi preservado na conciliação.</p>}
  </fieldset>{error&&<p role="alert" className="error">{error}</p>}<div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy?"Salvando…":"Salvar pagamento"}</button></div>
 </form>
 {payment&&<details className="financial-payment-history" onToggle={event=>setHistoryOpen(event.currentTarget.open)}><summary>Histórico financeiro</summary>{history.map(change=><p key={change.id}><strong>{money(change.previousPaidCents/100,change.currency)} → {money(change.paidCents/100,change.currency)}</strong><span>{financialStatuses.find(item=>item.id===change.status)?.label} · {paymentMethods.find(item=>item.id===change.paymentMethod)?.label}</span><span>Desembolso: {money((disbursement(change).settledCents+disbursement(change).feesCents)/100,disbursement(change).settlementCurrency)}{change.effectiveRateMicros?` · Câmbio ${formatRate(change.effectiveRateMicros)}`:""}</span><small>{change.changedAt?new Date(change.changedAt).toLocaleString("pt-BR"):"Aguardando confirmação"}</small></p>)}{historyError&&<p role="alert" className="error">{historyError}</p>}</details>}
 </Modal>;
}
