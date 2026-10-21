# Salvamento de Hospedagem — regras e diagnóstico

## Causa confirmada

A consulta somente leitura de `rumos-bsb` em 20/10/2026 encontrou a release de regras de 04/10/2026, sem suporte a `details.type = 'lodging'` e sem o caminho `lodgingReservations`. O projeto configurado em `.env` e `.firebaserc` é `rumos-bsb`.

O teste de integração utiliza o **repositório real da aplicação**, o SDK Firestore e uma cópia dessas regras no emulador `demo-rumo-local`, em `127.0.0.1:8089`. A criação é recusada com `permission-denied`, mesmo sem código, link ou observação de reserva. O `catch` anterior escondia essa exceção sob uma mensagem genérica de conexão/permissão.

O mesmo payload é aceito pelas regras locais atuais. Não há motivo para remover os detalhes, tornar reservas públicas ou tentar uma segunda gravação menos protegida após a falha.

## Alterações exatas de regras

O [patch comparado com as regras publicadas](../../hospedagem-firestore.patch) mostra todo o delta. O arquivo a publicar é [firestore.rules](../firestore.rules). As diferenças são exclusivamente:

1. Adicionar `lodgingCategory`, `details_lodging`, `lodgingEvent`, `privateLodgingAccess` e `validLodgingReservation`.
2. Aceitar `lodging` em `validDetails`, com **somente** `type`, `checkOutDate`, `checkOutTime` e `guests` no documento público. Datas, horário e hóspedes continuam validados.
3. Em `validEvent`, permitir horário de check-in vazio para hospedagem, exigir check-out posterior ao check-in e dentro da viagem, endereço preenchido, `endTime == ''`, categoria permitida e `peopleCount == 1`. Assim o valor total não é multiplicado por hóspedes/noites.
4. Adicionar `trips/{tripId}/lodgingReservations/{eventId}`, aceitando **somente** `bookingReference`, `bookingUrl`, `notes` e `updatedAt`, com limites de tamanho e URL http(s). `getAfter` exige uma hospedagem correspondente. Leitura/escrita ficam restritas ao proprietário, ao administrador de viagem legada ou ao colaborador com vínculo válido. Visitante público, inclusive quem apenas edita por link, não recebe acesso à reserva.

Os controles existentes de proprietário, colaboração, acesso público e programas antigos não foram relaxados. A aplicação grava evento e reserva em um batch atômico; recusa não deixa um cadastro parcial.

## Publicação manual, somente após revisão

Nenhum deploy foi executado. Para publicar **somente as regras**, a partir da raiz do Rumo:

```powershell
Set-Location 'C:\Users\miche\Documents\Codex\2026-09-20\files-pasted-by-the-user-quero\outputs\rumo'
firebase.cmd deploy --only firestore:rules --project rumos-bsb
```

Não executar seed, deploy de Hosting/Functions ou comandos para outro projeto. Nenhum índice novo é necessário para estas leituras por coleção.

## Reproduzir os testes locais

Com o emulador configurado em `firebase.emulator.json` e escutando em `127.0.0.1:8089`:

```powershell
node scripts/test-rules.mjs
$env:RUMO_LODGING_EMULATOR='true'
# Opcional: repetir a recusa usando a cópia consultada antes do deploy.
$env:RUMO_PRE_LODGING_RULES='../published-rumos-bsb.rules'
node node_modules/vitest/vitest.mjs run --configLoader runner src/services/lodging.emulator.test.ts
Remove-Item Env:RUMO_LODGING_EMULATOR
Remove-Item Env:RUMO_PRE_LODGING_RULES -ErrorAction SilentlyContinue
```

Os testes de integração recusam execução normal sem a variável explícita, usam um projeto `demo-` fixo e não consultam nem gravam dados de produção. Cobrem proprietário/colaborador, grátis/pago, centavos, várias noites, edição do mesmo ID, nova conexão sem cache, custo único, visitante e atomicidade de falhas. Dados privados não entram nos diagnósticos da aplicação.
