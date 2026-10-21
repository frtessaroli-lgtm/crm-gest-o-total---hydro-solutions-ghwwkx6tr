import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import {
  Client,
  Proposal,
  ServiceOrder,
  Invoice,
  Charge,
  Activity,
  CompanySettings,
  UserProfile,
  SectionId,
} from '../types/crm'
import { DataStore } from '../data/dataStore'

interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  title?: string
}

interface CRMContextType {
  // Navigation & Search
  activeSection: SectionId
  setActiveSection: (section: SectionId) => void
  globalSearch: string
  setGlobalSearch: (term: string) => void

  // Data
  clients: Client[]
  proposals: Proposal[]
  serviceOrders: ServiceOrder[]
  invoices: Invoice[]
  charges: Charge[]
  activities: Activity[]
  companySettings: CompanySettings
  userProfile: UserProfile

  // Quick modals trigger from anywhere
  quickAction: {
    type: 'nova_proposta' | 'nova_os' | 'novo_cliente' | 'nova_cobranca' | 'emitir_nota' | null
  }
  setQuickAction: (action: {
    type: 'nova_proposta' | 'nova_os' | 'novo_cliente' | 'nova_cobranca' | 'emitir_nota' | null
  }) => void

  // Toasts
  toasts: ToastItem[]
  addToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void
  removeToast: (id: string) => void

  // Mutators
  saveClient: (client: Omit<Client, 'id' | 'createdAt'> & { id?: string }) => Client
  deleteClient: (id: string) => void
  saveProposal: (
    proposal: Omit<Proposal, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string },
  ) => Proposal
  updateProposalStatus: (id: string, status: Proposal['status']) => void
  deleteProposal: (id: string) => void
  saveServiceOrder: (
    os: Omit<ServiceOrder, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string },
  ) => ServiceOrder
  completeServiceOrder: (id: string) => void
  updateServiceOrderStatus: (id: string, status: ServiceOrder['status']) => void
  saveInvoice: (
    invoice: Omit<Invoice, 'id' | 'number' | 'createdAt'> & { id?: string; number?: string },
  ) => Invoice
  updateInvoiceStatus: (id: string, status: Invoice['status']) => void
  saveCharge: (
    charge: Omit<Charge, 'id' | 'code' | 'createdAt' | 'method'> & { id?: string; code?: string },
  ) => Charge
  registerPayment: (id: string) => void
  cancelCharge: (id: string) => void
  saveCompanySettings: (settings: CompanySettings) => void
  saveUserProfile: (profile: UserProfile) => void
  resetToSampleData: () => void
  exportDataJSON: () => string
}

const CRMContext = createContext<CRMContextType | null>(null)

