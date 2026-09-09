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
