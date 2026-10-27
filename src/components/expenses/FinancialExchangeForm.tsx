import { useState, type FormEvent } from "react";
import { Modal } from "../Modal";
import type { Trip } from "../../types";
import type { FinancialExchange } from "../../utils/financialTypes";
import { financialCurrencies, formatRate, parseRate } from "../../utils/foreignMoney";
import { parseFinancialAmount } from "../../utils/financialPlanning";
import { saveFinancialExchange, financialError } from "../../services/financialPlanning";
export function FinancialExchangeForm({trip,exchange,onClose,onSaved}:{trip:Trip;exchange?:FinancialExchange;onClose:()=>void;onSaved:()=>void}){
 const programCurrency=exchange?.programCurrency||trip.currency,currencies=financialCurrencies(programCurrency);
 const [reference,setReference]=useState(exchange?.referenceCurrency||trip.currency);
 const [rates,setRates]=useState<Record<string,string>>(()=>Object.fromEntries(currencies.filter(currency=>currency!=="BRL").map(currency=>[currency,exchange?.rates[currency]?formatRate(exchange.rates[currency]):""])));
 const [cash,setCash]=useState(((exchange?.cashFeeBps||0)/100).toFixed(2).replace(".",",")),[card,setCard]=useState(((exchange?.cardFeeBps||0)/100).toFixed(2).replace(".",","));
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(event:FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError("");try{
  await saveFinancialExchange(trip.id,{referenceCurrency:reference,programCurrency,rates:Object.fromEntries(Object.entries(rates).filter(([,rate])=>rate.trim()!=="").map(([currency,rate])=>[currency,parseRate(rate)])),cashFeeBps:parseFinancialAmount(cash),cardFeeBps:parseFinancialAmount(card)});onSaved();
 }catch(cause){setError(financialError(cause));}finally{setBusy(false);}}
 return <Modal title="Moedas e câmbio" busy={busy} onClose={onClose}><form className="financial-entry-form" onSubmit={submit}><fieldset disabled={busy}>
  <label>Moeda de referência<select aria-label="Moeda de referência" value={reference} onChange={event=>setReference(event.target.value)}>{currencies.map(currency=><option key={currency}>{currency}</option>)}</select></label>
  <p className="field-help">O Planejamento usa esta moeda para comparação. Os programas e o Resumo mantêm seus valores originais em {programCurrency}. Nada é convertido no cadastro original.</p>
  {Object.entries(rates).map(([currency,rate])=><label key={currency}>Câmbio de planejamento · 1 {currency} em BRL<input inputMode="decimal" value={rate} placeholder="Ex.: 5,20" onChange={event=>setRates({...rates,[currency]:event.target.value})}/></label>)}
  <p className="field-help">Cotação manual, sem atualização externa. Até 6 casas decimais. Em referência USD, a conversão inversa é calculada a partir da mesma cotação. Sem cotação, os totais ficam parciais e sinalizados.</p>
  <details className="financial-fx-extra"><summary>Taxas previstas (opcional)</summary><div className="financial-form-values"><label>Taxa em dinheiro (%)<input inputMode="decimal" value={cash} onChange={event=>setCash(event.target.value)}/></label><label>Taxa no cartão (%)<input inputMode="decimal" value={card} onChange={event=>setCard(event.target.value)}/></label></div><p className="field-help">Aplicadas somente às previsões desses métodos. Taxas efetivamente pagas são registradas no pagamento.</p></details>
 </fieldset>{error&&<p className="error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy?"Salvando…":"Salvar câmbio"}</button></div></form></Modal>;
}
