import pb from '@/lib/pocketbase/client'
import {
  Client,
  Proposal,
  ServiceOrder,
  Invoice,
  Charge,
  Activity,
  CompanySettings,
  UserProfile,
  CRMData,
} from '../types/crm'
import { generateDigitableLine, calculateDaysOverdue } from '../utils/formatters'

type Listener = () => void

// Mapeamentos PocketBase Record -> CRM Types
function mapClient(record: any): Client {
  return {
    id: record.id,
    name: record.nome || '',
    type: (record.tipo as 'PF' | 'PJ') || 'PJ',
    email: record.email || '',
    phone: record.telefone || '',
    document: record.documento || '',
    street: record.rua || '',
    number: record.numero || '',
    neighborhood: record.bairro || '',
    city: record.cidade || '',
    state: record.estado || '',
    monthlyValue: typeof record.valor_mensal === 'number' ? record.valor_mensal : 0,
    dueDay: typeof record.dia_vencimento === 'number' ? record.dia_vencimento : 10,
    multifoco_client_id: record.multifoco_client_id || undefined,
    notes: record.observacoes || '',
    status: (record.status as 'ativo' | 'inativo') || 'ativo',
    createdAt: record.created || new Date().toISOString(),
  }
}

function mapProposal(record: any, clientMap: Map<string, string>): Proposal {
  let parsedItems: any[] = []
  if (record.itens) {
    if (typeof record.itens === 'string') {
      try {
        parsedItems = JSON.parse(record.itens)
      } catch (_) {
        parsedItems = []
      }
    } else if (Array.isArray(record.itens)) {
      parsedItems = record.itens
    }
  }

  const clientId = record.cliente_id || ''
  const clientName = record.expand?.cliente_id?.nome || clientMap.get(clientId) || 'Cliente'

  return {
    id: record.id,
    code: record.codigo || `PROP-${record.id.slice(0, 6)}`,
    clientId,
    clientName,
    title: record.titulo || '',
    description: record.descricao || '',
    items: parsedItems,
    total: typeof record.valor === 'number' ? record.valor : 0,
    status: (record.status as Proposal['status']) || 'rascunho',
    createdAt: record.created || new Date().toISOString(),
    validUntil: record.validade || undefined,
    zapsignDocToken: record.zapsign_doc_token || undefined,
    signatureLink: record.link_assinatura || undefined,
    signedAt: record.assinado_em || undefined,
  }
}

function mapServiceOrder(record: any, clientMap: Map<string, string>): ServiceOrder {
  const clientId = record.cliente_id || ''
  const clientName = record.expand?.cliente_id?.nome || clientMap.get(clientId) || 'Cliente'

  return {
    id: record.id,
    code: record.code || record.numero_os || `OS-${record.id.slice(0, 6)}`,
    clientId,
    clientName,
    proposalId: record.proposta_id || undefined,
    title: record.titulo || '',
    description: record.descricao || '',
    technician: record.tecnico || '',
    startDate: record.data_inicio || '',
    endDate: record.data_fim || '',
    value: typeof record.valor === 'number' ? record.valor : 0,
    status: record.status || 'aberta',
    createdAt: record.created || new Date().toISOString(),
    completedAt: record.concluida_em || undefined,
  }
}

function mapInvoice(record: any, clientMap: Map<string, string>): Invoice {
  let osIds: string[] = []
  let osCodes: string[] = []

  if (record.os_ids) {
    if (typeof record.os_ids === 'string') {
      try {
        osIds = JSON.parse(record.os_ids)
      } catch {
        /* intentionally ignored */
      }
    } else if (Array.isArray(record.os_ids)) {
      osIds = record.os_ids
    }
  }
  if (record.ordem_servico_id && !osIds.includes(record.ordem_servico_id)) {
    osIds.unshift(record.ordem_servico_id)
  }

  if (record.os_codigos) {
    if (typeof record.os_codigos === 'string') {
      try {
        osCodes = JSON.parse(record.os_codigos)
      } catch {
        /* intentionally ignored */
      }
    } else if (Array.isArray(record.os_codigos)) {
      osCodes = record.os_codigos
    }
  }

  const clientId = record.cliente_id || ''
  const clientName = record.expand?.cliente_id?.nome || clientMap.get(clientId) || 'Cliente'

  return {
    id: record.id,
    number: record.numero_nfse || record.id.slice(0, 8),
    clientId,
    clientName,
    serviceOrderIds: osIds,
    serviceOrderCodes: osCodes,
    issueDate: record.emitida_em || (record.created ? record.created.split('T')[0] : ''),
    total: typeof record.valor === 'number' ? record.valor : 0,
    status: record.status || 'pendente',
    createdAt: record.created || new Date().toISOString(),
    notes: record.observacoes || '',
  }
}

