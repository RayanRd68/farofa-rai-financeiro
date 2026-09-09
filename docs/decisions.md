# Decisões de arquitetura (ADR)

Registro curto das decisões não óbvias. Formato: contexto → decisão →
alternativas → consequência.

---

## ADR-001 — Relatório por período no Resumo + exportação PDF/Excel

**Contexto:** a tela **Resumo** (`app/(app)/page.tsx`) só mostrava os dados de
todos os tempos — não dava pra recortar um mês/intervalo nem levar nada pro
contador. A Rai pediu filtros de período e exportação em PDF e Excel.

**Decisão:**

- **Recorte em `searchParams`** (`?preset=…` ou `?from=…&to=…`), link
  compartilhável; a rota de exportação lê os mesmos parâmetros. Presets:
  `tudo` (padrão — preserva o comportamento atual), `este_mes`, `mes_passado`,
  `30d`, `90d`, `este_ano`. `lib/reports/period.ts#resolveRange` traduz pra
  datas concretas + rótulo pt-BR. Espelha `CRM/lib/reports/sales.ts` (ADR-023 do
  CRM).
- **Agregação em JS, sem RPC/migration.** O financeiro já processa tudo em
  funções puras (`lib/finance.ts`); o dataset é pequeno (centenas de linhas) e a
  RLS (`user_id = auth.uid()`) já escopa as queries. `lib/reports/build.ts`
  monta o relatório reaproveitando `computeTotais`/`computeCategorias`/
  `computeTopClientes` e adiciona `porFormaPagamento`, `porTipoVenda` e `serie`
  (buckets diários se o intervalo ≤ 62 dias, senão mensais). O CRM usa uma RPC
  SQL porque lá o volume é maior e o cálculo já vivia no banco — aqui não.
- **A busca (`lib/reports/data.ts`) filtra por data na query**, e
  `buildFinanceReport` **refiltra** as linhas pelo `range` — a função pura honra
  o período mesmo se receber linhas de fora da janela (defense-in-depth, custo
  desprezível no tamanho do dataset).
- **Exportação:** route handler `GET /api/reports/export?format=xlsx|pdf`
  (`runtime = "nodejs"`, autentica sozinho via `getUser()`, responde JSON no
  erro). `write-excel-file/node` (dep transitiva só `fflate`; 7 abas) e
  `pdf-lib` (JS puro, 0 dependências; classe `Doc` portada de
  `CRM/lib/reports/pdf.ts` com sanitização WinAnsi pra acento/emoji e tabela
  paginada). Nome do arquivo: `financeiro_<from>_a_<to>.<ext>`.
- **Cabeçalho do relatório:** para o preset `tudo`, usa a data real da primeira
  e da última linha (não o sentinel `2000-01-01` de `resolveRange`); não repete
  o intervalo quando o próprio rótulo já é um intervalo (recorte personalizado).

**Alternativas:**

- **RPC SQL + migration** (como o CRM): mais cara de manter e desnecessária pro
  volume; o financeiro é deliberadamente "tudo em JS puro, testável".
- **`exceljs`**: CVEs moderadas na cadeia (`uuid` transitivo). Descartado.
- **PDF via `window.print()`**: sem download direto, depende do diálogo do
  navegador.
- **Só CSV**: pobre pra um relatório com 5 recortes + 2 listas.

**Consequência:**

- 2 dependências novas (`write-excel-file`, `pdf-lib`) — ambas JS puro, 0 CVE.
- `lib/reports/` novo (`period.ts`, `build.ts` puros; `data.ts`, `xlsx.ts`,
  `pdf.ts` com `server-only`).
- `vitest.config.mts` passou a stubar `import "server-only"`
  (`test/stubs/server-only.ts`) — `xlsx.ts`/`pdf.ts` importam isso.
- `getEntradas`/`getSaidas` (`lib/queries.ts`) ganharam um parâmetro opcional
  `Periodo` (`{ from?, to? }`); sem argumento seguem devolvendo tudo.
- `computeMensal`/`anosPresentes` (`lib/finance.ts`) e `components/monthly-chart.tsx`
  saíram — o Resumo agora usa `serie()` + `components/period-chart.tsx`. A
  validação mensal contra a planilha migrou pro teste de `serie()` em
  `lib/finance.test.ts`.

---

## ADR-002 — Relatório financeiro completo nos botões Excel/PDF (amplia o ADR-001)

