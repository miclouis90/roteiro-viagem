# Validação da entrega

Executado em 20/09/2026:

- `npm install`: concluído, lockfile gerado.
- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou, sem avisos de tamanho após divisão dos módulos.
- `npm test -- --configLoader runner`: 6 testes passaram. O loader alternativo foi necessário por uma restrição de leitura do esbuild no ambiente isolado desta sessão.
- Prévia do build em `http://127.0.0.1:5182`: verificada no navegador.
- Cadastro de programa de teste (R$25 × 3 pessoas): total aumentou de R$696 para R$771.
- Edição do nome e recarga: alteração persistida na demonstração.
- Exclusão com confirmação: programa removido e total restaurado a R$696.
- Calendário e filtros combinados Museu + Gratuitas: resultado correto.
- Nova viagem em Lisboa: salva; ao alternar para visitante, viagem privada bloqueada.
- Viagem e programa temporários removidos; exemplo original preservado.
- Visualização desktop e mobile em 390 × 844: conferidas visualmente; navegação inferior e formulários responsivos.
- Console do navegador: sem erros capturados no fluxo verificado.

Não verificado com uma conta real: OAuth Google, permissões executadas no servidor Firestore, persistência remota e publicação GitHub Pages. São necessários os dados de configuração e acesso às contas escolhidas. As regras foram implementadas, mas não executadas em um emulador nesta entrega.

O servidor de desenvolvimento tentou iniciar, porém o esbuild encontrou uma restrição de leitura da pasta ancestral imposta pelo ambiente isolado. A prévia usa o build de produção validado. Isso não foi causado por erro de TypeScript ou de build do projeto.
