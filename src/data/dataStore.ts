import {
  CRMData,
  Client,
  Proposal,
  ServiceOrder,
  Invoice,
  Charge,
  Activity,
  CompanySettings,
  UserProfile,
} from '../types/crm'
import { INITIAL_DATA } from './seed'

const STORAGE_KEY = 'nexocrm_data_v1'

type Listener = () => void

class DataStoreService {
  private data: CRMData
  private listeners: Set<Listener> = new Set()

  constructor() {
    this.data = this.loadFromStorage()
  }

  private loadFromStorage(): CRMData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as CRMData
        // Valida se os campos essenciais existem
        if (
          Array.isArray(parsed.clients) &&
          Array.isArray(parsed.proposals) &&
          Array.isArray(parsed.serviceOrders) &&
          Array.isArray(parsed.invoices) &&
          Array.isArray(parsed.charges)
        ) {
          return parsed
        }
      }
    } catch {
      // Ignora erro de JSON e re-seeda
    }
    this.saveToStorage(INITIAL_DATA)
    return JSON.parse(JSON.stringify(INITIAL_DATA))
  }

  private saveToStorage(data: CRMData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Quota exceeded ou storage inacessível
    }
  }

  private commit(newActivity?: {
    type: Activity['type']
    action: string
    title: string
    entityId: string
    status?: string
  }): void {
    if (newActivity) {
      const act: Activity = {
        id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        ...newActivity,
        timestamp: new Date().toISOString(),
      }
      this.data.activities = [act, ...this.data.activities.slice(0, 49)]
    }
    this.saveToStorage(this.data)
    this.notify()
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn()
      } catch {
        // Safe dispatch
      }
    })
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public getDataSnapshot(): CRMData {
    return this.data
  }

  // Clientes
  public getClients(): Client[] {
    return [...this.data.clients]
  }

  public getClientById(id: string): Client | undefined {
    return this.data.clients.find((c) => c.id === id)
  }

  public saveClient(client: Omit<Client, 'id' | 'createdAt'> & { id?: string }): Client {
    if (client.id) {
      const index = this.data.clients.findIndex((c) => c.id === client.id)
      if (index >= 0) {
        const updated: Client = {
          ...this.data.clients[index],
          ...client,
          id: client.id,
        }
        this.data.clients[index] = updated

        // Atualiza nome do cliente em propostas, OS, faturas e cobranças se mudou
        this.data.proposals.forEach((p) => {
          if (p.clientId === updated.id) p.clientName = updated.name
        })
        this.data.serviceOrders.forEach((o) => {
          if (o.clientId === updated.id) o.clientName = updated.name
        })
        this.data.invoices.forEach((i) => {
          if (i.clientId === updated.id) i.clientName = updated.name
        })
        this.data.charges.forEach((c) => {
          if (c.clientId === updated.id) c.clientName = updated.name
        })

        this.commit({
          type: 'cliente',
          action: 'Dados cadastrais atualizados',
          title: `Cliente ${updated.name} foi atualizado`,
          entityId: updated.id,
        })
        return updated
      }
    }

    const newId = 'cli-' + Date.now()
    const created: Client = {
      ...client,
      id: newId,
      createdAt: new Date().toISOString(),
    }
    this.data.clients = [created, ...this.data.clients]
    this.commit({
      type: 'cliente',
      action: 'Novo cliente cadastrado',
      title: `${created.name} (${created.city}/${created.state})`,
      entityId: newId,
      status: created.status,
    })
    return created
  }

  public deleteClient(id: string): void {
    const client = this.getClientById(id)
    this.data.clients = this.data.clients.filter((c) => c.id !== id)
    this.commit({
      type: 'cliente',
      action: 'Cliente removido',
      title: client ? `Cliente ${client.name} foi removido` : 'Cliente removido',
      entityId: id,
    })
  }

  // Propostas
  public getProposals(): Proposal[] {
    return [...this.data.proposals]
  }

  public getProposalById(id: string): Proposal | undefined {
    return this.data.proposals.find((p) => p.id === id)
  }

  public saveProposal(
    proposal: Omit<Proposal, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string },
  ): Proposal {
    const client = this.getClientById(proposal.clientId)
    const clientName = client ? client.name : proposal.clientName
    const computedTotal = proposal.items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0)

    if (proposal.id) {
      const idx = this.data.proposals.findIndex((p) => p.id === proposal.id)
      if (idx >= 0) {
        const updated: Proposal = {
          ...this.data.proposals[idx],
          ...proposal,
          clientName,
          total: computedTotal,
        }
        this.data.proposals[idx] = updated
        this.commit({
          type: 'proposta',
          action: 'Proposta atualizada',
          title: `${updated.code}: ${updated.title} (${clientName})`,
          entityId: updated.id,
          status: updated.status,
        })
        return updated
      }
    }

    const year = new Date().getFullYear()
    const count = this.data.proposals.length + 1
    const code = `PROP-${year}-${String(count).padStart(3, '0')}`
    const newId = 'prop-' + Date.now()
    const created: Proposal = {
      ...proposal,
      id: newId,
      code,
      clientName,
      total: computedTotal,
      createdAt: new Date().toISOString(),
    }
    this.data.proposals = [created, ...this.data.proposals]
    this.commit({
      type: 'proposta',
      action: 'Nova proposta elaborada',
      title: `${created.code} para ${clientName}`,
      entityId: newId,
      status: created.status,
    })
    return created
  }

  public updateProposalStatus(id: string, status: Proposal['status']): void {
    const p = this.data.proposals.find((item) => item.id === id)
    if (!p) return
    p.status = status
    this.commit({
      type: 'proposta',
      action: `Proposta marcada como ${status}`,
      title: `${p.code} (${p.clientName}) alterada para ${status.toUpperCase()}`,
      entityId: p.id,
      status,
    })
  }

  public deleteProposal(id: string): void {
    this.data.proposals = this.data.proposals.filter((p) => p.id !== id)
    this.commit()
  }

  // Ordens de Serviço
  public getServiceOrders(): ServiceOrder[] {
    return [...this.data.serviceOrders]
  }

  public getServiceOrderById(id: string): ServiceOrder | undefined {
    return this.data.serviceOrders.find((s) => s.id === id)
  }

  public saveServiceOrder(
    os: Omit<ServiceOrder, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string },
  ): ServiceOrder {
    const client = this.getClientById(os.clientId)
    const clientName = client ? client.name : os.clientName

    if (os.id) {
      const idx = this.data.serviceOrders.findIndex((s) => s.id === os.id)
      if (idx >= 0) {
        const updated: ServiceOrder = {
          ...this.data.serviceOrders[idx],
          ...os,
          clientName,
        }
        this.data.serviceOrders[idx] = updated
        this.commit({
          type: 'ordem_servico',
          action: 'Ordem de serviço atualizada',
          title: `${updated.code}: ${updated.title}`,
          entityId: updated.id,
          status: updated.status,
        })
        return updated
      }
    }

    const year = new Date().getFullYear()
    const count = this.data.serviceOrders.length + 1
    const code = `OS-${year}-${String(count).padStart(3, '0')}`
    const newId = 'os-' + Date.now()
    const created: ServiceOrder = {
      ...os,
      id: newId,
      code,
      clientName,
      createdAt: new Date().toISOString(),
    }
    this.data.serviceOrders = [created, ...this.data.serviceOrders]
    this.commit({
      type: 'ordem_servico',
      action: 'Nova OS aberta',
      title: `${created.code} iniciada para ${clientName}`,
      entityId: newId,
      status: created.status,
    })
    return created
  }

  public completeServiceOrder(id: string): void {
    const os = this.data.serviceOrders.find((item) => item.id === id)
    if (!os) return
    os.status = 'concluida'
    os.completedAt = new Date().toISOString()
    this.commit({
      type: 'ordem_servico',
      action: 'Ordem de serviço concluída',
      title: `${os.code} foi concluída com sucesso`,
      entityId: os.id,
      status: 'concluida',
    })
  }

  public updateServiceOrderStatus(id: string, status: ServiceOrder['status']): void {
    const os = this.data.serviceOrders.find((item) => item.id === id)
    if (!os) return
    os.status = status
    if (status === 'concluida' && !os.completedAt) {
      os.completedAt = new Date().toISOString()
    }
    this.commit({
      type: 'ordem_servico',
      action: `OS atualizada para ${status}`,
      title: `${os.code} alterada para status ${status}`,
      entityId: os.id,
      status,
    })
  }

  // Notas Fiscais
  public getInvoices(): Invoice[] {
    return [...this.data.invoices]
  }

  public getInvoiceById(id: string): Invoice | undefined {
    return this.data.invoices.find((i) => i.id === id)
  }

  public saveInvoice(
    invoice: Omit<Invoice, 'id' | 'number' | 'createdAt'> & { id?: string; number?: string },
  ): Invoice {
    const client = this.getClientById(invoice.clientId)
    const clientName = client ? client.name : invoice.clientName

    // Garante códigos das OS vinculadas
    const serviceOrderCodes = invoice.serviceOrderIds.map((osId) => {
      const os = this.data.serviceOrders.find((o) => o.id === osId)
      return os ? os.code : osId
    })

    if (invoice.id) {
      const idx = this.data.invoices.findIndex((i) => i.id === invoice.id)
      if (idx >= 0) {
        const updated: Invoice = {
          ...this.data.invoices[idx],
          ...invoice,
          clientName,
          serviceOrderCodes,
        }
        this.data.invoices[idx] = updated
        this.commit({
          type: 'nota_fiscal',
          action: 'Nota fiscal atualizada',
          title: `NF ${updated.number} (${clientName})`,
          entityId: updated.id,
          status: updated.status,
        })
        return updated
      }
    }

    const year = new Date().getFullYear()
    const count = this.data.invoices.length + 94 // Gera sequência tipo 20250094
    const number = `${year}${String(count).padStart(4, '0')}`
    const newId = 'nf-' + Date.now()
    const created: Invoice = {
      ...invoice,
      id: newId,
      number,
      clientName,
      serviceOrderCodes,
      createdAt: new Date().toISOString(),
    }
    this.data.invoices = [created, ...this.data.invoices]
    this.commit({
      type: 'nota_fiscal',
      action: 'Nota fiscal gerada',
      title: `NF ${created.number} emitida para ${clientName}`,
      entityId: newId,
      status: created.status,
    })
    return created
  }

  public updateInvoiceStatus(id: string, status: Invoice['status']): void {
    const inv = this.data.invoices.find((i) => i.id === id)
    if (!inv) return
    inv.status = status
    this.commit({
      type: 'nota_fiscal',
      action:
        status === 'enviada'
          ? 'Nota fiscal enviada ao cliente'
          : `Status da NF ${inv.number} alterado`,
      title: `NF ${inv.number} atualizada para ${status.toUpperCase()}`,
      entityId: inv.id,
      status,
    })
  }

  // Cobranças
  public getCharges(): Charge[] {
    return [...this.data.charges]
  }

  public getChargeById(id: string): Charge | undefined {
    return this.data.charges.find((c) => c.id === id)
  }

  public saveCharge(
    charge: Omit<Charge, 'id' | 'code' | 'createdAt' | 'method'> & { id?: string; code?: string },
  ): Charge {
    const client = this.getClientById(charge.clientId)
    const clientName = client ? client.name : charge.clientName

    if (charge.id) {
      const idx = this.data.charges.findIndex((c) => c.id === charge.id)
      if (idx >= 0) {
        const updated: Charge = {
          ...this.data.charges[idx],
          ...charge,
          clientName,
        }
        this.data.charges[idx] = updated
        this.commit({
          type: 'cobranca',
          action: 'Cobrança alterada',
          title: `${updated.code}: ${updated.description}`,
          entityId: updated.id,
          status: updated.status,
        })
        return updated
      }
    }

    const count = 1096 + this.data.charges.length
    const code = `COB-${count}`
    const newId = 'cob-' + Date.now()
    const created: Charge = {
      ...charge,
      id: newId,
      code,
      clientName,
      method: 'boleto',
      createdAt: new Date().toISOString(),
    }
    this.data.charges = [created, ...this.data.charges]
    this.commit({
      type: 'cobranca',
      action: 'Boleto de cobrança gerado',
      title: `${created.code} gerado para ${clientName}`,
      entityId: newId,
      status: created.status,
    })
    return created
  }

  public registerPayment(id: string): void {
    const c = this.data.charges.find((item) => item.id === id)
    if (!c) return
    c.status = 'pago'
    c.paymentDate = new Date().toISOString().split('T')[0]
    this.commit({
      type: 'cobranca',
      action: 'Pagamento de boleto compensado',
      title: `Boleto ${c.code} liquidado por ${c.clientName}`,
      entityId: c.id,
      status: 'pago',
    })
  }

  public cancelCharge(id: string): void {
    const c = this.data.charges.find((item) => item.id === id)
    if (!c) return
    c.status = 'cancelado'
    this.commit({
      type: 'cobranca',
      action: 'Boleto cancelado',
      title: `Boleto ${c.code} (${c.clientName}) foi cancelado`,
      entityId: c.id,
      status: 'cancelado',
    })
  }

  // Atividades
  public getActivities(): Activity[] {
    return [...this.data.activities]
  }

  // Configurações e Perfil
  public getCompanySettings(): CompanySettings {
    return { ...this.data.companySettings }
  }

  public saveCompanySettings(settings: CompanySettings): void {
    this.data.companySettings = { ...settings }
    this.commit()
  }

  public getUserProfile(): UserProfile {
    return { ...this.data.userProfile }
  }

  public saveUserProfile(profile: UserProfile): void {
    this.data.userProfile = { ...profile }
    this.commit()
  }

  // Gestão de Dados
  public exportDataJSON(): string {
    return JSON.stringify(this.data, null, 2)
  }

  public resetToSampleData(): void {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA))
    this.saveToStorage(this.data)
    this.notify()
  }
}

export const DataStore = new DataStoreService()
