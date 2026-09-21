# Rumo — planejamento e compartilhamento de viagens

SPA responsiva em React, TypeScript e Vite, com Firebase Authentication, Firestore e publicação automática no GitHub Pages. Sem backend próprio ou Next.js.

## O que está implementado

- Várias viagens, destinos livres, período inclusivo, moeda, grupo, descrição, observações, status e visibilidade.
- Agenda vertical, calendário, Hoje, Lugares e Resumo. Busca e filtros combináveis por data, categoria, status, prioridade e custo.
- Cadastro, edição e exclusão de programas; detalhes com links externos, localização, prioridade, observações e status.
- Custos por pessoa, atividade, dia e viagem; média diária. Programas cancelados ficam visíveis, mas não entram nos totais.
- Google Login e autorização por e-mail verificado em uma coleção protegida de administradores.
- Viagens públicas acessíveis sem login por `#/viagem/ID`. Privadas acessíveis apenas a administradores.
- Demonstração de Brasília isolada em localStorage, sem escrever no Firebase.
- Confirmações destrutivas, mensagens de sucesso/erro, estados vazios, carregamento, modais com foco e navegação por teclado.

## Rodar localmente

Pré-requisito: Node.js 22 e npm. Se estiver usando a pasta entregue, abra um terminal dentro dela. Depois de criar seu repositório, você também poderá usar:

```sh
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd SEU_REPOSITORIO
npm install
```

Copie `.env.example` para `.env` (no PowerShell: `Copy-Item .env.example .env`).

```sh
npm run dev
```

Abra o endereço mostrado no terminal. O exemplo tem `VITE_DEMO_MODE=true`: clique em **Testar administração** para criar, editar e excluir dados locais. **Ver como visitante** esconde controles administrativos e viagens privadas. Isso é uma simulação explicitamente identificada, não autenticação de produção.

A demonstração persiste apenas no navegador e não compartilha alterações entre dispositivos. Para removê-la, exclua a viagem pelo botão de administração. Para restaurá-la, remova a chave `rumo-demo-v1` no armazenamento local do navegador. Ao usar Firebase, os dados fictícios nunca são importados automaticamente.

## Configurar Firebase de verdade

1. Abra https://console.firebase.google.com/ e crie um projeto.
2. Em **Configurações do projeto**, registre um aplicativo Web. Copie os valores de configuração para as seis variáveis `VITE_FIREBASE_*` no `.env`.
3. Configure `VITE_DEMO_MODE=false` e reinicie `npm run dev`.
4. Em **Build → Firestore Database**, crie o banco padrão em modo de produção e escolha a região adequada.
5. Em **Authentication → Sign-in method**, ative **Google** e defina o e-mail de suporte.
6. Em **Authentication → Settings → Authorized domains**, inclua `localhost`, `127.0.0.1` se usado e `SEU_USUARIO.github.io`. Inclua apenas o domínio, sem caminho do repositório. Inclua seu domínio próprio se houver.
7. Na aba **Rules** do Firestore, cole o conteúdo de `firestore.rules` e clique em **Publish**. Alternativamente, use a CLI:

```sh
npx firebase-tools login
npx firebase-tools deploy --only firestore --project SEU_PROJECT_ID
```

8. No console Firestore, crie a coleção `admins`. O ID do documento deve ser o e-mail Google do administrador **em minúsculas**. Adicione o campo booleano `enabled: true`. Exemplo: `admins/pessoa@example.com`. Não crie esse documento pela aplicação: as regras proíbem qualquer escrita de cliente nessa coleção.
9. Entre pelo botão **Entrar com Google**. Um usuário autenticado sem esse documento continua sendo visitante. Para revogar o acesso administrativo, altere `enabled` para `false` ou exclua o documento pelo console.
10. Crie uma viagem, adicione um programa e atualize a página. Marque a viagem como pública e teste o link em uma janela anônima. Para uma viagem privada, a mesma janela deve mostrar acesso indisponível.

Todos os administradores têm acesso a todas as viagens. A modelagem não implementa permissões por proprietário. E-mails precisam ser verificados; o login Google atende esse requisito. A autorização é verificada tanto na interface quanto no servidor pelas regras.

A configuração Web Firebase é pública por natureza e será incluída no JavaScript compilado. Não use uma chave de serviço, senha ou credencial administrativa nas variáveis VITE. A segurança dos dados depende das regras Firestore, não de esconder a API key. O projeto não contém configuração de conta específica.

## Modelo de dados e arquitetura

```text
src/
  components/       formulários, modal e cartões/detalhes
  pages/            lista de viagens e espaço do roteiro
  hooks/            sessão/autorização e mensagens
  services/         repositório Firestore e demonstração isolada
  lib/firebase.ts   inicialização central por ambiente
  data/             categorias e exemplo de Brasília
  utils/            datas, custos, validação de links e testes
  types.ts          modelos tipados
.github/workflows/deploy.yml
firestore.rules
firestore.indexes.json
firebase.json
```

