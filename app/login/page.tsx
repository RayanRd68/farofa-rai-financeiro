"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"

import { signIn, signUp, type AuthState } from "@/app/auth/actions"
import { APP_SUBTITLE } from "@/lib/constants"

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button className="btn block" type="submit" disabled={pending}>
      {pending ? "Aguarde…" : label}
    </button>
  )
}

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in")
  const action = mode === "in" ? signIn : signUp
  const [state, formAction] = useActionState<AuthState, FormData>(action, {})

  return (
    <div className="login-wrap">
      <header style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          className="brand"
          style={{
            color: "var(--terracotta)",
            fontSize: 30,
            whiteSpace: "normal",
          }}
        >
          Farofa <em style={{ color: "var(--brown-dark)" }}>da</em> Rai
        </div>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 12.5,
            letterSpacing: "1.4px",
            textTransform: "uppercase",
            color: "var(--brown-soft)",
            fontWeight: 600,
          }}
        >
          {APP_SUBTITLE}
        </p>
      </header>

      <div className="login-card">
        <h2>{mode === "in" ? "Entrar" : "Criar conta"}</h2>
        <p className="sub">
          {mode === "in"
            ? "Acesse seu controle financeiro."
            : "Crie sua conta para começar. Mínimo 8 caracteres na senha."}
        </p>

        {state.error && <div className="form-error">{state.error}</div>}

        <form action={formAction}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              required
            />
          </div>
          <Submit label={mode === "in" ? "Entrar" : "Criar conta"} />
        </form>

        <div className="login-toggle">
          {mode === "in" ? (
            <>
              Não tem conta?{" "}
              <button type="button" onClick={() => setMode("up")}>
                Criar agora
              </button>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <button type="button" onClick={() => setMode("in")}>
                Entrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
