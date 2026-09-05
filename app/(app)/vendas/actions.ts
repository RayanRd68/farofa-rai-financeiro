"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

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
import { vendaSchema } from "@/lib/validations"

function revalidate() {
  revalidatePath("/")
  revalidatePath("/vendas")
}

export async function createVenda(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const parsed = vendaSchema.safeParse(formObject(formData))
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from("entradas")
    .insert({ ...parsed.data, user_id: user.id })
  if (error) return failure(dbError(error))

  revalidate()
  redirect("/vendas")
}

export async function updateVenda(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser()
  const id = String(formData.get("id") ?? "")
  if (!id) return failure("Registro inválido.")
  const parsed = vendaSchema.safeParse(formObject(formData))
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from("entradas")
    .update(parsed.data)
    .eq("id", id)
  if (error) return failure(dbError(error))

  revalidate()
  redirect("/vendas")
}

export async function deleteVenda(id: string): Promise<FormState> {
  try {
    await requireUser()
    const supabase = await createClient()
    const { error } = await supabase.from("entradas").delete().eq("id", id)
    if (error) return failure(dbError(error))
  } catch (e) {
    return failure(dbError(e))
  }
  revalidate()
  return { ...initialFormState, ok: true }
}
