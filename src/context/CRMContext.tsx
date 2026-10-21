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
import pb from '@/lib/pocketbase/client'

interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  title?: string
}

interface CRMContextType {
  // Auth
  isAuthenticated: boolean
  currentUser: any | null
  logout: () => void
  refreshData: () => Promise<void>
  isDataLoading: boolean
  isDataLoaded: boolean
  dataError: string | null

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
  saveClient: (client: Omit<Client, 'id' | 'createdAt'> & { id?: string }) => Promise<Client>
  deleteClient: (id: string) => Promise<void>
  saveProposal: (
    proposal: Omit<Proposal, 'id' | 'code' | 'createdAt'> & {
      id?: string
      code?: string
      zapsignDocToken?: string
      signatureLink?: string
      signedAt?: string
    },
  ) => Promise<Proposal>
  updateProposalStatus: (id: string, status: Proposal['status']) => Promise<void>
  deleteProposal: (id: string) => Promise<void>
  enviarParaAssinatura: (proposalId: string) => Promise<{ signatureUrl: string; docToken: string }>
  saveServiceOrder: (
    os: Omit<ServiceOrder, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string },
  ) => Promise<ServiceOrder>
  completeServiceOrder: (id: string) => Promise<void>
  updateServiceOrderStatus: (id: string, status: ServiceOrder['status']) => Promise<void>
  saveInvoice: (
    invoice: Omit<Invoice, 'id' | 'number' | 'createdAt'> & { id?: string; number?: string },
  ) => Promise<Invoice>
  updateInvoiceStatus: (id: string, status: Invoice['status']) => Promise<void>
  saveCharge: (
    charge: Omit<Charge, 'id' | 'code' | 'createdAt' | 'method'> & { id?: string; code?: string },
  ) => Promise<Charge>
  checkAndExpireCharges: () => Promise<number>
  registerPayment: (id: string) => Promise<void>
  cancelCharge: (id: string) => Promise<void>
  saveCompanySettings: (settings: CompanySettings) => void
  saveUserProfile: (profile: UserProfile) => Promise<void>
  resetToSampleData: () => Promise<void>
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

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => pb.authStore.isValid)
  const [currentUser, setCurrentUser] = useState<any>(() => pb.authStore.record)

  // Status de carregamento reativo do DataStore
  const [storeStatus, setStoreStatus] = useState(() => DataStore.getStatus())
  const [, setRevision] = useState(0)

  useEffect(() => {
    const unsubPb = pb.authStore.onChange((token, record) => {
      const valid = pb.authStore.isValid
      setIsAuthenticated(valid)
      setCurrentUser(record)
      if (valid) {
        DataStore.fetchAll().catch((e) => console.error(e))
      }
    })

    const unsubData = DataStore.subscribe(() => {
      setRevision((r) => r + 1)
      setStoreStatus(DataStore.getStatus())
    })

    if (pb.authStore.isValid && !DataStore.getStatus().isLoaded) {
      DataStore.fetchAll().catch((e) => console.error(e))
    }

    return () => {
      unsubPb()
      unsubData()
    }
  }, [])

  // Inscrições SSE de Tempo Real no PocketBase
  useEffect(() => {
    if (!isAuthenticated) return

    const collections = ['clientes', 'cobrancas', 'propostas', 'ordens_servico', 'notas_fiscais']
    let cancelled = false
    const unsubscribes: (() => void)[] = []

    collections.forEach((col) => {
      pb.collection(col)
        .subscribe('*', (e) => {
          if (!cancelled) {
            if (col === 'propostas' && e.action === 'update') {
              const oldProp = DataStore.getProposalById(e.record?.id)
              const newStatus = e.record?.status
              if (oldProp && oldProp.status !== 'assinada' && newStatus === 'assinada') {
                addToast(
                  'success',
                  `A proposta ${e.record?.codigo || oldProp.code} foi assinada com sucesso via ZapSign!`,
                  'Proposta assinada!',
                )
              }
            }
            DataStore.handleRealtimeEvent(col, e.action, e.record)
          }
        })
        .then((unsub) => {
          if (cancelled) {
            unsub()
          } else {
            unsubscribes.push(unsub)
          }
        })
        .catch((err) => {
          console.warn(`Realtime subscription error for ${col}:`, err)
        })
    })

    return () => {
      cancelled = true
      unsubscribes.forEach((unsub) => {
        try {
          unsub()
        } catch {
          /* intentionally ignored */
        }
      })
    }
  }, [isAuthenticated])

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

  const logout = useCallback(() => {
    pb.authStore.clear()
    setIsAuthenticated(false)
    setCurrentUser(null)
    DataStore.clearData()
    addToast('info', 'Sessão encerrada com sucesso.', 'Logout')
  }, [addToast])

  const refreshData = useCallback(async () => {
    try {
      await DataStore.fetchAll()
      addToast('success', 'Dados sincronizados com o banco de dados!', 'Atualizado')
    } catch (err: any) {
      addToast('error', err?.message || 'Falha ao sincronizar dados.', 'Erro de Conexão')
    }
  }, [addToast])

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
    async (client: Omit<Client, 'id' | 'createdAt'> & { id?: string }) => {
      try {
        const res = await DataStore.saveClient(client)
        addToast('success', `Cliente ${res.name} gravado com sucesso!`)
        return res
      } catch (err: any) {
        addToast('error', err?.message || 'Erro ao gravar cliente.', 'Falha')
        throw err
      }
    },
    [addToast],
  )

  const deleteClient = useCallback(
    async (id: string) => {
      try {
        await DataStore.deleteClient(id)
        addToast('info', 'Cliente removido com sucesso.')
      } catch (err: any) {
        addToast('error', err?.message || 'Erro ao remover cliente.', 'Falha')
        throw err
      }
    },
    [addToast],
  )

  const saveProposal = useCallback(
    async (
      proposal: Omit<Proposal, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string },
    ) => {
      try {
        const res = await DataStore.saveProposal(proposal)
        addToast('success', `Proposta ${res.code} salva com sucesso!`)
        return res
      } catch (err: any) {
        addToast('error', err?.message || 'Erro ao salvar proposta.', 'Falha')
        throw err
      }
    },
    [addToast],
  )

  const updateProposalStatus = useCallback(
    async (id: string, status: Proposal['status']) => {
      try {
        await DataStore.updateProposalStatus(id, status)
        addToast('info', `Status da proposta alterado para ${status.toUpperCase()}`)
      } catch (err: any) {
        addToast('error', err?.message || 'Erro ao atualizar status.', 'Falha')
      }
    },
    [addToast],
  )

  const deleteProposal = useCallback(
    async (id: string) => {
      try {
        await DataStore.deleteProposal(id)
        addToast('info', 'Proposta excluída com sucesso.')
      } catch (err: any) {
        addToast('error', err?.message || 'Erro ao excluir proposta.', 'Falha')
      }
    },
    [addToast],
  )

  const enviarParaAssinatura = useCallback(
    async (proposalId: string) => {
      try {
        const response = await pb.send('/propostas/enviar-assinatura', {
          method: 'POST',
          body: { id: proposalId },
        })

        const signatureUrl = response?.signature_url || response?.signatureUrl || ''
        const docToken = response?.doc_token || response?.docToken || ''

        addToast(
          'success',
          'Documento enviado para assinatura via ZapSign! Link disponível.',
          'ZapSign',
        )
        // Refresh local data to ensure proposal state is updated
        DataStore.fetchAll().catch(() => {})
        return { signatureUrl, docToken }
      } catch (err: any) {
        // Extrai a mensagem mais específica possível retornada pelo backend ou pela ZapSign
        const specificMsg =
          err?.response?.message ||
          err?.data?.message ||
          err?.originalError?.data?.message ||
          err?.response?.data?.message ||
          err?.message ||
          'Não foi possível concluir o envio da proposta para assinatura.'

        const errorDetails = err?.response?.details || err?.data?.details || ''
        const fullMessage =
          errorDetails && errorDetails !== specificMsg
            ? `${specificMsg} (${typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails)})`
            : specificMsg

        console.error('Falha ao enviar proposta para assinatura via ZapSign:', err)
        addToast('error', fullMessage, 'Assinatura ZapSign')
        throw err
      }
    },
    [addToast],
  )

  const saveServiceOrder = useCallback(
    async (
      os: Omit<ServiceOrder, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string },
    ) => {
      try {
        const res = await DataStore.saveServiceOrder(os)
        addToast('success', `Ordem de Serviço ${res.code} gravada com sucesso!`)
        return res
      } catch (err: any) {
        addToast('error', err?.message || 'Erro ao salvar OS.', 'Falha')
        throw err
      }
    },
    [addToast],
  )

  const completeServiceOrder = useCallback(
    async (id: string) => {
      try {
        await DataStore.completeServiceOrder(id)
        addToast('success', 'Ordem de serviço marcada como CONCLUÍDA!')
      } catch (err: any) {
        addToast('error', err?.message || 'Erro ao concluir OS.', 'Falha')
      }
    },
    [addToast],
  )

  const updateServiceOrderStatus = useCallback(
    async (id: string, status: ServiceOrder['status']) => {
      try {
        await DataStore.updateServiceOrderStatus(id, status)
        addToast('info', `Status da OS atualizado para ${status.replace('_', ' ').toUpperCase()}`)
      } catch (err: any) {
        addToast('error', err?.message || 'Erro ao atualizar OS.', 'Falha')
      }
    },
    [addToast],
  )

  const saveInvoice = useCallback(
    async (
      invoice: Omit<Invoice, 'id' | 'number' | 'createdAt'> & { id?: string; number?: string },
    ) => {
      try {
        const res = await DataStore.saveInvoice(invoice)
        addToast('success', `Nota Fiscal ${res.number} emitida com sucesso!`)
        return res
      } catch (err: any) {
        addToast('error', err?.message || 'Erro ao emitir nota fiscal.', 'Falha')
        throw err
      }
    },
    [addToast],
  )

  const updateInvoiceStatus = useCallback(
    async (id: string, status: Invoice['status']) => {
      try {
        await DataStore.updateInvoiceStatus(id, status)
        addToast('success', `Nota Fiscal atualizada para status ${status.toUpperCase()}!`)
      } catch (err: any) {
        addToast('error', err?.message || 'Erro ao atualizar status da nota.', 'Falha')
      }
    },
    [addToast],
  )

  const saveCharge = useCallback(
    async (
      charge: Omit<Charge, 'id' | 'code' | 'createdAt' | 'method'> & { id?: string; code?: string },
    ) => {
      try {
        const res = await DataStore.saveCharge(charge)
        addToast('success', `Cobrança ${res.code} criada com sucesso!`)
        return res
      } catch (err: any) {
        addToast('error', err?.message || 'Erro ao salvar cobrança.', 'Falha')
        throw err
      }
    },
    [addToast],
  )

  const checkAndExpireCharges = useCallback(async () => {
    return DataStore.checkAndExpireCharges()
  }, [])

  const registerPayment = useCallback(
    async (id: string) => {
      try {
        await DataStore.registerPayment(id)
        addToast('success', 'Pagamento recebido e registrado com sucesso!')
      } catch (err: any) {
        addToast('error', err?.message || 'Erro ao registrar pagamento.', 'Falha')
      }
    },
    [addToast],
  )

  const cancelCharge = useCallback(
    async (id: string) => {
      try {
        await DataStore.cancelCharge(id)
        addToast('info', 'Cobrança cancelada.')
      } catch (err: any) {
        addToast('error', err?.message || 'Erro ao cancelar cobrança.', 'Falha')
      }
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
    async (profile: UserProfile) => {
      try {
        await DataStore.saveUserProfile(profile)
        addToast('success', 'Perfil de usuário atualizado com sucesso!')
      } catch (err: any) {
        addToast('error', err?.message || 'Erro ao atualizar perfil.', 'Falha')
      }
    },
    [addToast],
  )

  const resetToSampleData = useCallback(async () => {
    try {
      await DataStore.resetToSampleData()
      addToast('info', 'Dados sincronizados do banco de dados PocketBase!')
    } catch (err: any) {
      addToast('error', err?.message || 'Erro ao restaurar dados.')
    }
  }, [addToast])

  const exportDataJSON = useCallback(() => {
    return DataStore.exportDataJSON()
  }, [])

  const value: CRMContextType = {
    isAuthenticated,
    currentUser,
    logout,
    refreshData,
    isDataLoading: storeStatus.isLoading,
    isDataLoaded: storeStatus.isLoaded,
    dataError: storeStatus.error,
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
    enviarParaAssinatura,
    saveServiceOrder,
    completeServiceOrder,
    updateServiceOrderStatus,
    saveInvoice,
    updateInvoiceStatus,
    saveCharge,
    checkAndExpireCharges,
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