const getInitialSectionFromHash = (): SectionId => {
  const hash = window.location.hash.replace('#/', '').replace('#', '')
  const valid: SectionId[] = [
    'dashboard',
    'clientes',
    'propostas',
    'ordens-servico',
    'notas-fiscais',
    'cobrancas',
    'configuracoes',
  ]
  if (valid.includes(hash as SectionId)) {
    return hash as SectionId
  }
  return 'dashboard'
}

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSection, setActiveSectionState] = useState<SectionId>(getInitialSectionFromHash)
  const [globalSearch, setGlobalSearch] = useState<string>('')
  const [quickAction, setQuickAction] = useState<{
    type: 'nova_proposta' | 'nova_os' | 'novo_cliente' | 'nova_cobranca' | 'emitir_nota' | null
  }>({ type: null })
  const [toasts, setToasts] = useState<ToastItem[]>([])

  // Dados reativos do DataStore
  const [, setRevision] = useState(0)

  useEffect(() => {
    const unsubscribe = DataStore.subscribe(() => {
      setRevision((r) => r + 1)
    })
    return unsubscribe
  }, [])

  // Hash router sync
  useEffect(() => {
    const handleHashChange = () => {
      const sec = getInitialSectionFromHash()
      setActiveSectionState(sec)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const setActiveSection = useCallback((section: SectionId) => {
    setActiveSectionState(section)
    window.location.hash = `#/${section}`
  }, [])

  const addToast = useCallback(
    (type: 'success' | 'error' | 'info', message: string, title?: string) => {
      const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5)
      setToasts((prev) => [...prev, { id, type, message, title }])
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id))
      }, 3500)
    },
    [],
  )

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  // Snapshots
  const clients = useMemo(() => DataStore.getClients(), [DataStore.getDataSnapshot()])
  const proposals = useMemo(() => DataStore.getProposals(), [DataStore.getDataSnapshot()])
  const serviceOrders = useMemo(() => DataStore.getServiceOrders(), [DataStore.getDataSnapshot()])
  const invoices = useMemo(() => DataStore.getInvoices(), [DataStore.getDataSnapshot()])
  const charges = useMemo(() => DataStore.getCharges(), [DataStore.getDataSnapshot()])
  const activities = useMemo(() => DataStore.getActivities(), [DataStore.getDataSnapshot()])
  const companySettings = useMemo(
    () => DataStore.getCompanySettings(),
    [DataStore.getDataSnapshot()],
  )
  const userProfile = useMemo(() => DataStore.getUserProfile(), [DataStore.getDataSnapshot()])

  // Mutators com feedback
  const saveClient = useCallback(
    (client: Omit<Client, 'id' | 'createdAt'> & { id?: string }) => {
      const res = DataStore.saveClient(client)
      addToast('success', `Cliente ${res.name} gravado com sucesso!`)
      return res
    },
    [addToast],
  )

  const deleteClient = useCallback(
    (id: string) => {
      DataStore.deleteClient(id)
      addToast('info', 'Cliente removido com sucesso.')
    },
    [addToast],
  )

  const saveProposal = useCallback(
    (proposal: Omit<Proposal, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string }) => {
      const res = DataStore.saveProposal(proposal)
      addToast('success', `Proposta ${res.code} salva com sucesso!`)
      return res
    },
    [addToast],
  )

  const updateProposalStatus = useCallback(
    (id: string, status: Proposal['status']) => {
      DataStore.updateProposalStatus(id, status)
      addToast('info', `Status da proposta alterado para ${status.toUpperCase()}`)
    },
    [addToast],
  )

  const deleteProposal = useCallback(
    (id: string) => {
      DataStore.deleteProposal(id)
      addToast('info', 'Proposta excluída.')
    },
    [addToast],
  )

  const saveServiceOrder = useCallback(
    (os: Omit<ServiceOrder, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string }) => {
      const res = DataStore.saveServiceOrder(os)
      addToast('success', `Ordem de Serviço ${res.code} gravada com sucesso!`)
      return res
    },
    [addToast],
  )

  const completeServiceOrder = useCallback(
    (id: string) => {
      DataStore.completeServiceOrder(id)
      addToast('success', 'Ordem de serviço marcada como CONCLUÍDA!')
    },
    [addToast],
  )

  const updateServiceOrderStatus = useCallback(
    (id: string, status: ServiceOrder['status']) => {
      DataStore.updateServiceOrderStatus(id, status)
      addToast('info', `Status da OS atualizado para ${status.replace('_', ' ').toUpperCase()}`)
    },
    [addToast],
  )

  const saveInvoice = useCallback(
    (invoice: Omit<Invoice, 'id' | 'number' | 'createdAt'> & { id?: string; number?: string }) => {
      const res = DataStore.saveInvoice(invoice)
      addToast('success', `Nota Fiscal ${res.number} emitida com sucesso!`)
      return res
    },
    [addToast],
  )

  const updateInvoiceStatus = useCallback(
    (id: string, status: Invoice['status']) => {
      DataStore.updateInvoiceStatus(id, status)
      addToast('success', `Nota Fiscal atualizada para status ${status.toUpperCase()}!`)
    },
    [addToast],
  )

  const saveCharge = useCallback(
    (
      charge: Omit<Charge, 'id' | 'code' | 'createdAt' | 'method'> & { id?: string; code?: string },
    ) => {
      const res = DataStore.saveCharge(charge)
      addToast('success', `Boleto ${res.code} criado com sucesso!`)
      return res
    },
    [addToast],
  )

  const registerPayment = useCallback(
    (id: string) => {
      DataStore.registerPayment(id)
      addToast('success', 'Pagamento recebido e registrado com sucesso!')
    },
    [addToast],
  )

  const cancelCharge = useCallback(
    (id: string) => {
      DataStore.cancelCharge(id)
      addToast('info', 'Cobrança cancelada.')
    },
    [addToast],
  )

  const saveCompanySettings = useCallback(
    (settings: CompanySettings) => {
      DataStore.saveCompanySettings(settings)
      addToast('success', 'Dados da empresa atualizados com sucesso!')
    },
    [addToast],
  )

  const saveUserProfile = useCallback(
    (profile: UserProfile) => {
      DataStore.saveUserProfile(profile)
      addToast('success', 'Perfil de usuário atualizado com sucesso!')
    },
    [addToast],
  )

  const resetToSampleData = useCallback(() => {
    DataStore.resetToSampleData()
    addToast('info', 'Dados de exemplo restaurados com sucesso!')
  }, [addToast])

  const exportDataJSON = useCallback(() => {
    return DataStore.exportDataJSON()
  }, [])

  const value: CRMContextType = {
    activeSection,
    setActiveSection,
    globalSearch,
    setGlobalSearch,
    clients,
    proposals,
    serviceOrders,
    invoices,
    charges,
    activities,
    companySettings,
    userProfile,
    quickAction,
    setQuickAction,
    toasts,
    addToast,
    removeToast,
    saveClient,
    deleteClient,
    saveProposal,
    updateProposalStatus,
    deleteProposal,
    saveServiceOrder,
    completeServiceOrder,
    updateServiceOrderStatus,
    saveInvoice,
    updateInvoiceStatus,
    saveCharge,
    registerPayment,
    cancelCharge,
    saveCompanySettings,
    saveUserProfile,
    resetToSampleData,
    exportDataJSON,
  }

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>
}

export const useCRM = (): CRMContextType => {
  const context = useContext(CRMContext)
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider')
  }
  return context
}