`trips/{tripId}` usa os campos solicitados e acrescenta `currency`. `trips/{tripId}/events/{eventId}` acrescenta `genericUrl`. `createdAt` e `updatedAt` usam timestamps do servidor; são metadados persistidos, não datas do roteiro. `admins/{email}` contém `enabled: boolean` e é gerenciado exclusivamente pelo console/ambiente administrativo.

As datas do roteiro são strings `YYYY-MM-DD`. A exibição usa os componentes de data no fuso local, ao meio-dia. A diferença em dias usa somente os componentes da data em uma base neutra; nunca converte uma meia-noite UTC para exibição local. Chegada e saída estão incluídas. O formulário limita viagens a 366 dias e horários ao mesmo dia; atividades após meia-noite devem ser divididas em dois programas.

Se o período da viagem for reduzido, atividades fora do novo período são preservadas e destacadas para correção. Excluir uma viagem remove seus eventos em lotes antes do documento pai. Se houver interrupção entre lotes, a operação pode ser repetida; para conjuntos enormes ou exclusão concorrente por vários administradores, uma rotina administrativa de limpeza é indicada.

Categorias ficam centralizadas em `src/data/categories.ts`; inclua um item com nome, ícone e grupo visual para ampliar a lista. Não há necessidade de migrar o banco. A estimativa cobre apenas as atividades cadastradas; não inclui passagens ou hospedagem implicitamente. Valores são apresentados na moeda da viagem, sem conversão cambial automática.

## GitHub e GitHub Pages

1. Crie um repositório vazio no GitHub. Use uma conta/plano que permita GitHub Pages para a visibilidade escolhida.
2. Abra o terminal na pasta `rumo` e envie o conteúdo dela como raiz do repositório:

```sh
git init
git add .
git commit -m "Implementa Rumo: roteiros de viagem"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

O `.gitignore` exclui `.env`, dependências e build. Inclua `package-lock.json` no commit.

3. No repositório, vá a **Settings → Secrets and variables → Actions → New repository secret**. Cadastre os seis valores com os mesmos nomes de `.env.example`: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
4. Em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions**.
5. Na aba **Actions**, abra **Publicar no GitHub Pages** e execute **Run workflow**, ou envie um novo commit à branch `main`.
6. O workflow instala dependências com `npm ci`, executa lint, TypeScript, testes e build, e publica `dist`. Ele falha explicitamente se houver configuração Firebase ausente. O modo demonstrativo é desabilitado no deploy.
7. Acesse o endereço apresentado pelo job `deploy`, normalmente `https://SEU_USUARIO.github.io/SEU_REPOSITORIO/`.
8. Adicione esse domínio aos domínios autorizados do Firebase Authentication e publique as regras antes de usar dados reais.

O Vite usa `base: './'`, tornando assets relativos à página tanto no domínio raiz quanto em subpastas. O HashRouter mantém as rotas depois de `#`, dispensando redirecionamentos ou página 404 personalizada. A variável opcional `VITE_BASE_PATH` permite sobrescrever a base se necessário.

Alterar secrets não atualiza um build existente: execute novamente o workflow. As regras Firestore são publicadas separadamente, nunca pelo frontend. Não há chave de conta de serviço no workflow.

## Verificações

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Os testes automatizados cobrem datas inclusivas, viradas de mês, ano bissexto, intervalo próximo à mudança de horário de verão, custo por grupo, exclusão de gratuitos/cancelados e URLs inseguras. O build produz `dist/`.

Verificação recomendada após configurar sua conta Firebase: autenticação Google; administrador e usuário comum; leitura pública em janela anônima; bloqueio de viagens privadas; tentativa de escrita sem administrador; persistência após recarregar e em outro dispositivo. A demonstração local não valida essas integrações remotas.

## Configurações manuais restantes

- Criar/selecionar o projeto Firebase, ativar Google e Firestore, preencher variáveis e autorizar domínios.
- Publicar regras e cadastrar os e-mails administrativos pelo console.
- Criar/selecionar o repositório GitHub, cadastrar secrets e ativar Pages.
- Executar o deploy e validar o fluxo real nas contas escolhidas.

Nenhum recurso de nuvem é criado automaticamente por instalar este projeto. Fontes Google são opcionais em tempo de execução; o CSS tem fallback sans-serif caso estejam indisponíveis.

## Pré-cadastrar “Brasília da Mel” no Firestore real

Na pasta do projeto, com as dependências instaladas, execute:

```sh
npm run seed:mel
```

