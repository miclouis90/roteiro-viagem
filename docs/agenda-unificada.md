# Agenda unificada — Fase 3

Viagens continuam como períodos inclusivos. `personalEvents` aparecem como compromissos na data de início, inclusive quando o horário final é no dia seguinte. Não são criados programas de viagem nem registros financeiros.

A Agenda tem busca própria e filtros **Tudo | Viagens | Eventos**. Nome/destino encontram viagens; título, cidade, local e tipo encontram eventos. Notas e links de ingresso não participam da busca. A busca, status e filtro de data da visualização Viagens continuam independentes e são preservados ao alternar visualizações.

## Volume e composição

- O calendário mostra no máximo duas faixas de viagem por semana e uma prévia de evento por data. Contagens incluem todos os registros; os demais eventos do dia ficam acessíveis pelo indicador `+N` e pela seleção da data.
- A lista do dia é ordenada com períodos de viagem primeiro e eventos por horário, exibindo 20 registros de cada vez. “Mostrar mais registros” revela os seguintes, sem descartar ou duplicar itens.
- O histórico de viagens é agrupado pelo ano de partida. Uma viagem que atravessa a virada aparece apenas uma vez. O ano mais recente abre inicialmente; outros anos são expansíveis. Cada grupo mostra 12 viagens inicialmente, com mais resultados sob demanda. A próxima viagem e os cards existentes são preservados.
- Os dados de eventos são indexados em memória por data; somente o mês visível é desenhado. A assinatura existente usa `ownerId`, sem novas consultas por mês, índices compostos ou paginação no servidor. O volume transferido na assinatura inicial continua sendo o conjunto de eventos daquele usuário; os limites são de renderização, não de leitura.

## Navegação e isolamento

`agendaType` e `agendaQuery` complementam `view`, `agendaDay` e `agendaMonth` na URL. `agendaEvent` identifica uma ficha aberta. A ficha é o mesmo componente de Meus eventos: visualização, edição e exclusão confirmada. A abertura mantém o contexto da Agenda no histórico; Voltar/fechar restaura mês, dia e filtros. Links diretos e recarga também funcionam.

As alterações da URL usam um rascunho compartilhado até a navegação confirmar. Mudanças rápidas de busca, tipo, mês e ano são combinadas, sem sobrescrever controles alterados no mesmo intervalo. A navegação de meses usa o último mês solicitado, incluindo cliques consecutivos.

A assinatura pessoal só é aberta com usuário autenticado e enquanto a visualização que precisa dela está montada. Trocar mês, data, filtro ou busca não abre novas assinaturas. Troca de conta ou saída limpa imediatamente dados e fichas privados; snapshots tardios da conta anterior são ignorados. Visitantes recebem apenas viagens já autorizadas, sem consulta a `personalEvents`.

Falhas/carregamento de uma fonte ficam sinalizados separadamente: eventos podem continuar disponíveis se a carga de viagens falhar, e viagens continuam visíveis se a fonte privada falhar. Nenhum valor de evento é consolidado em Gastos.

## Firestore

**Nenhuma alteração adicional de coleção, schema, regras ou índices nesta fase.** Para as três fases da Agenda, continuam sendo necessárias somente as regras de `personalEvents` introduzidas na Fase 2, caso ainda não publicadas. As regras financeiras permanecem intactas. Comando de publicação manual, quando autorizado:

```powershell
firebase.cmd deploy --only firestore:rules --project rumos-bsb
```

Nenhum deploy, seed, push ou alteração em dados reais foi executado. Os testes de segurança usam exclusivamente `demo-rumo-local` no emulador. O projeto `app-michel-e-bella` não é utilizado.