**Contexto:** o ADR-001 entregou os botões, mas a exportação era basicamente
"as tabelas da tela em arquivo". A Rai pediu um **relatório financeiro de
verdade** pro contador: capa, resumo com ticket médio, listas detalhadas de
vendas e gastos com subtotais, gastos por categoria com % , análise
vendas × gastos com gráfico, e uma seção de resultado. Sem botão novo, sem tela
nova — os mesmos dois botões, respeitando o período selecionado.

**Decisão:**

- **Mesma fonte de verdade.** Tela, PDF e Excel saem todos de
  `getFinanceReport(range)` → `buildFinanceReport`. Os totais
  (`totalEntradas`/`totalSaidas`/`lucro`/`margem`) são idênticos; o relatório
  só formata (`fmtBRL`/`fmtPct`). Não pode haver divergência (requisito da Rai).
- **Sem alteração no banco.** Todas as colunas pedidas já existem em
  `entradas`/`saidas`. Não há campo "Status" em nenhuma das tabelas — a coluna
  foi **omitida** (não inventar dado). RLS por `user_id` intacta.
- **`build.ts` ganhou:** `totais.ticketMedio` (= total de vendas ÷ qtd, 0 sem
  vendas), `categorias[].count` (via `computeCategorias`), `periodo {de, ate}`,
  `geradoEm`, `temMovimento`, `serieUnidade`.
- **Granularidade da série em 3 níveis** (`serie()`): **dia** ≤ 45 dias,
  **semana** ≤ 186 dias (rótulo "dd–dd/MM", segunda a domingo, em UTC),
  **mês** acima. Atende "diário / semanal / mensal" do pedido.
- **`pdf.ts` reescrito** — 7 seções na ordem pedida: capa (página própria) →
  resumo financeiro (4 cards de destaque + indicadores) → vendas do período
  (lista + subtotais) → gastos do período (lista + subtotais) → gastos por
  categoria (qtd + valor + % + linha TOTAL) → análise vendas × gastos (tabela
  + **gráfico de barras** desenhado no `pdf-lib`) → resultado financeiro. A
  classe `Doc` ganhou `cover`/`destaques`/`grafico`/`aviso` e `tabela` com
  linha de rodapé. Rodapé com paginação ("Página X de N") + data de geração em
  todas as páginas. `abrevPgto()` encurta "Cartão de Crédito"/"Boleto/
  Transferência" pras colunas estreitas.
- **`xlsx.ts` reescrito** — 5 abas fixas: **Resumo** (indicadores + período +
  data de geração), **Vendas**, **Gastos**, **Gastos por categoria** (com
  Percentual e TOTAL), **Análise** (Período/Vendas/Gastos/Lucro + TOTAL).
  Colunas 2–5 das abas antigas ("por pagamento", "por tipo") saíram do arquivo
  — o pedido definiu exatamente estas 5 abas (as quebras por forma de pagamento
  e por tipo continuam **na tela**).
- **Período sem dados:** o relatório é gerado normalmente com tudo zerado e um
  aviso "Nenhuma movimentação encontrada no período selecionado." (nunca erro).
- **`fmtPct` passou a 2 casas** ("50,50%") — a tela também, pra bater com o
  relatório (pedido de formatação pt-BR: `XX,XX%`).

**Alternativas:**

- **Gráfico no Excel:** `write-excel-file` não gera gráficos e trocar por
  `exceljs` reintroduz CVEs (ADR-001). A aba **Análise** entrega os dados
  prontos pra "Inserir gráfico" no Excel; o gráfico fica só no PDF.
- **Capa como bloco no topo da página 1** em vez de página própria — página
  própria lê melhor como "documento profissional" e o relatório já tem 2+
  páginas.
- **Manter as 7 abas do ADR-001** — o pedido foi explícito sobre as 5.

**Consequência:**

- `fflate` entrou em `devDependencies` (já era transitivo do `write-excel-file`)
  — os testes inspecionam o `.xlsx` descompactando o zip.
- `CategoriaTotal` agora tem `count` — aditivo, a tela não muda.
- `fmtPct` a 2 casas afeta a margem na tela (stamp) e no card de produto.
- Nome do arquivo: `relatorio-financeiro_<from>_a_<to>.<ext>`.
- Nenhuma mudança no frontend além do `page.tsx` (que já passava o período pros
  botões) — `report-controls.tsx` não mudou.
