# Planejamento financeiro — Fase 1

## Modelo e cálculo

O Resumo continua usando `spending()` e os programas existentes. A nova projeção não copia programas, voos ou hospedagens para documentos financeiros. O custo de uma estadia entra integralmente uma vez, no check-in, sem multiplicar hóspedes ou noites.

- `trips/{tripId}/financialExpenses/{expenseId}`: `name`, `category`, `amountCents`, `quantity`, `notes`, `currency`, `createdAt`, `updatedAt`.
- `trips/{tripId}/financialDailyBudgets/{category}`: `category`, `dailyAmountCents`, `currency`, `updatedAt`.

Os novos valores são inteiros em centavos. Avulsas somam `amountCents × quantity`, uma única vez e sem data. São itens adicionais, que o usuário deve registrar somente quando ainda não constam em um programa.

Por dia/categoria: `complemento = max(0, previsão diária − custo conhecido dos programas ativos da categoria naquele dia)`. O custo dos programas continua no total; somente o complemento é acrescentado. Programas cancelados não entram. Programas sem data entram no total, sem abater um dia arbitrário. Custos ainda a definir ficam sinalizados.

A previsão é o total para todas as pessoas por dia, durante o período da viagem. Hospedagem não pode ser configurada como despesa recorrente. Uma categoria tem um único documento de previsão, evitando cópias ao editar. Os valores são recalculados com os programas atuais.

BRL é usado nas viagens em BRL. Para compatibilidade, viagens em outras moedas conservam a moeda da viagem; não há câmbio automático. Se a moeda da viagem mudar, registros financeiros em moeda diferente ficam sinalizados e excluídos da consolidação até revisão manual.

## Segurança e publicação

As duas novas coleções são privadas: usam o mesmo predicado existente de proprietário, administrador legado autorizado ou membro editor de uma viagem não PRIVATE (`privateLodgingAccess`). PUBLIC/PUBLIC_EDIT por si só não concede acesso financeiro. A proteção é aplicada nas regras, incluindo leitura e listagem, não apenas na interface. Observações ficam nesses documentos privados, nunca no documento público da viagem/programa.

As regras existentes de viagens, membros, programas e hospedagens não foram flexibilizadas. Foram adicionadas apenas validações e matches para as duas novas coleções, com campos fechados, categoria conhecida, moeda igual à viagem, limites numéricos e timestamps.

**É necessário publicar as novas regras antes de disponibilizar a funcionalidade no Firebase. Nenhum deploy foi executado nesta implementação.** Comando para revisão/execução manual:

```powershell
firebase.cmd deploy --only firestore:rules --project rumos-bsb
```

Nunca direcionar esse comando a `app-michel-e-bella`. Não é necessário seed nem migração de registros antigos. O planejamento começa vazio e os programas são reaproveitados na leitura. Duplicar viagem continua copiando apenas os dados já suportados; despesas e previsões financeiras privadas não são copiadas automaticamente. A exclusão da viagem pelo proprietário limpa também as novas coleções antes de remover a viagem.

No modo demonstração, somente o armazenamento local separado `rumo-financial-v1` é usado, sem gravar no Firebase.

## Verificação local

Testes de cálculo, serviço e interface executam com `npm test`. Os testes reais de regras/persistência são opt-in, com o emulador em `127.0.0.1:8089` e projeto exclusivamente `demo-rumo-local`:

```powershell
$env:RUMO_FINANCIAL_EMULATOR='true'
npm.cmd test -- src/services/financialPlanning.emulator.test.ts
```

O teste carrega as regras somente no emulador e cria fixtures apenas nesse projeto local. Cobre proprietário/colaborador, criação/edição/releitura, unicidade por categoria, visitantes públicos/PUBLIC_EDIT, alterações de moeda e payload inválido.

## Fase 2 — pagamentos e pendências

Os cálculos de custo previsto da Fase 1 e o Resumo não mudaram. A situação financeira é independente de `TripEvent.status`: confirmar/reservar um programa não registra pagamento.

