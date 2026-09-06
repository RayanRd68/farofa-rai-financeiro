-- =============================================================================
-- 002 · Ingestão de vendas vindas do CRM (Farofa da Rai CRM)
--
-- O CRM (projeto Supabase separado) exporta um pedido "entregue + pago" como
-- uma linha em `entradas`. A escrita entra por uma função `security definer`
-- que valida um segredo compartilhado guardado em `private.sync_config` — assim
-- o deploy do app do financeiro NÃO precisa da chave `service_role`.
--
-- `origem` = 'manual' (default, tudo que já existe + o que a Rai cadastra na UI)
--          | 'crm'    (linha espelhada de um pedido do CRM).
-- `origem_id` = id do pedido no CRM (só quando origem = 'crm').
-- =============================================================================

alter table public.entradas
  add column if not exists origem text not null default 'manual'
    check (origem in ('manual', 'crm')),
  add column if not exists origem_id text;

-- UNIQUE de 3 colunas: em Postgres NULLs não conflitam entre si, então as
-- linhas 'manual'/NULL convivem à vontade; a unicidade só passa a valer quando
-- `origem_id` é preenchido (uma entrada 'crm' por pedido de origem).
alter table public.entradas
  drop constraint if exists entradas_origem_uk;
alter table public.entradas
  add constraint entradas_origem_uk unique (user_id, origem, origem_id);

-- ---------------------------------------------------------------------------
-- Segredo da sincronização — fora do schema `public` (nunca exposto via API).
-- Populado FORA da migration (via SQL manual / MCP), não versionado:
--   insert into private.sync_config values
--     ('ingest_secret', '<segredo>'), ('owner_user_id', '<uuid do dono>');
-- ---------------------------------------------------------------------------
create schema if not exists private;

create table if not exists private.sync_config (
  key   text primary key,
  value text not null
);

-- ---------------------------------------------------------------------------
-- ingest_venda(p_secret, p_payload)
--   p_payload._op = 'delete'  -> remove a entrada 'crm' de `origem_id`
--   caso contrário             -> upsert da entrada 'crm'
-- Retorna { id, action: 'created' | 'updated' } ou { deleted: true }.
-- Erro 28000 (invalid_authorization_specification) quando o segredo não bate.
-- ---------------------------------------------------------------------------
create or replace function public.ingest_venda(p_secret text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_expected text;
  v_owner    uuid;
  v_id       uuid;
  v_existed  boolean;
begin
  select value into v_expected from private.sync_config where key = 'ingest_secret';
  if v_expected is null or p_secret is distinct from v_expected then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  select coalesce(
    (select value::uuid from private.sync_config where key = 'owner_user_id'),
    (select id from auth.users order by created_at limit 1)
  ) into v_owner;

  if v_owner is null then
    raise exception 'nenhum usuário no projeto' using errcode = 'no_data_found';
  end if;

  if p_payload ->> '_op' = 'delete' then
    delete from public.entradas
    where user_id = v_owner
      and origem = 'crm'
      and origem_id = p_payload ->> 'origem_id';
    return jsonb_build_object('deleted', true);
  end if;

  insert into public.entradas (
    user_id, origem, origem_id, data, cliente, produto, tipo_venda,
    qtd, valor_unitario, valor_total, forma_pagamento, obs
  )
  values (
    v_owner, 'crm', p_payload ->> 'origem_id', (p_payload ->> 'data')::date,
    nullif(p_payload ->> 'cliente', ''),
    p_payload ->> 'produto',
    p_payload ->> 'tipo_venda',
    (p_payload ->> 'qtd')::numeric,
    (p_payload ->> 'valor_unitario')::numeric,
    (p_payload ->> 'valor_total')::numeric,
    nullif(p_payload ->> 'forma_pagamento', ''),
    nullif(p_payload ->> 'obs', '')
  )
  on conflict on constraint entradas_origem_uk do update set
    data            = excluded.data,
    cliente         = excluded.cliente,
    produto         = excluded.produto,
    tipo_venda      = excluded.tipo_venda,
    qtd             = excluded.qtd,
    valor_unitario  = excluded.valor_unitario,
    valor_total     = excluded.valor_total,
    forma_pagamento = excluded.forma_pagamento,
    obs             = excluded.obs
  returning id, (xmax <> 0) into v_id, v_existed;

  return jsonb_build_object(
    'id', v_id,
    'action', case when v_existed then 'updated' else 'created' end
  );
end;
$$;

revoke all on function public.ingest_venda(text, jsonb) from public;
grant execute on function public.ingest_venda(text, jsonb) to anon, authenticated;

comment on function public.ingest_venda(text, jsonb) is
  'Ingestão de venda vinda do CRM. Valida o segredo de private.sync_config. Chamada pela rota /api/ingest/venda.';
