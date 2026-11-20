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

## Fase 3 — Recursos avançados (em andamento)

- **Lista compartilhada em tempo real** com a família (Supabase, login por código no e-mail). Veja abaixo.
- **Várias listas ao mesmo tempo** (mercado, farmácia, feira…): todas aparecem no Início; o que entra pela Despensa, pelo leitor ou pelos lembretes vai para a lista aberta por último (dá para trocar). Menu ⋮ da lista: renomear, arquivar ou excluir. Cada lista pode ter o seu código da família.
- **Ditar a lista**: no campo da lista, toque em "Ditar" e use o microfone do teclado; fale "sabão em pó feijão café maçã" e o Listinha separa os itens (pergunta antes de adicionar).
- **Modo escuro**: em Configurações → Aparência, escolha Automático (segue o celular), Claro ou Escuro.
- **Histórico de preços:** em Início → Preços, cada produto com o último preço, quanto subiu ou baixou e um gráfico compra a compra.
- **Leitor de código de barras:** na Lista, "Ler código de barras" abre a câmera; o nome e a foto vêm do Open Food Facts. Código desconhecido: digite o nome uma vez e o app lembra.

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

## Compartilhar com a família (Supabase, Fase 3)

Opcional: sem isso, o app funciona normalmente, só no celular. Para dividir a lista, crie uma vez um projeto
gratuito no Supabase:

1. Em [supabase.com](https://supabase.com), crie a conta e um **New project** (nome `listinha`, região
   **South America (São Paulo)**). A senha do banco que ele pede não é usada pelo app: guarde num cofre.
2. **SQL Editor → New query**: cole todo o [supabase/esquema.sql](supabase/esquema.sql) e clique em **Run**.
   Deve aparecer "Success". Pode rodar de novo sem perder dados.
3. **E-mail do código.** O Supabase só deixa editar os modelos com um **SMTP próprio**, e o envio padrão dele só
   entrega para quem é da equipe do projeto. Então:
   - **Authentication → Emails → SMTP Settings**: ligue *Enable custom SMTP* com o Gmail (`smtp.gmail.com`,
     porta 587, usuário = seu Gmail, senha = uma **senha de app** criada em myaccount.google.com/apppasswords,
     que exige a verificação em 2 etapas). Quem digita a senha é você.
   - **Sign In / Providers → Email**: *Email OTP length* = **6**. O padrão novo do Supabase é 8.
   - **Authentication → Emails → Templates**: nos modelos **Magic Link** e **Confirm signup**, troque o
     assunto para `Seu código do Listinha: {{ .Token }}` e o corpo para mostrar o código, por exemplo:

   ```html
   <h2>Seu código do Listinha</h2>
   <p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p>
   <p>Digite esse código no app. Ele vale por pouco tempo.</p>
   ```

4. **Project Settings → API Keys** (ou o botão **Connect**): copie a **Project URL** e a chave **publishable**
   (ou a "anon"). Copie o `.env.example` para `.env` e preencha. **Nunca use a chave secret/service_role.**
5. Reinicie o Metro com `npx.cmd expo start -c`. No app, entre em **Configurações → Conta**.

Com o SMTP próprio, o limite padrão é de 30 e-mails por hora (ajustável em Rate Limits). No plano grátis, o
projeto pausa depois de 7 dias sem uso. Para reativar, use o painel do Supabase.

Quando o `supabase/esquema.sql` mudar (por exemplo, a coluna `concluida_em` da etapa 3), rode o arquivo de novo
no SQL Editor. Ele não apaga dados.

### Como a família usa

- **Família → Compartilhar**: a lista ativa ganha um código de 6 letras e números. Use **Enviar convite** para
  mandar pelo WhatsApp.
- A outra pessoa entra com o e-mail dela e vai em **Família → Entrar com código**. Se ela já tiver uma lista,
  escolhe entre juntar as duas ou guardar a dela no histórico.
- Tudo sincroniza na hora: adicionar, quantidade, marcar no mercado, preço e orçamento. Sem sinal, as mudanças
  ficam guardadas e sobem quando a conexão voltar, mesmo que o app seja fechado.
- **Concluir a compra** vale para todos: a compra vai para o histórico de cada pessoa e a lista da família
  continua, com o mesmo código.
- **Parar de compartilhar** deixa a lista só neste celular.

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
src/store/         estado global (Zustand + AsyncStorage) e sessão do login
src/lib/           cliente do Supabase (Fase 3) e regras do login
supabase/          esquema do banco da lista compartilhada (rodar no SQL Editor)
src/utils/         regras puras (categorização, listas, frequência, preço, importar, despensa…) com testes
src/theme/         cores, espaçamentos, fontes
src/types/         tipos do domínio
```
