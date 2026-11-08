# Eventos independentes — Fase 2

A integração posterior com o calendário está documentada em [Agenda unificada — Fase 3](agenda-unificada.md), preservando o modelo, cadastro e regras privadas descritos aqui.

O botão **+ Novo** fora das viagens abre as opções Viagem e Evento. Criar viagens continua sujeito à permissão administrativa existente; qualquer usuário autenticado não anônimo pode criar seu evento pessoal. O cadastro fica em **Meus eventos**, acessível pela Home. A ação superior das telas internas das viagens não muda.

## Modelo e privacidade

Coleção própria `personalEvents/{eventId}`, com campos fechados:

- Obrigatórios: `ownerId`, `title`, `category`, `date`, `startTime`, `city`, `location`, `createdAt`, `updatedAt`.
- Opcionais: `endTime`, `priceCents`, `ticketUrl`, `notes`.
- Categorias: `show`, `theater`, `sport`, `cultural`, `other`.
- Valores em BRL, inteiros em centavos. Ausência significa não informado; zero significa grátis. Valor total do evento, sem quantidade ou vínculo financeiro com viagem.
- Data local `AAAA-MM-DD` e horários `HH:mm`. Horário final anterior ao inicial significa término no dia seguinte e aparece identificado na ficha/formulário.

O dono vem da autenticação, não de um campo editável. A leitura/listagem exige `ownerId == request.auth.uid`; a consulta do cliente usa esse filtro. Outros usuários, colaboradores de viagens, administradores, visitantes e contas anônimas não podem acessar eventos alheios. Não existe opção pública. Dono e data de criação são imutáveis. Campos de viagem, permissões ou status adicionais são rejeitados. Subcoleções não são liberadas.

O formulário valida datas reais, horários, limites, centavos e URLs HTTP(S). As regras repetem a validação de estrutura e dados, incluindo anos bissextos. Erros exibidos não contêm o payload ou a mensagem original do SDK. Ao trocar de conta, dados e formulários privados são desmontados. O modo demonstração usa apenas a chave local separada `rumo-personal-events-v1`, por usuário; não cria dados no Firebase.

Eventos não são programas de viagens, não entram nos gastos/exportações nem aparecem no calendário nesta fase. O modelo independente mantém os dados de data/horário necessários para um adaptador futuro de `AgendaPeriod`; essa integração não foi implementada.

## Publicação manual de regras

**As regras novas de `personalEvents` precisam ser publicadas em `rumos-bsb` antes de disponibilizar o cliente atualizado. Nenhum deploy foi executado.** Revisar o diff de `firestore.rules` e executar manualmente, quando autorizado:

```powershell
firebase.cmd deploy --only firestore:rules --project rumos-bsb
```

Nenhuma alteração no projeto `app-michel-e-bella`. Não há seed, migração de viagens ou índice composto novo. A ordenação dos eventos pessoais é feita no cliente após a consulta por proprietário.

## Verificação local

O teste opt-in `src/services/personalEvents.emulator.test.ts` carrega as regras exclusivamente no emulador em `127.0.0.1:8089`, projeto `demo-rumo-local`, com identidades e dados locais isolados:

```powershell
$env:RUMO_PERSONAL_EVENTS_EMULATOR='true'
npm.cmd test -- src/services/personalEvents.emulator.test.ts
```

Cobre os cinco tipos, criação por usuário comum, edição, remoção de opcionais, preço pago/grátis, recarga por cliente novo, exclusão, bloqueios entre usuários, administrador, anônimo e visitante, descoberta sem filtro, transferência de dono e validação de dados fora do formulário.
