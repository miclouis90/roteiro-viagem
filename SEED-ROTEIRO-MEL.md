# Pré-cadastro do roteiro Brasília da Mel

## Executar pela interface

1. Use o `.env` existente, configurado para `rumos-bsb`, com `VITE_DEMO_MODE=false`.
2. Execute `npm run dev` e abra `http://localhost:5173/#/admin/seed-mel` (ou a porta informada pelo Vite). No site publicado, acrescente `/#/admin/seed-mel` ao endereço.
3. Entre com Google usando uma conta com `platformAdmins/{uid}.active === true`.
4. Aguarde **Viagem cadastrada ✓**, confira os programas na seção expansível e clique em **Cadastrar roteiro Brasília da Mel**.
5. A página informa os totais e o resultado por programa, com o link **Abrir viagem**. Depois, edite tudo pela interface normal.

O desenvolvimento e os testes não executam esse seed no Firestore real. Abrir a página faz apenas a verificação de acesso e existência da viagem; a gravação exige o clique administrativo. O comando antigo `npm run seed:mel` continua destinado ao cadastro da viagem, não ao roteiro.

## Destino e garantias

Projeto exclusivo: `rumos-bsb`. Coleção: `trips/brasilia-da-mel-2026/events`. Os 12 IDs estão em `src/data/melEvents.ts` e não devem ser alterados após o cadastro.

O serviço usa o SDK cliente, a sessão atual e as regras existentes. Antes de gravar, verifica os projetos de Auth e Firestore, login, administrador ativo, existência da viagem, título e período esperado. Não usa Admin SDK nem credenciais embutidas.

Uma transação lê a permissão, a viagem e todos os IDs antes das gravações. Somente documentos ausentes são criados, com os campos atuais de Event e timestamps do servidor. Uma disputa por um ID faz o Firestore repetir a transação, preservando o documento que já foi criado. Erros abortam a operação; leituras com erro não contam como documentos ausentes.

Primeira execução sem IDs existentes: **12 criados · 0 já existentes**. Segunda: **0 criados · 12 já existentes**. Se houver alguns IDs existentes, apenas os restantes serão criados. Edições manuais, outros eventos, documento da viagem, datas e `isPublic` não são modificados. A deduplicação é pelo ID, conforme solicitado; eventos manuais de mesmo nome com outro ID não são sobrescritos.

Não há programa em 02/11. Torre de TV + jantar permanece como `ideia`. Preços seguem o pedido, inclusive R$ 10 por pessoa no Memorial JK. Os quatro programas pagos com preço zero aparecem como **Valor a definir**. Os totais continuam usando o cálculo atual; o resumo informa quando a estimativa é parcial.

## Links

Google Maps Search preenchido para todos, com os termos especificados no pedido. URLs opcionais não confirmadas são strings vazias. Fontes consultadas em 21/09/2026:

- [Nippon — unidade original 403 Sul](https://www.nipponbrasilia.com.br/unidades/403sul). O [site oficial](https://www.nipponbrasilia.com.br/) também aponta para `https://instagram.com/nipponbrasilia`; essa ligação confirma a origem do perfil, sem presumir selo de verificação.
- [Museu Nacional da República — cadastro institucional MuseusBr](https://cadastro.museus.gov.br/museus/museu-nacional-da-republica/).
- [Espaço Lúcio Costa — cadastro institucional MuseusBr](https://cadastro.museus.gov.br/museus/espaco-lucio-costa/).
- [CCBB Brasília](https://ccbb.com.br/brasilia/) e [página oficial de Além da Fantasia — Yoshitaka Amano](https://ccbb.com.br/brasilia/programacao/yoshitaka-amano-alem-da-fantasia/), usada em `genericUrl`. A página informa exposição até 01/11/2026; permanece a orientação de reconfirmar programação e ingressos antes da viagem.
- [Ermida Dom Bosco — Brasília Ambiental](https://www.ibram.df.gov.br/w/ecologico-om-bosco).

Nenhuma programação, reserva ou funcionamento noturno foi inferido a partir dos links. As notas e horários solicitados foram preservados.

## Verificação técnica

`npm run lint`, `npm run typecheck`, `npm run test -- --configLoader runner`, `npm run build -- --configLoader runner`.

Os testes simulam o SDK, incluindo repetição, preservação de edições, preenchimento parcial, leitura com erro e rejeições de autorização/destino/viagem. Também comparam os campos do seed com a lista real de `firestore.rules`. Não substituem uma execução contra o Firestore; essa execução fica reservada ao clique do administrador.

Validação concluída: lint, TypeScript, 41 testes e build passaram. O build mantém o aviso preexistente de chunk do Firestore acima de 500 kB. No navegador, a página de seed foi revisada em prévia isolada e confirmou o botão desabilitado no modo demonstração. Não houve execução autenticada contra produção.

Arquivos desta alteração: `src/data/melEvents.ts`, `src/services/seedMelEvents.ts`, `src/services/seedMelEvents.test.ts`, `src/pages/SeedMelPage.tsx`, `src/utils/eventPrice.ts`, `src/components/Events.tsx`, `src/components/EventForm.tsx`, `src/components/TripSummary.tsx`, `src/styles.css`, `README.md` e este documento. Ajustes anteriores da refatoração foram preservados.
