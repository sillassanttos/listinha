# 🛒 Listinha

App de lista de compras para celular, simples, bonito e offline. Feito com Expo (React Native) + TypeScript.
O documento do projeto, com fases, telas e modelo de dados, é o [LISTINHA.md](LISTINHA.md).

## O que já faz (Fase 1 — MVP)

- Lista ativa na tela Início, com progresso, nova lista (levando ou não o que faltou) e histórico.
- Adicionar item com autocompletar (catálogo de 202 produtos + itens já usados) e chips de sugestão rápida.
- Categoria, emoji e unidade automáticos pelo nome (sem acento, plural simples, sinônimos).
- Itens agrupados por categoria na ordem dos corredores; +/− com passo por unidade; editar item; deslizar para excluir com "Desfazer".
- Modo Mercado: tela ligada, tocar para marcar como pego (vibração, riscado, seção "No carrinho"), contador "Faltam X".
- Compra concluída 🎉, histórico de compras e compartilhar a lista como texto (WhatsApp).
- Tudo salvo no celular, offline; "Limpar dados" nas Configurações.

## Fase 2 — Inteligência

- **Repetir última compra** e **sugestões por frequência** ("Costuma comprar" na lista, "Pode estar acabando" no Início).
- **Importar do WhatsApp:** cola um texto e cada linha vira item, com quantidade e unidade quando houver.
- **Fotos online** do Open Food Facts para itens fora do catálogo (guardadas no celular; dá para desligar).
- **Preço e total** do carrinho no Modo Mercado e **orçamento** com alerta ao estourar.
- **Ordem dos corredores** escolhida nas Configurações.
- **Categoria lembrada:** a categoria trocada à mão vale para as próximas vezes.
- **Despensa / "Acabou":** em casa, marca o que terminou e o item vai para a próxima lista.

## Como rodar no celular

1. Instale o **Expo Go** no celular (Play Store / App Store) e deixe-o atualizado: o projeto usa o **Expo SDK 58**.
2. No PC, na pasta do projeto:

   ```powershell
   npm install
   npx expo start
   ```

3. Leia o QR code com o Expo Go (no Android, pelo próprio app; no iPhone, pela câmera).
4. Se o celular não conectar (redes diferentes ou firewall), use `npx expo start --tunnel`.

Na primeira vez, o Windows pode pedir para liberar o Node no firewall: libere para redes privadas.

Neste PC, o PowerShell bloqueia scripts `.ps1`, e por isso `npx` e `npm` dão erro de "execução de scripts desabilitada".
Use `npx.cmd expo start` e `npm.cmd install`, sem mudar a política do Windows.

## Comandos úteis

| Comando | Para quê |
|---|---|
| `npx expo start` | Servidor de desenvolvimento (QR code) |
| `npm run typecheck` | Conferência de tipos do TypeScript |
| `npm test` | Testes automáticos (jest-expo) da lógica em `src/utils` |
| `npx expo-doctor` | Diagnóstico de dependências e configuração |
| `npx expo install <pacote>` | Instalar dependência na versão compatível com o SDK |

## Estrutura

```
app/               rotas (expo-router): início, lista, item, importar, modo mercado, despensa, histórico, configurações
src/components/    componentes reutilizáveis
src/data/          base de produtos e categorias
src/store/         estado global (Zustand + AsyncStorage)
src/utils/         regras puras (categorização, listas, frequência, preço, importar, despensa…) com testes
src/theme/         cores, espaçamentos, fontes
src/types/         tipos do domínio
```
