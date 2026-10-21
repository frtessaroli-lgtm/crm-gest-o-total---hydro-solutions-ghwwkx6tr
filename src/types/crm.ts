export type SectionId =
  | 'dashboard'
  | 'clientes'
  | 'propostas'
  | 'ordens-servico'
  | 'notas-fiscais'
  | 'cobrancas'
  | 'configuracoes'

export type ClientStatus = 'ativo' | 'inativo'

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  document: string // CPF ou CNPJ
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  notes?: string
  status: ClientStatus
  createdAt: string
}

export type ProposalStatus = 'rascunho' | 'enviada' | 'aceita' | 'recusada'

export interface ProposalItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Proposal {
  id: string
  code: string // ex: PROP-2025-001
  clientId: string
  clientName: string
  title: string
  description: string
  items: ProposalItem[]
  total: number
  status: ProposalStatus
  createdAt: string
  validUntil?: string
}

export type ServiceOrderStatus = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada'

export interface ServiceOrder {
  id: string
  code: string // ex: OS-2025-010
  clientId: string
  clientName: string
  proposalId?: string
  title: string
  description: string
  technician: string
  startDate: string
  endDate: string
  value: number
  status: ServiceOrderStatus
  createdAt: string
  completedAt?: string
}

export type InvoiceStatus = 'pendente' | 'emitida' | 'enviada' | 'cancelada'

export interface Invoice {
  id: string
  number: string // ex: 20250001
  clientId: string
  clientName: string
  serviceOrderIds: string[]
  serviceOrderCodes: string[]
  issueDate: string
  total: number
  status: InvoiceStatus
  createdAt: string
  notes?: string
}

export type ChargeStatus = 'em_aberto' | 'pago' | 'em_atraso' | 'cancelado'

export interface Charge {
  id: string
  code: string // ex: COB-1001
  clientId: string
  clientName: string
  description: string
  value: number
  dueDate: string // AAAA-MM-DD
  paymentDate?: string
  status: ChargeStatus
  method: 'boleto'
  createdAt: string
}

export interface Activity {
  id: string
  type: 'proposta' | 'ordem_servico' | 'nota_fiscal' | 'cobranca' | 'cliente'
  action: string
  title: string
  entityId: string
  status?: string
  timestamp: string
}

export interface CompanySettings {
  companyName: string
  tradeName: string
  cnpj: string
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  postalCode: string
  email: string
  phone: string
  boletoProvider: string
}

export interface UserProfile {
  name: string
  email: string
  role: string
  avatarUrl: string
}

export interface CRMData {
  clients: Client[]
  proposals: Proposal[]
  serviceOrders: ServiceOrder[]
  invoices: Invoice[]
  charges: Charge[]
  activities: Activity[]
  companySettings: CompanySettings
  userProfile: UserProfile
}