- `trips/{tripId}/financialPayments/{source}:{sourceId}` armazena somente metadados financeiros de um programa ou despesa avulsa: `source`, `sourceId`, `label`, `currency`, `paidCents`, `status`, `paymentMethod`, `lastChangeId`, `createdAt`, `updatedAt`.
- `history/{changeId}` dentro desse documento registra, de forma imutável, o valor acumulado anterior/novo, situação, método, moeda, data e autor da alteração. Revisões não são despesas e **não entram na soma**.
- Previsões diárias ganham apenas `paymentMethod` opcional. Valores antigos continuam válidos; ausência significa `undefined` (A definir). Nenhuma previsão diária é automaticamente paga.

Situações: `planned` (prevista), `reserved` (reservada), `partial` (parcialmente paga), `paid` (paga). Métodos: `undefined`, `cash`, `card`, `pix` (transferência/Pix). A interface recebe o **total acumulado pago**, não um acréscimo: trocar 40 por 100 significa 100 pagos, e não 140. É possível corrigir o acumulado; o valor anterior fica no histórico.

O serviço usa transação para ler o custo atual, verificar a revisão que o usuário abriu e gravar pagamento/histórico juntos. Alterações concorrentes são recusadas para revisão; não sobrescrevem silenciosamente outro pagamento. As regras exigem a revisão atômica e validam método, situação, centavos, origem, moeda, limites, timestamps e usuário. Atualizar revisões existentes é proibido. Dados públicos de programas e despesas avulsas não são duplicados nem alterados por esse serviço.

Conciliação normal: `previsto = pago + pendente`; `pendente` é a soma por dinheiro, cartão, Pix e **A definir**. Os complementos diários participam dessa distribuição pela forma prevista.

Se o custo diminuir, o programa for cancelado/removido ou a avulsa for removida após receber pagamento, o pagamento/histórico permanece. O excedente é mostrado separadamente: `previsto + excedente = pago + pendente`. Valores pagos não somem e não são adicionados de volta ao custo previsto. Uma mudança de moeda não converte pagamentos: registros em outra moeda ficam preservados fora da consolidação atual; restaurar a moeda correspondente permite revisá-los.

Documentos antigos sem pagamentos começam com zero pago, situação prevista e forma A definir; não há migração nem gravação automática. Hospedagem e voos continuam sendo uma única origem por evento. A exclusão completa da viagem pelo proprietário limpa também os pagamentos e suas revisões. A exclusão isolada de um programa/avulsa preserva o histórico financeiro.

**Também é necessário publicar as regras da Fase 2 em `rumos-bsb` antes de publicar o cliente atualizado.** Elas acrescentam somente os caminhos privados de pagamentos/histórico e o campo opcional da previsão diária, sem abrir acesso financeiro ao público ou a usuários apenas com PUBLIC_EDIT. Nenhum deploy foi executado. O comando manual permanece:

```powershell
firebase.cmd deploy --only firestore:rules --project rumos-bsb
```

Os testes de `financialPlanning.emulator.test.ts` cobrem as duas fases, incluindo pagamentos integral/parcial, concorrência, revisão atômica, histórico imutável, releitura, custos originais e tentativas de acesso de visitantes. Sempre usam apenas `demo-rumo-local` em `127.0.0.1:8089`.

## Fase 3 — moedas, câmbio manual e desembolso

A referência do **Planejamento** é configurada em `financialSettings/exchange`, separada de `Trip.currency` e de `programCurrency`. Isso permite mudar a referência sem reinterpretar programas antigos ou mudar o Resumo. `programCurrency` é capturada da moeda da viagem na primeira configuração e não pode ser alterada. Despesas avulsas e previsões mantêm `currency` e seus valores originais em centavos; nunca recebem valores convertidos de volta.

