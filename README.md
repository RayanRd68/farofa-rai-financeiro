# Farofa da Rai — Controle Financeiro

App pessoal de controle financeiro da **Farofa da Rai** (MEI de farofa
artesanal). Separado do CRM. Registra **vendas** e **gastos**, calcula
**lucro e margem** por mês e por categoria, mostra os **clientes que mais
compram** e a **margem de cada produto**.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions), React 19, TS
- **Supabase** (Postgres + Auth + RLS) — projeto `dguqupwfjfnbdxyngbyb`
- **Vercel** (deploy)
- CSS próprio (visual "festa junina / feito à mão"), sem framework de UI

Dados sincronizam entre aparelhos (ficam no Supabase, não no navegador).

## Rodar local

```bash
npm install
npm run dev            # http://localhost:3000
npm run check          # lint + typecheck + testes
npm run build
```

Node não está no PATH desta máquina: `C:\Program Files\nodejs`.

## Banco

Schema em `supabase/migrations/001_init.sql` (3 tabelas: `entradas`, `saidas`,
`produtos`; RLS por `user_id`). Aplicado ao projeto Supabase via MCP.

`scripts/seed-planilha.mjs` gera `scripts/seed-planilha.sql` a partir de
`scripts/planilha3-clean.json` (204 vendas + 65 gastos + 1 produto extraídos da
planilha `Farofa_da_Rai_Controle_Financeiro_3.xlsx`, jun–ago/2026). O seed é
idempotente (PK determinística) e é aplicado ao banco depois que a Rai cria a
conta (precisa do `user_id` dela).

## Auth

Single-user. A Rai cria a conta em `/login` (e-mail + senha). Depois do cadastro,
**desligar o signup** no painel do Supabase (Authentication → Providers → Email →
"Allow new users to sign up" off) para ninguém mais criar conta.
