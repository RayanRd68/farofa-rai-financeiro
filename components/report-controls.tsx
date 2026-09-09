"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import {
  PRESET_LABELS,
  REPORT_PRESETS,
  type ReportPreset,
} from "@/lib/reports/period"

/**
 * Filtros de período do Resumo + botões de exportação. Espelha
 * `CRM/app/(app)/reports/sales-report-controls.tsx` (ADR-023), com o CSS do
 * Controle Financeiro.
 */
export function ReportControls({
  preset,
  from,
  to,
}: {
  preset: ReportPreset | null
  from: string
  to: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  // No preset "tudo" o `from` é o sentinel 2000-01-01 — não mostra no date picker.
  const [customFrom, setCustomFrom] = useState(preset === "tudo" ? "" : from)
  const [customTo, setCustomTo] = useState(preset === "tudo" ? "" : to)

  function applyPreset(value: ReportPreset) {
    start(() => {
      router.push(value === "tudo" ? "/" : `/?preset=${value}`)
    })
  }

  function applyCustom() {
    if (!customFrom || !customTo) return
    const [a, b] =
      customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom]
    start(() => router.push(`/?from=${a}&to=${b}`))
  }

  const query = preset ? `preset=${preset}` : `from=${from}&to=${to}`

  return (
    <div className="report-controls">
      <div className="chip-row" style={{ marginBottom: 0 }}>
        <span className="rc-label">Período:</span>
        {REPORT_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className={`chip${preset === p ? " active" : ""}`}
            onClick={() => applyPreset(p)}
            disabled={pending}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="rc-range">
        <span className="rc-label">Ou um intervalo:</span>
        <input
          type="date"
          className="rc-date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          aria-label="Data inicial"
        />
        <span className="muted">até</span>
        <input
          type="date"
          className="rc-date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          aria-label="Data final"
        />
        <button
          type="button"
          className="btn ghost small"
          onClick={applyCustom}
          disabled={pending || !customFrom || !customTo}
        >
          Aplicar
        </button>
      </div>

      <div className="rc-export">
        <span className="rc-label">Baixar relatório:</span>
        <a
          className="btn ghost small"
          href={`/api/reports/export?format=xlsx&${query}`}
        >
          Excel
        </a>
        <a
          className="btn ghost small"
          href={`/api/reports/export?format=pdf&${query}`}
        >
          PDF
        </a>
      </div>
    </div>
  )
}