Antes, preencha o `.env` com a configuração Web do projeto **rumos-bsb** e defina `VITE_DEMO_MODE=false`. O `.env` local entregue inicialmente está vazio e com demonstração ativa. Não use dados de outro projeto. O comando valida os valores efetivos do Vite (incluindo eventuais `.env.local` e variáveis do terminal); em caso de divergência, interrompe sem gravar. A configuração não é obtida de `.firebaserc`, nem de credenciais de outro aplicativo.

O comando abre uma tela local em `/#/admin/seed-mel`. Entre pelo botão **Entrar com Google** e clique em **Cadastrar viagem privada no Firestore**. É necessário um administrador já autorizado nas regras atuais: `platformAdmins/SEU_UID`, com `active: true`, exclusivamente em **rumos-bsb**. Autorize `127.0.0.1` no Firebase Authentication se esse domínio ainda não estiver habilitado. Nenhuma senha, token de serviço ou credencial administrativa precisa ser colocada no código. Ctrl+C encerra o servidor depois do cadastro.

O mecanismo utiliza o SDK cliente com o login da aplicação; as regras Firestore continuam sendo aplicadas. Não usa Admin SDK e não altera regras, administradores ou permissões.

Destino: banco padrão `(default)` do projeto `rumos-bsb`, documento **`trips/brasilia-da-mel-2026`**. Será gravada somente a viagem privada de Mel, de 29/10/2026 a 02/11/2026, com os dados solicitados e timestamps do servidor. A aplicação calcula **5 dias**; esse número não é persistido. Nenhum evento é criado.

Antes de escrever, consulta no servidor viagens com o título exato `Brasília da Mel` e compara a data `2026-10-29`. Se encontrar uma, inclusive com outro ID, informa que já existe e oferece o link desse documento, sem modificar nem mesmo sua visibilidade. Se o ID previsto estiver ocupado por outra viagem, interrompe sem sobrescrever. Uma transação protege o ID fixo contra repetições e execuções simultâneas deste cadastro. Falhas de rede ou permissão abortam a operação. Não há exclusões.

Essa proteção não cria uma restrição global de unicidade para o formulário comum: evite cadastrar manualmente a mesma viagem ao mesmo tempo que executa o seed. Execuções repetidas do seed são idempotentes.

Após a confirmação, clique em **Abrir viagem**. Ela aparecerá normalmente para os administradores; visitantes não verão a nova viagem privada. Continue adicionando programas pela interface habitual. O comando prepara e abre o fluxo autenticado; somente iniciar o servidor não insere dados. Os testes automatizados validam a lógica com simulações, sem escrever em nenhum projeto remoto.

**Nota sobre a configuração administrativa atual:** neste checkout as regras e o hook de autenticação já usam `platformAdmins/{uid}` com `active: true`. Essa configuração substitui as instruções antigas sobre `admins/{email}` nas seções anteriores; ela foi preservada nesta alteração.
## Interface simplificada (refatoração UI/UX)

A interface usa tokens centralizados em `src/tokens.css` e CSS consolidado em `src/styles.css`, com fontes nativas, cores suaves por categoria e ícones Lucide já presentes no projeto. Nenhuma dependência foi adicionada.

- Home editorial com apresentação ampliada quando existe uma única viagem.
- Menu contextual para editar, duplicar, mudar a privacidade ou excluir uma viagem.
- Roteiro com seleção horizontal de dia e timeline; calendário preservado como visualização alternativa.
- Hoje, Lugares e Resumo com conteúdos separados; navegação inferior no mobile.
- Formulários em seções progressivas. Campos opcionais permanecem montados e seus valores são preservados mesmo com a seção recolhida. Erros de validação abrem a seção correspondente.
- Compartilhamento por modal/bottom sheet, copiar link e Web Share API quando disponível.
- Status têm novos rótulos apenas na interface: os valores persistidos continuam iguais.

As permissões, regras, Authentication, configuração Firebase, seed, coleções, datas e cálculos existentes foram preservados. Não há migração. Novas ações da interface utilizam as operações cliente e regras atuais. A duplicação cria uma cópia privada com novos IDs, sem modificar a origem. O documento pai precisa existir antes de gravar os programas, conforme as regras atuais; se houver falha na segunda etapa, a interface informa o ID da cópia para conferência, sem apagar dados. Limite de 498 programas por duplicação; programas fora do período precisam ser corrigidos antes.

Componentes de domínio ficam em `src/components/trip/`, componentes de UI em `src/components/ui/`, e formulários separados em `TripForm.tsx` e `EventForm.tsx`. A antiga sidebar de indicadores foi removida.

## Roteiro da Brasília da Mel

A rota `/#/admin/seed-mel` também permite cadastrar os 12 programas na viagem existente. A ação exige administrador autenticado no projeto `rumos-bsb`, preserva documentos existentes e não muda a privacidade da viagem. Veja [instruções, garantias e fontes dos links](SEED-ROTEIRO-MEL.md). A gravação só ocorre após clicar em **Cadastrar roteiro Brasília da Mel**.
