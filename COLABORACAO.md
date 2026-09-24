# Colaboração no Rumo — revisão antes da publicação

Implementação local, sem deploy, acesso ao Firestore real, migração ou alteração da viagem Brasília da Mel. Os arquivos de seed e seus dados foram preservados. Não é necessário executar seed para ativar colaboração.

## Schema

Em `trips/{tripId}`:

- `ownerId?: string`: UID Firebase do proprietário. Novas viagens criadas pela interface recebem o UID autenticado. Uma viagem antiga só recebe proprietário por ação explícita de um administrador em Compartilhar.
- `access?: "PRIVATE" | "SHARED" | "PUBLIC" | "PUBLIC_EDIT"`: autoridade sobre acesso.
- `isPublic` permanece por compatibilidade e consultas públicas. Deve ser `true` somente em PUBLIC/PUBLIC_EDIT; as regras rejeitam inconsistência.
- `createdAt` permanece imutável; `updatedAt` continua timestamp do servidor. Não foi adicionado campo de quantidade de dias.

Em `trips/{tripId}/members/{uid}`:

- `uid: string`: deve coincidir com o ID do documento. Permite consultar as participações do próprio usuário através de collection group, sem criar uma segunda coleção de vínculos.
- `role: "owner" | "editor"`.
- `displayName: string`, `email: string`, `addedAt: timestamp` do servidor.

`ownerId` é a fonte de autoridade; um documento de membro nunca transfere propriedade. A interface não duplica o proprietário na subcoleção. A entrada voluntária pelo link cria apenas `editor`; a transação é idempotente. Convites nominais por e-mail ficaram para uma etapa posterior.

Nenhum campo novo em programas, categorias, detalhes ou custos. Serviços de colaboração e permissões estão centralizados para futuras extensões; não há auditoria ou histórico nesta versão.

## Matriz e regras

| Modo | Leitura | Edição do conteúdo |
|---|---|---|
| PRIVATE | Proprietário | Proprietário |
| SHARED | Proprietário e membros editores | Proprietário e membros editores |
| PUBLIC | Qualquer pessoa | Proprietário e membros editores autenticados |
| PUBLIC_EDIT | Qualquer pessoa | Qualquer conta autenticada, exceto Auth anônimo |

- Colaboradores podem criar, editar e excluir programas e editar conteúdo da viagem. Atualizações da viagem têm uma lista explícita de campos permitidos.
- Só o proprietário exclui a viagem inteira, muda acesso ou administra membros. Um membro pode remover a própria participação. Não existe transferência de propriedade pela interface ou update comum.
- O repositório verifica a propriedade antes de começar a excluir os programas de uma viagem.
- Não há escrita global nem escrita sem login; Firebase Anonymous Auth também é recusado. A interface oferece Google.
- A consulta a `platformAdmins` continua limitada ao próprio UID; não é possível conceder administração pelo cliente.
- `firestore.indexes.json` adiciona índice de collection group para `members.uid`. Cada usuário só consulta seus vínculos; o proprietário pode listar os membros da viagem.
- Remover uma participação não bloqueia o link PUBLIC_EDIT: esse modo, por definição, permite edição por qualquer conta autenticada. Para restringir efetivamente, selecione SHARED.
- PUBLIC e PUBLIC_EDIT são públicos, não links secretos nem convites. O Firestore retorna o documento completo; ocultar informações de reserva na interface não torna esses campos privados. A tela informa isso antes da mudança de acesso.

## Compatibilidade e concorrência

Sem `access`, a aplicação usa PUBLIC quando `isPublic=true`, e PRIVATE caso contrário. Viagens sem `ownerId` continuam legíveis/editáveis pelo administrador antigo. Excluir a viagem ou mudar o acesso exige primeiro assumir propriedade; nenhuma leitura faz essa mudança automaticamente.

A Home consulta viagens públicas, próprias e participações. Não faz varredura administrativa de todas as viagens, pois isso exporia viagens privadas de outros proprietários. Brasília da Mel tem consulta direta pelo ID existente `brasilia-da-mel-2026`. Outras viagens antigas privadas podem ser abertas por seus links; IDs visitados ficam como atalhos locais. Depois de definir proprietário, elas passam à consulta de viagens próprias.

