# Listinha

<!-- REGRAS-GERAIS:INICIO (bloco mantido pelo Claude; para mudar, altere D:\Desenvolvimento\CLAUDE.md e rode D:\Desenvolvimento\Ferramentas\claude-regras\aplicar-regras-projetos.ps1) -->
## Regras gerais (obrigatórias)

Este projeto segue `D:\Desenvolvimento\CLAUDE.md`, carregado sozinho em toda conversa aberta em `D:\Desenvolvimento` (só o Claude pessoal; não vale para o Claude corporativo no C:). O que vem depois deste bloco é específico do projeto e só acrescenta regras; em conflito, valem as regras gerais.

- **Idioma:** português do Brasil em tudo (respostas, documentos, commits e PRs).
- **Tecnologia:** Expo SDK 58 (React Native 0.88) + TypeScript, expo-router, Zustand + AsyncStorage; testado só no Expo Go.
- **ACBr:** não usa.
- **Ferramentas e bibliotecas:** procurar no C: e em `D:\Desenvolvimento\Ferramentas`; o que faltar entra lá em versão portátil; bibliotecas compartilhadas ficam em `D:\Desenvolvimento\Componentes`; nada disso dentro do projeto.
- **Web:** validar no navegador padrão do usuário (Chrome); o login é com o usuário.
- **Migração da VM para o PC físico:** não se aplica (projeto novo, criado no PC físico em 19/11/2026). Ainda não está na lista do `aplicar-regras-projetos.ps1`, então este bloco foi escrito à mão.
<!-- REGRAS-GERAIS:FIM -->

## Específico do projeto

- **Fonte de verdade:** `LISTINHA.md`. Ler antes de qualquer tarefa e marcar os checkboxes da seção 9 ao concluir cada uma.
- **Uma funcionalidade por vez**, na ordem da seção 9. Ao final de cada etapa, explicar como testar no celular.
- **Só bibliotecas do Expo Go**, instaladas com `npx expo install`. Nada de módulo nativo customizado, backend ou login antes da Fase 3.
- **Rotas em `app/` na raiz** (como pede a seção 10 do `LISTINHA.md`), não em `src/app/` como sugere o `AGENTS.md` do template. Código fora das rotas fica em `src/` e é importado com o alias `@/` (`@/store/useListaStore`).
- **Node:** o Node 26 do C: funciona (typecheck, expo-doctor e export do bundle passaram em 19/11/2026). Se der problema, usar o Node 24 portátil (`D:\Desenvolvimento\Ferramentas\usar-node24.ps1`).
- **Verificação antes de entregar:** `npm run typecheck`, `npm test` (jest-expo; 203 testes em 19/11/2026), `npx expo-doctor` e `npx expo export --platform android --output-dir <scratchpad>` (prova que o bundle compila). O teste final é sempre no celular, pelo Expo Go.
- **PowerShell deste PC bloqueia `.ps1`:** use `npx.cmd` e `npm.cmd`.
- **Persistência:** Zustand `persist` na chave `listinha-store` do AsyncStorage, versão em `VERSAO_DADOS` (`src/store/persistencia.ts`). Todo dado lido passa por `sanearDados`; ao mudar o formato, suba a versão e acrescente o passo em `migrarDados`, com teste. O `_layout` só mostra as telas depois da reidratação (`useHidratado`).
- **Vibração:** use `src/utils/vibrar.ts`. No Android o `impactAsync` leve do expo-haptics não foi sentido no celular do usuário (19/11/2026); lá usamos `Vibration.vibrate` do React Native, e no iOS o haptics.
- **Gestos:** react-native-gesture-handler 3.x (API nova; o deslizar usa `react-native-gesture-handler/ReanimatedSwipeable`) com reanimated 4 + worklets. O `app/_layout.tsx` envolve tudo em `GestureHandlerRootView`. Depois de instalar pacote nativo, reinicie o Metro com `npx.cmd expo start -c`.
- **Testes:** ficam em `src/**/__tests__/`, fora de `app/` (senão viram rotas). Com TypeScript 6 os globais do jest não são carregados sozinhos: importe `describe`, `it` e `expect` de `@jest/globals`.
- **`react-dom` fixo em 19.3.0** (versão do SDK, via `npx expo install react-dom`): sem ele, qualquer `npm install` tenta o `react-dom` 19.3.1 (dependência opcional do expo-router), que exige React 19.3.1, e falha com ERESOLVE.

### Decisões tomadas com o usuário (19/11/2026)

1. Só uma lista ativa por vez. Ao criar outra, perguntar se quer finalizar a atual (vai para o histórico) e levar os itens não comprados.
2. No Modo Mercado, o item marcado vai para uma seção **"No carrinho"** no final.
3. Configurações na Fase 1: só a rota com "Limpar dados"; o resto fica para a Fase 2.
4. Projeto na raiz desta pasta; trabalho na branch `fase1-mvp`; commit, push e PR só quando o usuário pedir.

