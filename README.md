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
