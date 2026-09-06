/** Tipos das tabelas do Supabase — mantidos à mão (numeric chega como string). */

export type Entrada = {
  id: string
  user_id: string
  data: string // yyyy-MM-dd
  cliente: string | null
  produto: string
  tipo_venda: "Cliente Final" | "Fornecedor (Atacado)"
  qtd: string // numeric
  valor_unitario: string // numeric
  valor_total: string // numeric
  forma_pagamento: string | null
  obs: string | null
  origem: "manual" | "crm"
  origem_id: string | null
  created_at: string
}

export type Saida = {
  id: string
  user_id: string
  data: string
  categoria: string
  descricao: string
  fornecedor: string | null
  valor: string // numeric
  forma_pagamento: string | null
  obs: string | null
  created_at: string
}

export type Produto = {
  id: string
  user_id: string
  produto: string
  custo_producao: string // numeric
  preco_cliente_final: string // numeric
  preco_revenda: string // numeric
  created_at: string
}

type Row<T> = { [K in keyof T]: T[K] }
type Table<T> = {
  Row: Row<T>
  Insert: { [K in keyof T]?: T[K] | null }
  Update: { [K in keyof T]?: T[K] | null }
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      entradas: Table<Entrada>
      saidas: Table<Saida>
      produtos: Table<Produto>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