function mapCharge(record: any, clientMap: Map<string, string>): Charge {
  const clientId = record.cliente_id || ''
  const clientName = record.expand?.cliente_id?.nome || clientMap.get(clientId) || 'Cliente'

  let normalizedStatus = record.status || 'Emitido'
  if (normalizedStatus === 'em_aberto') normalizedStatus = 'Emitido'
  else if (normalizedStatus === 'pago') normalizedStatus = 'Pago'
  else if (normalizedStatus === 'em_atraso') normalizedStatus = 'Vencido'
  else if (normalizedStatus === 'cancelado') normalizedStatus = 'Cancelado'

  const dueDate = record.vencimento || ''
  if (normalizedStatus === 'Emitido' && dueDate) {
    const daysOver = calculateDaysOverdue(dueDate)
    if (daysOver > 0) {
      normalizedStatus = 'Vencido'
    }
  }

  let competence = record.competencia
  if (!competence && dueDate) {
    const parts = dueDate.split('-')
    if (parts.length >= 2) {
      competence = `${parts[1]}/${parts[0]}`
    }
  }

  return {
    id: record.id,
    code: record.codigo || `COB-${record.id.slice(0, 6)}`,
    clientId,
    clientName,
    description: record.descricao || '',
    competence: competence || '03/2025',
    value: typeof record.valor === 'number' ? record.valor : 0,
    dueDate,
    paymentDate: record.pago_em || undefined,
    status: normalizedStatus,
    digitableLine: record.linha_digitavel || generateDigitableLine(),
    method: 'boleto',
    createdAt: record.created || new Date().toISOString(),
  }
}

class PocketBaseDataStore {
  private clients: Client[] = []
  private proposals: Proposal[] = []
  private serviceOrders: ServiceOrder[] = []
  private invoices: Invoice[] = []
  private charges: Charge[] = []
  private activities: Activity[] = []

  private companySettings: CompanySettings = {
    companyName: 'Nexo Soluções Digitais e Consultoria Ltda',
    tradeName: 'Nexo CRM & Tecnologia',
    cnpj: '45.182.903/0001-84',
    street: 'Av. Paulista',
    number: '1374, Cj 112',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    postalCode: '01310-100',
    email: 'financeiro@nexocrm.com.br',
    phone: '(11) 3280-4490',
    boletoProvider: 'Banco Inter (API V2) / Asaas Webhook',
    multiFocoBaseUrl: 'https://api.multifoco.com.br',
    multiFocoApiToken: '',
  }

  private userProfile: UserProfile = {
    name: 'Carlos Tessaroli',
    email: 'fr.tessaroli@gmail.com',
    role: 'Administrador / Gestor Comercial',
    avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=male&seed=42',
  }

  private listeners: Set<Listener> = new Set()
  private isLoaded = false
  private isLoading = false
  private loadError: string | null = null

  constructor() {
    this.syncCurrentUser()
    pb.authStore.onChange(() => {
      this.syncCurrentUser()
      if (pb.authStore.isValid) {
        this.fetchAll()
      } else {
        this.clearData()
      }
    })
  }

