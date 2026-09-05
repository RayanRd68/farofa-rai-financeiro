"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export type AuthState = { error?: string }

function readCreds(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  return { email, password }
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readCreds(formData)
  if (!email || !password) return { error: "Informe e-mail e senha." }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: "E-mail ou senha incorretos." }
  redirect("/")
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readCreds(formData)
  if (!email || !password) return { error: "Informe e-mail e senha." }
  if (password.length < 8)
    return { error: "A senha precisa de pelo menos 8 caracteres." }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  // Confirmação de e-mail desligada no projeto -> já vem com sessão.
  if (data.session) redirect("/")
  return { error: "Conta criada. Confirme o e-mail e entre." }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
