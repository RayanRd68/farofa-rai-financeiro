/**
 * URL e chave publicável do Supabase.
 *
 * Estes dois valores são **públicos por design** — vão no bundle do navegador de
 * qualquer forma; a segurança é a RLS (Row Level Security), não o segredo da
 * chave. Ficam aqui como padrão para o deploy funcionar sem configurar env vars;
 * `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` sobrescrevem.
 *
 * A `service_role` NUNCA aparece aqui nem no cliente.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://dguqupwfjfnbdxyngbyb.supabase.co"

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_Fx3v0u7o-Z6yd-4kPJcUNQ_Jsxz9cd8"
