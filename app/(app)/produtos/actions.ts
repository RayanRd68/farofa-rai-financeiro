"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import {
  dbError,
  failure,
  formObject,
  initialFormState,
  invalid,
  type FormState,
} from "@/lib/form"
import { produtoSchema } from "@/lib/validations"

function revalidate() {
  revalidatePath("/")
  revalidatePath("/produtos")
  revalidatePath("/vendas/nova")
}

export async function createProduto(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const parsed = produtoSchema.safeParse(formObject(formData))
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from("produtos")
    .insert({ ...parsed.data, user_id: user.id })
  if (error) return failure(dbError(error))

  revalidate()
  return { ...initialFormState, ok: true, message: "Produto adicionado." }
}

export async function updateProduto(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser()
  const id = String(formData.get("id") ?? "")
  if (!id) return failure("Registro inválido.")
  const parsed = produtoSchema.safeParse(formObject(formData))
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from("produtos")
    .update(parsed.data)
    .eq("id", id)
  if (error) return failure(dbError(error))

  revalidate()
  return { ...initialFormState, ok: true, message: "Salvo." }
}

export async function deleteProduto(id: string): Promise<FormState> {
  try {
    await requireUser()
    const supabase = await createClient()
    const { error } = await supabase.from("produtos").delete().eq("id", id)
    if (error) return failure(dbError(error))
  } catch (e) {
    return failure(dbError(e))
  }
  revalidate()
  return { ...initialFormState, ok: true }
}