### Andamento

- Fase 1 (MVP) mesclada na `main` em 19/11/2026 (PR #1, commit de merge — formato a manter nos próximos PRs).
- Fase 2 na branch `fase2-inteligencia`, uma funcionalidade por vez na ordem da seção 9.
- "Repetir última compra": usa a compra finalizada mais recente; sem lista ativa cria uma com o nome dela, com lista ativa só acrescenta o que ainda não está (não soma quantidades); preço não é copiado.
- "Sugestões por frequência" (`src/utils/frequencia.ts`): calculadas na hora a partir do histórico (itens pegos), sem gravar o `HistoricoItem`. Contam compras em dias diferentes; precisa de 2 ou mais. "Atrasado" = dias desde a última ≥ intervalo médio (≥ 1 dia). Chips "Costuma comprar" na tela Lista e cartão "Pode estar acabando" (até 3) no Início.
- "Importar do WhatsApp" (`src/utils/importar.ts`, tela `app/importar.tsx`): uma linha por item, vírgula e ponto e vírgula também separam (menos em "1,5"); tira marcadores e o cabeçalho de mensagens exportadas; entende quantidade/unidade ("2 kg de arroz", "leite x3", "arroz 5kg") e lê o próprio texto que o Listinha compartilha. Itens já na lista não duplicam.
- "Imagens online" (`src/utils/imagens.ts`, `src/store/useBuscarImagens.ts`, `src/components/ItemImagem.tsx`): busca nova do Open Food Facts (`search.openfoodfacts.org/search`, sem chave). A antiga (`cgi/search.pl`) deu HTTP 503 já na 2ª busca seguida em 19/11/2026 — não usar. Só itens fora do catálogo (nome que não é exatamente produto/sinônimo); exige todas as palavras do item no nome do produto e prefere `en:brazil`. Endereço da foto no store (`imagens`, salvo; "sem foto" tenta de novo após 30 dias; erro de rede não é salvo), arquivo no cache de disco do expo-image (`cachePolicy="disk"` + `Image.prefetch`). Opção "Buscar fotos na internet" nas Configurações. User-Agent `Listinha/1.0` sem e-mail.
- "Preço e total" (`src/utils/preco.ts`): `preco` é o da etiqueta, por unidade de venda; total do item = preço × quantidade, e para g/ml o preço é por kg/L (divide por 1000). Total do carrinho soma só itens pegos com preço. Preço opcional: "Preço" no aviso ao marcar ou "+ R$" no item pego; sugere o último preço do histórico (mesma unidade de preço). Dinheiro formatado sem Intl (`formatarReais`).
- "Orçamento": campo `orcamento` na `Lista` (opcional, não passa para a próxima lista nem é copiado ao repetir). No Modo Mercado: "💰 Definir orçamento", barra verde/laranja (≥ 90%)/vermelha (passou) e alerta com vibração + aviso só na passagem para "estourou" (não ao abrir a tela já estourado).
- "Categoria lembrada" (`src/utils/categoriasManuais.ts`): `categoriasManuais` no store (salvo; chave = `chaveBusca` do nome). Gravada ao salvar a edição do item só quando difere da automática (`categorizar`); escolher de volta a automática esquece. Vale ao digitar, importar e repetir compra (parâmetro `manuais` de `adicionarNaLista`, `adicionarImportados` e `repetirCompra`); itens que já estão na lista não mudam. Produto do catálogo mantém o emoji dele; item livre usa o da categoria. "Esquecer escolhas" nas Configurações; "Limpar dados" também apaga.
- "Ordem dos corredores": `ordemCategorias` no store (salva, saneada por `sanearOrdemCategorias`: categoria nova entra no fim). Reordenar com ↑/↓ nas Configurações (sem arrastar, para não depender de outra biblioteca). Toda tela que agrupa por categoria (Lista, Mercado, edição do item, texto compartilhado) deve passar essa ordem, nunca `ORDEM_CATEGORIAS` direto.
- "Despensa / Acabou" (`src/utils/despensa.ts`, tela `app/despensa.tsx`, entrada no Início): itens da casa = todo item que já entrou numa compra finalizada (um por `chaveBusca`, dados da compra mais recente); "Pode estar acabando" no topo (frequência atrasada), o resto por corredor na `ordemCategorias`. "Acabou" usa `importarItens` (vai para a lista ativa, que é a próxima compra; sem lista ativa cria "Compra da semana"), com quantidade e unidade da última compra e a categoria lembrada. Não há fila separada nem dado novo salvo. "Na lista" tira o item (com Desfazer). Dá para digitar algo que nunca foi comprado.
- Avisos entre telas: `avisoPendente` no store (não é salvo) — a tela Lista mostra e limpa.
- Para testar sem esperar dias: Configurações → "Gerar histórico de exemplo" (só em `__DEV__`, `src/data/exemplo.ts`).
