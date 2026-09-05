import type { z } from "zod"

export type FormState = {
  ok: boolean
  message?: string
  formError?: string
  fieldErrors?: Record<string, string[]>
}

export const initialFormState: FormState = { ok: false }

export function invalid(error: z.ZodError): FormState {
  return {
    ok: false,
    message: "Verifique os campos.",
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  }
}

export function failure(formError: string): FormState {
  return { ok: false, formError }
}

/** Erro amigável do PostgREST/Supabase. */
export function dbError(err: unknown): string {
  const e = err as { code?: string; message?: string } | null
  if (!e) return "Erro inesperado. Tente de novo."
  switch (e.code) {
    case "23505":
      return "Já existe um registro com esses dados."
    case "23514":
      return "Dados fora das regras permitidas."
    case "42501":
    case "PGRST301":
      return "Sessão expirada. Entre de novo."
    default:
      return e.message || "Erro ao salvar. Tente de novo."
  }
}

/** FormData -> objeto simples (última ocorrência vence). */
export function formObject(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {}
  for (const [k, v] of formData.entries()) raw[k] = v
  return raw
}