A configuração privada guarda `referenceCurrency`, `programCurrency`, `rates`, `cashFeeBps`, `cardFeeBps` e `updatedAt`. A V1 oferece BRL e USD, mais a moeda legada da viagem para compatibilidade. `rates[moeda]` significa BRL por unidade da moeda, em milionésimos: USD 5,20 = 5.200.000; BRL é sempre 1.000.000. Não há API externa ou taxa implícita. A arquitetura de taxas admite estender o catálogo e suas regras para outras moedas.

Conversão: `roundHalfUp(centavosOriginais × taxaOrigem / taxaReferência)`, usando inteiros grandes. A quantidade é aplicada antes de converter o total do item. A cada projeção, a conversão parte novamente do original. Não existe cadeia de conversões persistidas. Falta de cotação deixa os totais explicitamente parciais; valores originais e pendências nativas continuam visíveis.

A previsão diária é calculada na moeda do orçamento: desconta os programas do mesmo dia/categoria convertidos para essa moeda; converte somente o complemento para a referência. Hospedagens e voos continuam uma única origem. Taxas previstas são percentuais por método em pontos-base: 3% = 300. Elas são mostradas separadamente e incluídas nas previsões/pendências do método, sem virar pagamentos.

Pagamentos podem ter, de forma opcional e compatível com dados antigos:

- `settlementCurrency`: moeda do desembolso efetivo;
- `settledCents`: principal acumulado efetivamente desembolsado;
- `feesCents`: taxas acumuladas efetivamente pagas, na mesma moeda;
- `effectiveRateMicros`: câmbio efetivo da última alteração explícita, com até seis casas decimais.

`paidCents` continua sendo o acumulado pago na **moeda original** da despesa, usado para calcular o saldo original. Os dados do desembolso são progressivos no formulário. A sugestão de uma parcela nova soma ao desembolso anterior apenas a diferença do pagamento convertida pela cotação efetiva informada. Ex.: 50 USD pagos a 5,20 = 260 BRL; outros 50 USD a 6,00 levam a 560 BRL de principal, nunca a 600 BRL. O usuário pode confirmar o valor real do comprovante e suas taxas. Alterações de cotação de planejamento não escrevem nesses dados.

Cada revisão imutável guarda o novo snapshot e os valores anteriores de desembolso/taxas. Revisões antigas sem esses campos são lidas como desembolso na própria moeda original, sem migração ou regravação. A moeda do desembolso fica fixa enquanto houver pagamento para não misturar acumulados de unidades diferentes no mesmo item; correções explícitas permanecem no histórico.

Quando a moeda do desembolso coincide com a referência, o total pago permanece fixo ao mudar a cotação. Se diferir, a interface identifica o equivalente na referência como estimado pela cotação atual, mostrando também o desembolso nativo fixo. Isso é uma avaliação para comparação; não altera o desembolso ou o histórico.

A diferença entre previsão e efetivo é explícita: `previsto + variação de câmbio/taxas + excedente = pago + pendente`. A previsão com os valores já realizados também é mostrada quando há diferença. Os totais de origem, por categoria e por método conciliam com o previsto; pendências em moeda estrangeira são exibidas no principal original, com taxas estimadas detalhadas na referência.

**As regras da Fase 3 também precisam ser publicadas manualmente em `rumos-bsb` antes do cliente.** Elas aceitam moedas originais suportadas, protegem a moeda de despesas já pagas, validam os campos opcionais do desembolso e a configuração privada, e mantêm os bloqueios a visitantes/PUBLIC_EDIT. Não houve deploy ou migração. O comando manual continua `firebase.cmd deploy --only firestore:rules --project rumos-bsb`.

A moeda original dos programas fica somente para leitura ao editar uma viagem; a referência financeira é alterada no Planejamento. Após a configuração de câmbio, as regras também impedem que clientes antigos mudem `Trip.currency`, evitando reclassificar preços históricos. O cadastro de novas viagens continua oferecendo a escolha da moeda original.
