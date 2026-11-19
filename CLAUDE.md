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
- **Verificação antes de entregar:** `npm run typecheck`, `npm test` (jest-expo; 106 testes em 19/11/2026), `npx expo-doctor` e `npx expo export --platform android --output-dir <scratchpad>` (prova que o bundle compila). O teste final é sempre no celular, pelo Expo Go.
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
