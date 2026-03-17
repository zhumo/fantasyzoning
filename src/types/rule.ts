export interface RuleData {
  id: number
  proposedHeight: number
  neighborhood: string | null
  zoningCode: string | null
  fzpHeight: string | null
  transitDistance: number | null
}

export interface RuleFormData {
  proposedHeight: string
  neighborhood: string
  zoningCode: string
  fzpHeight: string
  transitDistance: string
}
