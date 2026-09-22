# Validação da refatoração de interface

Revisão concluída em 21/09/2026.

## Verificações automatizadas

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run test -- --configLoader runner`: 22 testes passaram, em quatro arquivos.
- `npm run build -- --configLoader runner`: passou, gerando `dist` com a configuração existente do projeto.
- `git diff --check`: passou.

O carregador `runner` evita a tentativa do esbuild de ler um diretório pai bloqueado pelo ambiente de execução. Não foi necessário alterar os scripts do projeto. O build de produção ainda informa um aviso de tamanho no chunk do Firestore (aproximadamente 526 kB antes de gzip); não é erro de compilação.

## Revisão no navegador

Prévia isolada compilada com `VITE_DEMO_MODE=true`, sem modificar `.env`. Foram revisadas home com uma e várias viagens, Hoje, Roteiro, Lugares, Resumo, calendário, detalhes de programa, formulários e compartilhamento. Inspeção visual em desktop e larguras móveis de 360, 390 e 430 px.

Fluxos exercitados no modo demonstração: criação e edição de programa, cálculo de custos, duplicação de viagem inicialmente privada, compartilhamento e apresentação para visitantes. A execução real da duplicação no Firestore não foi realizada; sua sequência de gravações e tratamento de falhas possuem testes unitários.

Refinamentos finais verificados: navegação desktop permanece visível ao trocar de seção; retorno do calendário à agenda limpa o filtro de data oculto; formulário apresenta “1 dia” corretamente. Nenhum erro de console observado na revisão final.

## Preservação

Comparação SHA-256 com a referência anterior ao redesign confirmou conteúdo idêntico em configuração Firebase, autenticação, regras Firestore, seed da Mel, dados do seed, tipos persistidos e utilitários de datas e custos. Nenhuma nova dependência, migração ou gravação no Firestore real foi necessária para esta revisão.

## Arquivos principais

Tokens e estilos: `src/tokens.css`, `src/styles.css`. Telas: `src/pages/Home.tsx`, `src/pages/TripPage.tsx`. Componentes: `src/components/ui`, `src/components/trip`, `src/components/TripForm.tsx`, `src/components/EventForm.tsx`, `src/components/TripSummary.tsx`. Duplicação: `src/services/duplicateTrip.ts`.

Os ajustes finais estão disponíveis para revisão, commit e push. Nenhum deploy foi executado.

## Simplificação de navegação — 22/09/2026

- Três abas principais; Lugares como visão secundária, com compatibilidade dos links antigos.
- Uma ação Adicionar, com três escolhas; cadastro essencial seguido de ficha rápida e detalhes opcionais.
- Cabeçalho compacto nas telas internas; administração concentrada no menu da Visão geral.
- Verificação local de criação de voo, detalhes adicionais, edição curta preservando companhia/número/reserva e ficha pública sem código de reserva ou botões administrativos.
- Inspeção em 360, 390, 430, 1280 e 1440 px: Visão geral, Roteiro, Lugares e Gastos; sem overflow horizontal da página. Carrosséis preservam rolagem sem barra visível.
- Testes de navegação, compatibilidade de URLs, divulgação progressiva e Próximo passo adicionados em `src/utils/navigation.test.tsx`.
- Ambiente exclusivamente de demonstração local. Nenhum teste escreveu no Firebase real.

Validação reproduzível nesta máquina Windows:

```powershell
npm run lint
npm run typecheck
npm test -- --configLoader runner
npm run build -- --configLoader runner
```

O carregador `runner` evita o processo extra de empacotamento da configuração Vite neste ambiente. O build final usa a configuração normal do projeto; a prévia de QA foi compilada separadamente com demonstração local.