O seed original permanece sem mudanças. Sua busca global por título pode ser recusada pelas regras mais restritas e aborta sem gravar; não use esse fluxo para reconfigurar uma viagem existente. A inspeção por ID e o seed de programas continuam sujeitos às permissões da viagem. Nenhum seed foi executado nesta entrega.

Formulários comparam campos com a versão de abertura e enviam somente diferenças, inclusive campos aninhados de detalhes. Listeners refletem as mudanças. Edições simultâneas de campos diferentes se preservam; no mesmo campo prevalece a última gravação. Não há resolução de conflito textual ou histórico.

## Ativar Brasília da Mel sem recriar

Depois de publicar regras, índice e frontend:

1. Entre com Google usando sua conta administrativa atual e abra a viagem existente. Link: `/#/viagem/brasilia-da-mel-2026` (use o ID real do link atual se for diferente).
2. Em **••• → Compartilhar**, caso ainda não tenha proprietário, clique **Definir minha conta como proprietária**. A transação altera somente ownerId, access e updatedAt; mantém ID, datas, conteúdo e programas.
3. Selecione **Pelo link · pode editar após login** e clique **Salvar acesso**. Copie o link para Mel.
4. Mel entra com Google. Já pode adicionar, editar e excluir programas. Em Compartilhar, **Participar da viagem** registra seu vínculo permanente.
5. Se quiser que só vocês dois tenham acesso, após Mel participar, selecione **Compartilhada · somente colaboradores**. O mesmo link e a mesma viagem continuam funcionando.

Não execute `seed:mel`, não recrie documentos nem remova a viagem.

## Verificação local reproduzível

Na pasta `outputs/rumo`, com Node, dependências e Java instalados:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --configLoader runner
npm.cmd run build -- --configLoader runner
firebase.cmd emulators:exec --config firebase.emulator.json --project demo-rumo-local --only firestore "npm run test:rules"
```

O teste de regras usa exclusivamente `127.0.0.1:8089` e `demo-rumo-local`, sem configuração do .env. O projeto demo não aponta para produção. Nesta máquina foi executado diretamente o JAR já instalado, com locale inglês, para evitar erro de mensagens Java em pt_BR:

```powershell
java '-Duser.language=en' '-Duser.country=US' -jar "$env:USERPROFILE\.cache\firebase\emulators\cloud-firestore-emulator-v1.21.0.jar" --host 127.0.0.1 --port 8089 --project_id demo-rumo-local --rules firestore.rules
# Em outro terminal, na mesma pasta:
npm.cmd run test:rules
```

Resultados: 99 testes de aplicação, 92 verificações de regras no emulador, lint, TypeScript e build. O build mantém o aviso preexistente do chunk Firestore acima de 500 kB. Nenhuma validação foi feita em contas de produção.

## Publicação — comandos para o usuário, não executados

Revise `firestore.rules`, `firestore.indexes.json` e o diff. Confira que .env e secrets do workflow pertencem exclusivamente a **rumos-bsb**, com VITE_DEMO_MODE=false, e que Google/domínio do site já estão autorizados. Não há necessidade de novas credenciais no código.

Após revisão, publique primeiro o índice e aguarde ficar pronto no console Firestore:

```powershell
firebase.cmd login
firebase.cmd deploy --project rumos-bsb --only "firestore:indexes"
```

Na janela de publicação do aplicativo, publique as regras revisadas:

```powershell
firebase.cmd deploy --project rumos-bsb --only "firestore:rules"
```

A interface é publicada pelo workflow existente **Publicar no GitHub Pages**, em push para main ou disparo manual. Não existe Firebase Hosting configurado neste projeto. Para preparar commit e enviar a branch atual:

```powershell
git diff --check
git add firestore.rules firestore.indexes.json firebase.emulator.json scripts/test-rules.mjs src COLABORACAO.md README.md
git diff --cached --stat
git commit -m "Adiciona colaboração por viagem com permissões de proprietário e editor"
git push
```

Se estiver em outra branch, revise e integre em main pelo fluxo habitual. Aguarde o workflow concluir. Regras e frontend precisam ser publicados na mesma janela: clientes antigos deixam de fazer consultas administrativas amplas e mudanças de privacidade; a interface nova depende das novas permissões. Só então use os passos de ativação acima. Nenhum comando de publicação migra ou recria documentos de viagem.
