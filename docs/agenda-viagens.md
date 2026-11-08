# Agenda de viagens — Fase 1

Esta página descreve a primeira fase. A integração atual, os filtros independentes e os limites de renderização estão em [Agenda unificada — Fase 3](agenda-unificada.md).

A Home continua abrindo em **Viagens**, com os cards, ordenação, filtros, busca e filtro de data existentes. **Agenda** usa a mesma assinatura de viagens autorizadas; não consulta programas nem altera o Firestore.

Na Agenda, busca e status filtram os períodos apresentados. Não existe corte por hoje: viagens concluídas, em andamento e futuras são incluídas. O antigo filtro de data da listagem fica preservado ao alternar, mas não limita o calendário mensal.

Os períodos são inclusivos na partida e no retorno. Faixas são divididas apenas nas bordas das semanas, com continuidade visual; sobreposições ocupam linhas distintas. O dia selecionado mostra todas as viagens correspondentes. No desktop, a lista fica ao lado do calendário; no mobile, abaixo.

Os parâmetros opcionais da Home `view=agenda`, `agendaDay=AAAA-MM-DD` e `agendaMonth=AAAA-MM` guardam a visualização e a seleção. Abertura de viagem usa a rota existente; Voltar do navegador restaura a Agenda. Parâmetros inválidos têm fallback para hoje. Mudar mês/ano mantém o número do dia quando possível, limitado ao último dia do novo mês; o botão Hoje realinha calendário e lista.

`utils/agenda.ts` trabalha com períodos genéricos e datas locais, sem instantes UTC. `PeriodCalendar` recebe períodos, rótulos e callbacks; não conhece `Trip`, Firestore nem rotas. `TripAgenda` adapta as viagens e reutiliza `TripCard`. Esses pontos permitem adicionar outra origem de períodos no futuro, sem implementar eventos independentes nesta fase.

Nenhuma regra, coleção, campo persistido ou permissão do Firestore é modificada. Não é necessário deploy de regras para esta fase.
