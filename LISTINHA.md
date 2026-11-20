# 🛒 Listinha — Documento do Projeto

> App mobile de lista de compras, simples, bonito e inteligente.
> Este documento é a fonte de verdade do projeto. Leia por inteiro antes de escrever qualquer código.

---

## 1. Visão geral

**Nome do app:** Listinha
**Plataforma:** Mobile (Android primeiro; iOS compatível)
**Tipo:** App híbrido com **Expo (React Native)**
**Idioma da interface:** Português do Brasil

### O problema
Hoje a lista de compras é feita numa conversa do WhatsApp: os itens vão sendo adicionados como mensagens soltas. É chato de ler e reler, não tem organização, não dá para marcar o que já foi pego e a lista precisa ser refeita toda semana (as compras acontecem 1 a 2 vezes por semana, quase sempre com os mesmos itens).

### A solução
Um app de lista de compras que:
- facilita **montar a lista rápido** (sugestões, autocompletar, repetir a lista anterior);
- mostra cada item com **imagem/emoji** para ficar visual e agradável;
- organiza os itens por **categoria** automaticamente;
- tem um **Modo Mercado** pensado para usar com uma mão, andando entre os corredores;
- funciona **100% offline**.

---

## 2. Princípios do projeto

1. **Rapidez acima de tudo:** adicionar um item deve levar no máximo 2 toques ou poucas letras digitadas.
2. **Offline-first:** tudo fica salvo no celular. No mercado o sinal costuma ser ruim, e o app não pode depender de internet para funcionar.
3. **Visual agradável:** cada item tem um emoji ou imagem; cores suaves por categoria; animações sutis.
4. **Zero configuração no PC:** nada de Android Studio ou emuladores. O teste é feito direto no celular pelo **Expo Go**.
5. **Compatível com Expo Go:** usar **apenas** bibliotecas que rodam no Expo Go (SDK do Expo). Nada de módulos nativos customizados nesta fase.
6. **Evolução por fases:** entregar um MVP funcional primeiro e evoluir depois.

---

## 3. Stack tecnológica

| Área | Tecnologia |
|---|---|
| Framework | **Expo** (SDK estável mais recente) + **React Native** |
| Linguagem | **TypeScript** |
| Navegação | **expo-router** (rotas baseadas em arquivos) |
| Estado global | **Zustand** |
| Persistência local | **@react-native-async-storage/async-storage** (via `persist` do Zustand) |
| Ícones | **@expo/vector-icons** |
| Vibração ao marcar item | **expo-haptics** |
| Tela sempre ligada (Modo Mercado) | **expo-keep-awake** |
| Imagens | **expo-image** (com cache) |
| Compartilhar texto | **Share API** do React Native |
| Gestos (arrastar/deslizar) | **react-native-gesture-handler** + **react-native-reanimated** |
| Build de APK (futuro) | **EAS Build** (na nuvem, sem instalar nada) |

> Observação: o Expo usa JSX e um sistema de estilos parecido com CSS (StyleSheet), não HTML/CSS puro.

### Como rodar e testar
1. Ter o **Node.js** instalado no PC (único requisito).
2. Instalar o app **Expo Go** no celular (Play Store / App Store).
3. Na pasta do projeto: `npx expo start`
4. Ler o QR code com o Expo Go. O app abre no celular e atualiza sozinho a cada alteração no código.
5. Se o celular e o PC não estiverem na mesma rede, usar `npx expo start --tunnel`.

---

## 4. Estratégia de imagens dos itens

Buscar uma imagem na internet a cada item é instável (limites de API, qualidade variável, falta de sinal no mercado). Por isso, usar **3 camadas**, nesta ordem de prioridade:

1. **Emoji** (camada base): cada item da base de produtos tem um emoji (🥚 🍚 ☕ 🧄 🍌 🧼). Aparece na hora e funciona offline.
2. **Imagens locais** (opcional no MVP): ícones/ilustrações empacotados no app para os itens mais comuns, todos no mesmo estilo visual.
3. **Busca online** (Fase 2): para itens fora da base, buscar no **Open Food Facts** (gratuito, sem chave de API, com bastante produto brasileiro). A imagem encontrada é **salva em cache** no celular e associada ao nome do item, para não buscar de novo.
4. **Fallback:** se nada for encontrado, mostrar o emoji/ícone da **categoria** (ex.: 🛒 genérico, 🧴 para higiene).

---

## 5. Categorias

Categorias padrão, cada uma com emoji e cor própria:

| Categoria | Emoji | Exemplos |
|---|---|---|
| Hortifrúti (frutas, verduras e legumes) | 🥬 | banana, tomate, alho, cebola, alface |
| Mercearia | 🍚 | arroz, feijão, açúcar, café, trigo, óleo, macarrão |
| Padaria | 🍞 | pão francês, pão de forma, bolo |
| Laticínios e frios | 🧀 | leite, queijo, presunto, iogurte, manteiga |
| Carnes e ovos | 🥩 | frango, carne moída, linguiça, ovos |
| Bebidas | 🥤 | água, refrigerante, suco, cerveja |
| Limpeza | 🧽 | detergente, sabão em pó, desinfetante, esponja |
| Higiene pessoal | 🧴 | sabonete, pasta de dente, papel higiênico, shampoo |
| Congelados | 🧊 | sorvete, pizza congelada, hambúrguer |
| Pet | 🐾 | ração, areia |
| Outros | 🛒 | qualquer item sem categoria definida |

