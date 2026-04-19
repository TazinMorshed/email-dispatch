export interface SupplierTable {
  product_name: string[]
  lufa_farms_code: number[]
  rebate_per_unit: string[]
  rebate_cost: string[]
  qty_bought_at_rebate_cost: number[]
  regular_cost: string[]
  qty_bought_at_regular_cost: number[]
  credited_sum: string[]
  total_credited: string
}

export interface Supplier {
  supplier: string
  emails: string[]
  language: string
  taxable: string
  year: number
  week: number
  period: string
  theme: string
  table: SupplierTable
}

export interface WeekData {
  week: number
  total_suppliers: number
  suppliers: Supplier[]
}

export interface AppConfig {
  ccRecipient: string
}

export interface SentRecord {
  id: number
  sent_at: string
  week: number
  supplier: string
  recipients: string
  mode: string
  sent_by: string | null
}
