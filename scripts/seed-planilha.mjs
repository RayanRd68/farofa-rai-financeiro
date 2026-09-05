/**
 * Gera `seed-planilha.sql` a partir de `planilha3-clean.json` (dados reais
 * extraídos de Farofa_da_Rai_Controle_Financeiro_3.xlsx, jun–ago/2026).
 *
 * Uso:  node scripts/seed-planilha.mjs <user_id>
 *
 * O <user_id> é o id em auth.users da conta da Rai (pega-se depois que ela
 * cadastra). O SQL é IDEMPOTENTE: PK determinística md5(user_id|tabela|idx) +
 * "on conflict do nothing". Aplicado ao Supabase via MCP execute_sql.
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const userId = process.argv[2]
if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
  console.error("uso: node scripts/seed-planilha.mjs <user_id-uuid>")
  process.exit(1)
}

const data = JSON.parse(readFileSync(join(HERE, "planilha3-clean.json"), "utf8"))

const q = (s) =>
  s === null || s === undefined || s === "" ? "null" : `'${String(s).replace(/'/g, "''")}'`
const money = (n) => (Math.round(Number(n) * 100) / 100).toFixed(2)
const id = (tabela, idx) => `md5('${userId}|${tabela}|${idx}')::uuid`

const entradas = data.entradas
  .map((e, i) => {
    const cliente = (e.cliente ?? "").trim()
    return `  (${id("entrada", i)}, '${userId}', ${q(e.data)}::date, ${q(cliente || null)}, ${q(e.produto || "Farofa Tradicional")}, ${q(e.tipoVenda)}, ${Number(e.qtd) || 0}, ${money(e.valorUnitario)}, ${money(e.valorTotal)}, ${q(e.formaPagamento || null)}, ${q(e.obs || null)})`
  })
  .join(",\n")

const saidas = data.saidas
  .map((s, i) => {
    const forn = (s.fornecedor ?? "").trim()
    return `  (${id("saida", i)}, '${userId}', ${q(s.data)}::date, ${q(s.categoria)}, ${q(String(s.descricao).trim())}, ${q(forn || null)}, ${money(s.valor)}, ${q(s.formaPagamento || null)}, ${q(s.obs || null)})`
  })
  .join(",\n")

const produtos = data.produtos
  .map(
    (p, i) =>
      `  (${id("produto", i)}, '${userId}', ${q(p.produto)}, ${money(p.custoProducao)}, ${money(p.precoClienteFinal)}, ${money(p.precoRevenda)})`
  )
  .join(",\n")

const totEnt = data.entradas.reduce((s, e) => s + Number(e.valorTotal), 0)
const totSai = data.saidas.reduce((s, e) => s + Number(e.valor), 0)

const sql = `-- =============================================================================
-- Seed — planilha da Farofa da Rai (jun–ago/2026).
-- Gerado por scripts/seed-planilha.mjs — NÃO editar à mão.
-- ${data.entradas.length} vendas (R$ ${totEnt.toFixed(2)}) · ${data.saidas.length} gastos (R$ ${totSai.toFixed(2)}) · ${data.produtos.length} produto
-- user_id: ${userId}
-- Idempotente: PK md5(user_id|tabela|idx) + on conflict do nothing.
-- =============================================================================

insert into public.produtos
  (id, user_id, produto, custo_producao, preco_cliente_final, preco_revenda)
values
${produtos}
on conflict (id) do nothing;

insert into public.entradas
  (id, user_id, data, cliente, produto, tipo_venda, qtd, valor_unitario, valor_total, forma_pagamento, obs)
values
${entradas}
on conflict (id) do nothing;

insert into public.saidas
  (id, user_id, data, categoria, descricao, fornecedor, valor, forma_pagamento, obs)
values
${saidas}
on conflict (id) do nothing;

-- Conferência
select
  (select count(*) from public.entradas where user_id = '${userId}') as vendas,
  (select coalesce(sum(valor_total),0) from public.entradas where user_id = '${userId}') as total_vendas,
  (select count(*) from public.saidas where user_id = '${userId}') as gastos,
  (select coalesce(sum(valor),0) from public.saidas where user_id = '${userId}') as total_gastos,
  (select count(*) from public.produtos where user_id = '${userId}') as produtos;
`

const out = join(HERE, "seed-planilha.sql")
writeFileSync(out, sql)
console.log(
  `OK — ${data.entradas.length} vendas, ${data.saidas.length} gastos -> ${out}`
)
