import { describe, expect, it } from "vitest"

import { reportExportQuerySchema, reportRangeSchema } from "@/lib/validations"

describe("reportRangeSchema / reportExportQuerySchema", () => {
  it("aceita vazio (= 'tudo')", () => {
    expect(reportRangeSchema.safeParse({}).success).toBe(true)
  })

  it("aceita um preset conhecido e recusa um desconhecido", () => {
    expect(reportRangeSchema.safeParse({ preset: "mes_passado" }).success).toBe(true)
    expect(reportRangeSchema.safeParse({ preset: "semana" }).success).toBe(false)
  })

  it("recusa from depois de to", () => {
    expect(
      reportRangeSchema.safeParse({ from: "2026-09-30", to: "2026-09-01" }).success
    ).toBe(false)
    expect(
      reportRangeSchema.safeParse({ from: "2026-09-01", to: "2026-09-30" }).success
    ).toBe(true)
  })

  it("recusa data fora do formato ISO", () => {
    expect(reportRangeSchema.safeParse({ from: "01/09/2026" }).success).toBe(false)
  })

  it("export exige um format válido", () => {
    expect(
      reportExportQuerySchema.safeParse({ format: "pdf", preset: "este_mes" }).success
    ).toBe(true)
    expect(reportExportQuerySchema.safeParse({ preset: "este_mes" }).success).toBe(
      false
    )
    expect(reportExportQuerySchema.safeParse({ format: "csv" }).success).toBe(false)
  })
})