  private syncCurrentUser() {
    const authUser = pb.authStore.record
    if (authUser) {
      this.userProfile = {
        name: authUser.getString?.('name') || authUser.name || 'Carlos Tessaroli',
        email: authUser.email || 'fr.tessaroli@gmail.com',
        role: 'Administrador / Gestor Comercial',
        avatarUrl: authUser.avatar
          ? pb.files.getURL(authUser, authUser.avatar)
          : 'https://img.usecurling.com/ppl/medium?gender=male&seed=42',
      }
    }
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn()
      } catch {
        /* intentionally ignored */
      }
    })
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public getStatus() {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      error: this.loadError,
    }
  }

  public clearData() {
    this.clients = []
    this.proposals = []
    this.serviceOrders = []
    this.invoices = []
    this.charges = []
    this.activities = []
    this.isLoaded = false
    this.loadError = null
    this.notify()
  }

  public async fetchAll(): Promise<void> {
    if (!pb.authStore.isValid) {
      this.isLoaded = false
      this.notify()
      return
    }

    this.isLoading = true
    this.loadError = null
    this.notify()

    try {
      const [rawClients, rawProposals, rawOS, rawInvoices, rawCharges] = await Promise.all([
        pb.collection('clientes').getFullList({ sort: '-created' }),
        pb.collection('propostas').getFullList({ sort: '-created', expand: 'cliente_id' }),
        pb.collection('ordens_servico').getFullList({ sort: '-created', expand: 'cliente_id' }),
        pb.collection('notas_fiscais').getFullList({ sort: '-created', expand: 'cliente_id' }),
        pb.collection('cobrancas').getFullList({ sort: '-created', expand: 'cliente_id' }),
      ])

      const clientMap = new Map<string, string>()
      this.clients = rawClients.map((r) => {
        const c = mapClient(r)
        clientMap.set(c.id, c.name)
        return c
      })

      this.proposals = rawProposals.map((r) => mapProposal(r, clientMap))
      this.serviceOrders = rawOS.map((r) => mapServiceOrder(r, clientMap))
      this.invoices = rawInvoices.map((r) => mapInvoice(r, clientMap))
      this.charges = rawCharges.map((r) => mapCharge(r, clientMap))

      this.rebuildActivities()
      this.isLoaded = true
      this.isLoading = false
      this.notify()
    } catch (err: any) {
      console.error('Failed to fetch PocketBase data:', err)
      this.loadError = err?.message || 'Erro ao carregar dados do banco de dados.'
      this.isLoading = false
      this.notify()
      throw err
    }
  }

  private rebuildActivities() {
    const list: Activity[] = []

    this.charges.slice(0, 5).forEach((c) => {
      list.push({
        id: `act-cob-${c.id}`,
        type: 'cobranca',
        action: c.status === 'Pago' ? 'Pagamento compensado' : `Cobrança ${c.status}`,
        title: `${c.code}: ${c.description} (${c.clientName})`,
        entityId: c.id,
        status: c.status,
        timestamp: c.paymentDate || c.createdAt,
      })
    })

    this.proposals.slice(0, 4).forEach((p) => {
      list.push({
        id: `act-prop-${p.id}`,
        type: 'proposta',
        action: `Proposta ${p.status}`,
        title: `${p.code}: ${p.title} (${p.clientName})`,
        entityId: p.id,
        status: p.status,
        timestamp: p.createdAt,
      })
    })

    this.serviceOrders.slice(0, 4).forEach((o) => {
      list.push({
        id: `act-os-${o.id}`,
        type: 'ordem_servico',
        action: `OS ${o.status.replace('_', ' ')}`,
        title: `${o.code}: ${o.title} (${o.clientName})`,
        entityId: o.id,
        status: o.status,
        timestamp: o.completedAt || o.createdAt,
      })
    })

    this.invoices.slice(0, 3).forEach((n) => {
      list.push({
        id: `act-nf-${n.id}`,
        type: 'nota_fiscal',
        action: `NF ${n.status}`,
        title: `NF ${n.number} emitida para ${n.clientName}`,
        entityId: n.id,
        status: n.status,
        timestamp: n.createdAt,
      })
    })

    list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    this.activities = list.slice(0, 20)
  }

  // Getters síncronos
  public getDataSnapshot(): CRMData {
    return {
      clients: this.clients,
      proposals: this.proposals,
      serviceOrders: this.serviceOrders,
      invoices: this.invoices,
      charges: this.charges,
      activities: this.activities,
      companySettings: this.companySettings,
      userProfile: this.userProfile,
    }
  }

  public getClients(): Client[] {
    return [...this.clients]
  }

  public getClientById(id: string): Client | undefined {
    return this.clients.find((c) => c.id === id)
  }

  public getProposals(): Proposal[] {
    return [...this.proposals]
  }

  public getProposalById(id: string): Proposal | undefined {
    return this.proposals.find((p) => p.id === id)
  }

  public getServiceOrders(): ServiceOrder[] {
    return [...this.serviceOrders]
  }

  public getServiceOrderById(id: string): ServiceOrder | undefined {
    return this.serviceOrders.find((s) => s.id === id)
  }

  public getInvoices(): Invoice[] {
    return [...this.invoices]
  }

  public getInvoiceById(id: string): Invoice | undefined {
    return this.invoices.find((i) => i.id === id)
  }

  public getCharges(): Charge[] {
    return [...this.charges]
  }

  public getChargeById(id: string): Charge | undefined {
    return this.charges.find((c) => c.id === id)
  }

  public getActivities(): Activity[] {
    return [...this.activities]
  }

  public getCompanySettings(): CompanySettings {
    return { ...this.companySettings }
  }

  public getUserProfile(): UserProfile {
    return { ...this.userProfile }
  }

  // Mutators assíncronos que sincronizam com o PocketBase
  public async saveClient(
    client: Omit<Client, 'id' | 'createdAt'> & { id?: string },
  ): Promise<Client> {
    const payload = {
      nome: client.name,
      tipo: client.type,
      documento: client.document,
      email: client.email || '',
      telefone: client.phone || '',
      rua: client.street || '',
      numero: client.number || '',
      bairro: client.neighborhood || '',
      cidade: client.city || '',
      estado: client.state || '',
      endereco: `${client.street || ''}, ${client.number || ''} - ${client.city || ''}/${client.state || ''}`,
      valor_mensal: client.monthlyValue || 0,
      dia_vencimento: client.dueDay || 10,
      status: client.status,
      observacoes: client.notes || '',
      multifoco_client_id: client.multifoco_client_id || '',
    }

    let record: any
    if (client.id && this.clients.some((c) => c.id === client.id)) {
      record = await pb.collection('clientes').update(client.id, payload)
      const mapped = mapClient(record)
      this.clients = this.clients.map((c) => (c.id === mapped.id ? mapped : c))
      // Atualiza nome em caches locais
      this.proposals.forEach((p) => {
        if (p.clientId === mapped.id) p.clientName = mapped.name
      })
      this.serviceOrders.forEach((o) => {
        if (o.clientId === mapped.id) o.clientName = mapped.name
      })
      this.invoices.forEach((i) => {
        if (i.clientId === mapped.id) i.clientName = mapped.name
      })
      this.charges.forEach((c) => {
        if (c.clientId === mapped.id) c.clientName = mapped.name
      })
      this.notify()
      return mapped
    } else {
      record = await pb.collection('clientes').create(payload)
      const mapped = mapClient(record)
      this.clients = [mapped, ...this.clients]
      this.notify()
      return mapped
    }
  }

  public async deleteClient(id: string): Promise<void> {
    await pb.collection('clientes').delete(id)
    this.clients = this.clients.filter((c) => c.id !== id)
    this.notify()
  }

  public async saveProposal(
    proposal: Omit<Proposal, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string },
  ): Promise<Proposal> {
    const computedTotal = proposal.items.reduce(
      (acc, i) => acc + (i.quantity || 0) * (i.unitPrice || 0),
      0,
    )
    const code =
      proposal.code ||
      `PROP-${new Date().getFullYear()}-${String(this.proposals.length + 1).padStart(3, '0')}`

    const payload = {
      cliente_id: proposal.clientId,
      codigo: code,
      titulo: proposal.title,
      descricao: proposal.description || '',
      valor: computedTotal,
      status: proposal.status || 'rascunho',
      validade: proposal.validUntil || '',
      itens: JSON.stringify(proposal.items || []),
      zapsign_doc_token: proposal.zapsignDocToken || '',
      link_assinatura: proposal.signatureLink || '',
      assinado_em: proposal.signedAt || '',
    }

    let record: any
    const clientMap = new Map(this.clients.map((c) => [c.id, c.name]))
    if (proposal.id && this.proposals.some((p) => p.id === proposal.id)) {
      record = await pb
        .collection('propostas')
        .update(proposal.id, payload, { expand: 'cliente_id' })
      const mapped = mapProposal(record, clientMap)
      this.proposals = this.proposals.map((p) => (p.id === mapped.id ? mapped : p))
      this.notify()
      return mapped
    } else {
      record = await pb.collection('propostas').create(payload, { expand: 'cliente_id' })
      const mapped = mapProposal(record, clientMap)
      this.proposals = [mapped, ...this.proposals]
      this.notify()
      return mapped
    }
  }

  public async updateProposalStatus(id: string, status: Proposal['status']): Promise<void> {
    await pb.collection('propostas').update(id, { status })
    this.proposals = this.proposals.map((p) => (p.id === id ? { ...p, status } : p))
    this.notify()
  }

  public async deleteProposal(id: string): Promise<void> {
    await pb.collection('propostas').delete(id)
    this.proposals = this.proposals.filter((p) => p.id !== id)
    this.notify()
  }

  public async saveServiceOrder(
    os: Omit<ServiceOrder, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string },
  ): Promise<ServiceOrder> {
    const code =
      os.code ||
      `OS-${new Date().getFullYear()}-${String(this.serviceOrders.length + 1).padStart(3, '0')}`
    const payload = {
      cliente_id: os.clientId,
      proposta_id: os.proposalId || null,
      code,
      numero_os: code,
      titulo: os.title,
      descricao: os.description || '',
      tecnico: os.technician || '',
      data_inicio: os.startDate || '',
      data_fim: os.endDate || '',
      valor: Number(os.value) || 0,
      status: os.status,
    }

    let record: any
    const clientMap = new Map(this.clients.map((c) => [c.id, c.name]))
    if (os.id && this.serviceOrders.some((s) => s.id === os.id)) {
      record = await pb
        .collection('ordens_servico')
        .update(os.id, payload, { expand: 'cliente_id' })
      const mapped = mapServiceOrder(record, clientMap)
      this.serviceOrders = this.serviceOrders.map((s) => (s.id === mapped.id ? mapped : s))
      this.notify()
      return mapped
    } else {
      record = await pb.collection('ordens_servico').create(payload, { expand: 'cliente_id' })
      const mapped = mapServiceOrder(record, clientMap)
      this.serviceOrders = [mapped, ...this.serviceOrders]
      this.notify()
      return mapped
    }
  }

  public async completeServiceOrder(id: string): Promise<void> {
    const completedAt = new Date().toISOString()
    await pb
      .collection('ordens_servico')
      .update(id, { status: 'concluida', concluida_em: completedAt })
    this.serviceOrders = this.serviceOrders.map((o) =>
      o.id === id ? { ...o, status: 'concluida', completedAt } : o,
    )
    this.notify()
  }

  public async updateServiceOrderStatus(id: string, status: ServiceOrder['status']): Promise<void> {
    const updatePayload: any = { status }
    if (status === 'concluida') {
      updatePayload.concluida_em = new Date().toISOString()
    }
    await pb.collection('ordens_servico').update(id, updatePayload)
    this.serviceOrders = this.serviceOrders.map((o) =>
      o.id === id ? { ...o, status, completedAt: updatePayload.concluida_em || o.completedAt } : o,
    )
    this.notify()
  }

  public async saveInvoice(
    invoice: Omit<Invoice, 'id' | 'number' | 'createdAt'> & { id?: string; number?: string },
  ): Promise<Invoice> {
    const number =
      invoice.number ||
      `${new Date().getFullYear()}${String(this.invoices.length + 95).padStart(4, '0')}`
    const osCodes = invoice.serviceOrderIds.map((osId) => {
      const os = this.serviceOrders.find((o) => o.id === osId)
      return os ? os.code : osId
    })

    const payload = {
      cliente_id: invoice.clientId,
      numero_nfse: number,
      ordem_servico_id: invoice.serviceOrderIds[0] || null,
      os_ids: JSON.stringify(invoice.serviceOrderIds),
      os_codigos: JSON.stringify(osCodes),
      emitida_em: invoice.issueDate || new Date().toISOString().split('T')[0],
      valor: Number(invoice.total) || 0,
      status: invoice.status,
      observacoes: invoice.notes || '',
    }

    let record: any
    const clientMap = new Map(this.clients.map((c) => [c.id, c.name]))
    if (invoice.id && this.invoices.some((i) => i.id === invoice.id)) {
      record = await pb
        .collection('notas_fiscais')
        .update(invoice.id, payload, { expand: 'cliente_id' })
      const mapped = mapInvoice(record, clientMap)
      this.invoices = this.invoices.map((i) => (i.id === mapped.id ? mapped : i))
      this.notify()
      return mapped
    } else {
      record = await pb.collection('notas_fiscais').create(payload, { expand: 'cliente_id' })
      const mapped = mapInvoice(record, clientMap)
      this.invoices = [mapped, ...this.invoices]
      this.notify()
      return mapped
    }
  }

  public async updateInvoiceStatus(id: string, status: Invoice['status']): Promise<void> {
    await pb.collection('notas_fiscais').update(id, { status })
    this.invoices = this.invoices.map((i) => (i.id === id ? { ...i, status } : i))
    this.notify()
  }

  public async saveCharge(
    charge: Omit<Charge, 'id' | 'code' | 'createdAt' | 'method'> & { id?: string; code?: string },
  ): Promise<Charge> {
    const code = charge.code || `COB-${1096 + this.charges.length}`
    const digitableLine = charge.digitableLine || generateDigitableLine()
    const payload = {
      cliente_id: charge.clientId,
      codigo: code,
      descricao: charge.description || '',
      competencia: charge.competence || '03/2025',
      valor: Number(charge.value) || 0,
      vencimento: charge.dueDate,
      status: charge.status || 'Emitido',
      linha_digitavel: digitableLine,
      metodo: 'boleto',
      pago_em: charge.paymentDate || '',
    }

    let record: any
    const clientMap = new Map(this.clients.map((c) => [c.id, c.name]))
    if (charge.id && this.charges.some((c) => c.id === charge.id)) {
      record = await pb.collection('cobrancas').update(charge.id, payload, { expand: 'cliente_id' })
      const mapped = mapCharge(record, clientMap)
      this.charges = this.charges.map((c) => (c.id === mapped.id ? mapped : c))
      this.notify()
      return mapped
    } else {
      record = await pb.collection('cobrancas').create(payload, { expand: 'cliente_id' })
      const mapped = mapCharge(record, clientMap)
      this.charges = [mapped, ...this.charges]
      this.notify()
      return mapped
    }
  }

  public async checkAndExpireCharges(): Promise<number> {
    let changed = 0
    const updates: Promise<any>[] = []

    this.charges.forEach((c) => {
      const isIssued = c.status === 'Emitido' || (c.status as any) === 'em_aberto'
      if (isIssued && c.dueDate) {
        const daysOver = calculateDaysOverdue(c.dueDate)
        if (daysOver > 0) {
          c.status = 'Vencido'
          changed++
          updates.push(
            pb
              .collection('cobrancas')
              .update(c.id, { status: 'Vencido' })
              .catch(() => {}),
          )
        }
      }
    })

    if (changed > 0) {
      this.notify()
      await Promise.allSettled(updates)
    }
    return changed
  }

  public async registerPayment(id: string): Promise<void> {
    const paymentDate = new Date().toISOString().split('T')[0]
    await pb.collection('cobrancas').update(id, { status: 'Pago', pago_em: paymentDate })
    this.charges = this.charges.map((c) =>
      c.id === id ? { ...c, status: 'Pago', paymentDate } : c,
    )
    this.notify()
  }

  public async cancelCharge(id: string): Promise<void> {
    await pb.collection('cobrancas').update(id, { status: 'Cancelado' })
    this.charges = this.charges.map((c) => (c.id === id ? { ...c, status: 'Cancelado' } : c))
    this.notify()
  }

  public saveCompanySettings(settings: CompanySettings): void {
    this.companySettings = { ...settings }
    this.notify()
  }

  public async saveUserProfile(profile: UserProfile): Promise<void> {
    this.userProfile = { ...profile }
    const authUser = pb.authStore.record
    if (authUser) {
      try {
        await pb.collection('users').update(authUser.id, { name: profile.name })
      } catch {
        /* intentionally ignored */
      }
    }
    this.notify()
  }

  public exportDataJSON(): string {
    return JSON.stringify(this.getDataSnapshot(), null, 2)
  }

  public async resetToSampleData(): Promise<void> {
    await this.fetchAll()
  }

  // Realtime handler para atualizações remotas via SSE
  public handleRealtimeEvent(collection: string, action: string, record: any) {
    const clientMap = new Map(this.clients.map((c) => [c.id, c.name]))

    switch (collection) {
      case 'clientes': {
        const mapped = mapClient(record)
        if (action === 'delete') {
          this.clients = this.clients.filter((c) => c.id !== mapped.id)
        } else if (action === 'create') {
          if (!this.clients.some((c) => c.id === mapped.id)) {
            this.clients = [mapped, ...this.clients]
          }
        } else if (action === 'update') {
          this.clients = this.clients.map((c) => (c.id === mapped.id ? mapped : c))
        }
        break
      }
      case 'propostas': {
        const mapped = mapProposal(record, clientMap)
        if (action === 'delete') {
          this.proposals = this.proposals.filter((p) => p.id !== mapped.id)
        } else if (action === 'create') {
          if (!this.proposals.some((p) => p.id === mapped.id)) {
            this.proposals = [mapped, ...this.proposals]
          }
        } else if (action === 'update') {
          this.proposals = this.proposals.map((p) => (p.id === mapped.id ? mapped : p))
        }
        break
      }
      case 'ordens_servico': {
        const mapped = mapServiceOrder(record, clientMap)
        if (action === 'delete') {
          this.serviceOrders = this.serviceOrders.filter((s) => s.id !== mapped.id)
        } else if (action === 'create') {
          if (!this.serviceOrders.some((s) => s.id === mapped.id)) {
            this.serviceOrders = [mapped, ...this.serviceOrders]
          }
        } else if (action === 'update') {
          this.serviceOrders = this.serviceOrders.map((s) => (s.id === mapped.id ? mapped : s))
        }
        break
      }
      case 'notas_fiscais': {
        const mapped = mapInvoice(record, clientMap)
        if (action === 'delete') {
          this.invoices = this.invoices.filter((i) => i.id !== mapped.id)
        } else if (action === 'create') {
          if (!this.invoices.some((i) => i.id === mapped.id)) {
            this.invoices = [mapped, ...this.invoices]
          }
        } else if (action === 'update') {
          this.invoices = this.invoices.map((i) => (i.id === mapped.id ? mapped : i))
        }
        break
      }
      case 'cobrancas': {
        const mapped = mapCharge(record, clientMap)
        if (action === 'delete') {
          this.charges = this.charges.filter((c) => c.id !== mapped.id)
        } else if (action === 'create') {
          if (!this.charges.some((c) => c.id === mapped.id)) {
            this.charges = [mapped, ...this.charges]
          }
        } else if (action === 'update') {
          this.charges = this.charges.map((c) => (c.id === mapped.id ? mapped : c))
        }
        break
      }
    }

    this.rebuildActivities()
    this.notify()
  }
}

export const DataStore = new PocketBaseDataStore()