- A **categoria é atribuída automaticamente** pelo nome do item, usando a base de produtos (dicionário com sinônimos e variações, sem diferenciar maiúsculas/minúsculas e acentos).
- O usuário pode **trocar a categoria** de um item manualmente, e o app **lembra** essa escolha para as próximas vezes.
- O usuário pode **reordenar as categorias** para seguir a ordem dos corredores do seu mercado.

---

## 6. Base de produtos (catálogo de sugestões)

Criar um arquivo de dados (ex.: `src/data/produtos.ts`) com **pelo menos 150 itens comuns** do dia a dia brasileiro. Estrutura sugerida:

```ts
type ProdutoBase = {
  id: string;            // "arroz"
  nome: string;          // "Arroz"
  sinonimos?: string[];  // ["arroz branco", "arroz tipo 1"]
  categoria: CategoriaId;
  emoji: string;         // "🍚"
  unidadePadrao?: Unidade; // "kg"
};
```

**Sugestões rápidas iniciais** (chips na tela de adicionar): arroz, feijão, leite, café, pão, trigo, açúcar, óleo, ovos, sal, macarrão, manteiga, banana, tomate, cebola, alho, batata, frango, detergente, papel higiênico, sabonete, pasta de dente.

---

## 7. Modelo de dados

```ts
type Unidade = "un" | "kg" | "g" | "L" | "ml" | "dz" | "pct" | "cx";

type ItemLista = {
  id: string;
  nome: string;
  categoria: CategoriaId;
  emoji: string;
  imagemUri?: string;     // cache local (Fase 2)
  quantidade: number;     // padrão 1
  unidade: Unidade;       // padrão "un"
  pego: boolean;          // marcado no mercado
  preco?: number;         // Fase 2
  observacao?: string;    // ex.: "integral", "marca X"
  criadoEm: number;
  pegoEm?: number;
};

type Lista = {
  id: string;
  nome: string;           // ex.: "Compra da semana"
  itens: ItemLista[];
  criadaEm: number;
  finalizadaEm?: number;  // ao concluir a compra, vai para o histórico
};

type HistoricoItem = {    // usado para sugestões por frequência (Fase 2)
  nomeNormalizado: string;
  vezesComprado: number;
  ultimaCompra: number;
  categoriaPreferida?: CategoriaId;
  ultimoPreco?: number;
};
```

---

## 8. Telas

### 8.1 Início (Minhas listas)
- Lista ativa em destaque com progresso (ex.: "8 de 15 itens").
- Botão **"Nova lista"**.
- Botão **"Repetir última compra"** (Fase 2).
- Acesso ao histórico de listas finalizadas.

### 8.2 Lista (edição)
- Itens agrupados por categoria (cabeçalho com emoji + nome + contador).
- Cada item mostra: emoji/imagem, nome, quantidade + unidade, observação.
- Campo de adicionar fixo no topo ou no rodapé, com **autocompletar** a partir da base de produtos e do histórico.
- **Chips de sugestão** rápida abaixo do campo (some o que já está na lista).
- Botões **+ / −** para quantidade direto no item.
- **Deslizar para excluir**, com opção de **desfazer** (snackbar por ~4 s).
- Tocar no item abre um detalhe para editar nome, quantidade, unidade, categoria e observação.
- Botão para entrar no **Modo Mercado**.
- Botão **Compartilhar** (gera texto formatado para WhatsApp).

### 8.3 Modo Mercado
- **Tela sempre ligada** (expo-keep-awake).
- Fonte maior e áreas de toque grandes (uso com uma mão).
- **Tocar no item = marcar como pego**: vibração leve (expo-haptics), animação, texto riscado e o item desce para o fim da categoria (ou para uma seção "No carrinho").
- Contador no topo: **"Faltam 7 itens"** e barra de progresso.
- Desfazer ao marcar sem querer.
- Ao terminar: tela de **"Compra concluída 🎉"** com opção de finalizar a lista (vai para o histórico) e de mover os itens não comprados para a próxima lista.
- Fase 2: ao marcar, campo opcional para digitar o **preço**, com **total do carrinho** em tempo real.

### 8.4 Configurações
- Reordenar categorias (ordem dos corredores).
- Unidade padrão.
- Limpar dados / exportar backup (texto/JSON).

---

## 9. Funcionalidades por fase (quadro de desenvolvimento)

