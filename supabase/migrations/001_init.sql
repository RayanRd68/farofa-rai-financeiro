-- =============================================================================
-- Farofa da Rai — Controle Financeiro · schema inicial
--
-- App pessoal single-user. Cada linha carrega `user_id` (= auth.uid()) e a RLS
-- isola por usuário — mesmo com signup aberto, ninguém vê os dados de outro.
-- Dinheiro em numeric(12,2); quantidades em numeric(12,3).
-- =============================================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ entradas ---
create table public.entradas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid()
                    references auth.users (id) on delete cascade,
  data            date not null,
  cliente         text,
  produto         text not null default 'Farofa Tradicional',
  tipo_venda      text not null default 'Cliente Final'
                    check (tipo_venda in ('Cliente Final', 'Fornecedor (Atacado)')),
  qtd             numeric(12,3) not null default 1 check (qtd > 0),
  valor_unitario  numeric(12,2) not null default 0 check (valor_unitario >= 0),
  valor_total     numeric(12,2) not null check (valor_total >= 0),
  forma_pagamento text,
  obs             text,
  created_at      timestamptz not null default now()
);
create index entradas_user_data_idx on public.entradas (user_id, data desc);

-- -------------------------------------------------------------------- saidas ---
create table public.saidas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid()
                    references auth.users (id) on delete cascade,
  data            date not null,
  categoria       text not null,
  descricao       text not null check (length(btrim(descricao)) >= 1),
  fornecedor      text,
  valor           numeric(12,2) not null check (valor > 0),
  forma_pagamento text,
  obs             text,
  created_at      timestamptz not null default now()
);
create index saidas_user_data_idx on public.saidas (user_id, data desc);

-- ------------------------------------------------------------------ produtos ---
create table public.produtos (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid()
                          references auth.users (id) on delete cascade,
  produto               text not null,
  custo_producao        numeric(12,2) not null default 0 check (custo_producao >= 0),
  preco_cliente_final   numeric(12,2) not null default 0 check (preco_cliente_final >= 0),
  preco_revenda         numeric(12,2) not null default 0 check (preco_revenda >= 0),
  created_at            timestamptz not null default now(),
  unique (user_id, produto)
);

-- ----------------------------------------------------------------------- RLS ---
-- 4 políticas separadas por tabela (nunca FOR ALL), escopo por usuário.
do $$
declare t text;
begin
  foreach t in array array['entradas', 'saidas', 'produtos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($f$
      create policy %1$I_select on public.%1$I for select to authenticated
        using (user_id = (select auth.uid()));
    $f$, t);
    execute format($f$
      create policy %1$I_insert on public.%1$I for insert to authenticated
        with check (user_id = (select auth.uid()));
    $f$, t);
    execute format($f$
      create policy %1$I_update on public.%1$I for update to authenticated
        using (user_id = (select auth.uid()))
        with check (user_id = (select auth.uid()));
    $f$, t);
    execute format($f$
      create policy %1$I_delete on public.%1$I for delete to authenticated
        using (user_id = (select auth.uid()));
    $f$, t);
  end loop;
end $$;
