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
import { gastoSchema } from "@/lib/validations"

function revalidate() {
  revalidatePath("/")
  revalidatePath("/gastos")
}

export async function createGasto(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const parsed = gastoSchema.safeParse(formObject(formData))
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from("saidas")
    .insert({ ...parsed.data, user_id: user.id })
  if (error) return failure(dbError(error))

  revalidate()
  redirect("/gastos")
}

export async function updateGasto(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser()
  const id = String(formData.get("id") ?? "")
  if (!id) return failure("Registro inválido.")
  const parsed = gastoSchema.safeParse(formObject(formData))
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from("saidas")
    .update(parsed.data)
    .eq("id", id)
  if (error) return failure(dbError(error))

  revalidate()
  redirect("/gastos")
}

export async function deleteGasto(id: string): Promise<FormState> {
  try {
    await requireUser()
    const supabase = await createClient()
    const { error } = await supabase.from("saidas").delete().eq("id", id)
    if (error) return failure(dbError(error))
  } catch (e) {
    return failure(dbError(e))
  }
  revalidate()
  return { ...initialFormState, ok: true }
}