### ✅ Fase 1 — MVP
- [x] Setup do projeto: Expo + TypeScript + expo-router + Zustand + AsyncStorage
- [x] Tema visual (cores, tipografia, cores por categoria)
- [x] Base de produtos com 150+ itens, categorias, emojis e sinônimos
- [x] Categorização automática pelo nome (busca normalizada, sem acento)
- [x] Tela Início com lista ativa e criação de nova lista
- [x] Tela Lista: adicionar item com autocompletar e chips de sugestão
- [x] Agrupamento por categoria
- [x] Quantidade e unidade (+ / −)
- [x] Editar item (nome, quantidade, unidade, categoria, observação)
- [x] Excluir item com deslizar + desfazer
- [x] Modo Mercado: marcar como pego, vibração, riscado, contador, tela ligada
- [x] Tela "Compra concluída" e histórico de listas
- [x] Compartilhar lista como texto (WhatsApp)
- [x] Persistência local completa (fechar e abrir o app mantém tudo)

### 🚀 Fase 2 — Inteligência e praticidade
- [x] **Repetir última compra** com um toque
- [x] **Sugestões por frequência** ("faz 12 dias que você não compra café")
- [x] **Importar do WhatsApp**: colar texto e separar um item por linha (removendo marcadores como "-", "•", números)
- [x] **Imagens online** via Open Food Facts com cache local
- [x] **Preço por item e total do carrinho** no Modo Mercado
- [x] Orçamento opcional com alerta ao ultrapassar
- [x] Reordenar categorias pela ordem dos corredores
- [x] Lembrar a categoria escolhida manualmente para cada item
- [x] Modo **Despensa / "Acabou"**: marcar em casa o que terminou para entrar na próxima lista

### 🌟 Fase 3 — Recursos avançados
- [x] **Lista compartilhada em tempo real** com a família (backend gratuito: Supabase ou Firebase), com login simples
- [ ] **Leitor de código de barras** (expo-camera) + Open Food Facts para preencher nome e foto
- [ ] **Histórico de preços** e gráfico de variação por produto
- [ ] Várias listas simultâneas (ex.: mercado, farmácia, feira)
- [ ] Modo escuro
- [ ] Build de APK com **EAS Build** e, se desejar, publicação na Play Store

---

## 10. Estrutura de pastas sugerida

```
listinha/
├── app/                      # rotas (expo-router)
│   ├── _layout.tsx
│   ├── index.tsx             # Início
│   ├── lista/[id].tsx        # Lista (edição)
│   ├── mercado/[id].tsx      # Modo Mercado
│   ├── historico.tsx
│   └── configuracoes.tsx
├── src/
│   ├── components/           # ItemCard, CategoriaHeader, CampoAdicionar, ChipSugestao...
│   ├── data/
│   │   ├── produtos.ts       # base de produtos
│   │   └── categorias.ts     # categorias, emojis, cores, ordem padrão
│   ├── store/
│   │   └── useListaStore.ts  # Zustand + persist
│   ├── utils/
│   │   ├── normalizar.ts     # remover acentos, minúsculas, singular/plural simples
│   │   ├── categorizar.ts    # encontra produto/categoria pelo nome
│   │   └── compartilhar.ts   # gera texto da lista
│   ├── theme/
│   │   └── index.ts          # cores, espaçamentos, fontes
│   └── types/
│       └── index.ts
├── assets/
├── app.json
├── package.json
├── tsconfig.json
└── LISTINHA.md               # este documento
```

---

## 11. Diretrizes de design

- Visual **limpo, amigável e colorido sem exagero**; cantos arredondados; bastante espaço em branco.
- Cada categoria tem uma **cor suave** usada no cabeçalho e numa faixa lateral do item.
- Emoji grande (≈ 28–32 px) à esquerda de cada item.
- Áreas de toque com no mínimo **48 px** de altura.
- Animações curtas (150–250 ms) ao adicionar, marcar e remover itens.
- Feedback sempre visível: vibração ao marcar, snackbar ao excluir, estado vazio ilustrado ("Sua listinha está vazia 🛒 — que tal começar pelo café?").
- Tom de voz leve e brasileiro nos textos da interface.

### Formato do texto compartilhado (exemplo)
```
🛒 Listinha — Compra da semana

🍚 Mercearia
• Arroz — 5 kg
• Café — 2 pct

🥬 Hortifrúti
• Alho — 1 un
• Banana — 1 dz
```

---

## 12. Regras para o desenvolvimento (para o Claude Code)

1. Trabalhar **fase por fase**, e dentro da fase, **uma funcionalidade por vez**, mantendo o app sempre rodando no Expo Go.
2. Ao final de cada etapa, explicar **como testar no celular** o que foi feito.
3. Usar **somente bibliotecas compatíveis com o Expo Go**; instalar dependências com `npx expo install` (garante versões compatíveis com o SDK).
4. Código em **TypeScript**, componentes pequenos e reutilizáveis, nomes em português quando se referirem ao domínio (lista, item, categoria).
5. Não introduzir backend, login ou serviços pagos antes da Fase 3.
6. Atualizar os checkboxes da seção 9 deste documento conforme as tarefas forem concluídas.
7. Em caso de dúvida sobre comportamento ou design, **perguntar antes** de implementar algo grande.
