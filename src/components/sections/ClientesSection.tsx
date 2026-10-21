import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Plus,
  Edit2,
  Eye,
  Mail,
  Phone,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  CreditCard,
  Building,
  User,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { useCRM } from '../../context/CRMContext'
import { Client, ClientType, ClientStatus } from '../../types/crm'
import { StatusBadge, EmptyState, TableSkeleton, ErrorState } from '../CommonUI'
import { Modal } from '../FeedbackAndModal'
import { ClientDetailsDrawer } from './ClientDetailsDrawer'
import {
  formatCurrency,
  formatDocument,
  maskDocument,
  isValidCPF,
  isValidCNPJ,
  formatNextChargeDate,
  calculateNextChargeDate,
} from '../../utils/formatters'
import { syncClientWithMultiFoco } from '../../services/multiFocoService'

type SortColumn = 'name' | 'document' | 'email' | 'phone' | 'status' | 'monthlyValue' | 'nextCharge'

export const ClientesSection: React.FC = () => {
  const {
    clients,
    proposals,
    serviceOrders,
    charges,
    invoices,
    companySettings,
    globalSearch,
    quickAction,
    setQuickAction,
    saveClient,
    setActiveSection,
    addToast,
    isDataLoading,
    isDataLoaded,
    dataError,
    refreshData,
  } = useCRM()

  // Filtros locais
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos')

  // Ordenação
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Modal de criação / edição
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  // Ficha / Painel Lateral do Cliente (Drawer)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Confirmação de ativação/desativação leve
  const [statusConfirmClient, setStatusConfirmClient] = useState<Client | null>(null)

  // Loading do Multi Foco
  const [isSyncing, setIsSyncing] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'PJ' as ClientType,
    document: '',
    email: '',
    phone: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    monthlyValue: '' as string | number,
    dueDay: '' as string | number,
    notes: '',
    status: 'ativo' as ClientStatus,
    multifoco_client_id: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Abre modal se disparado pela ação contextual rápida global
  useEffect(() => {
    if (quickAction.type === 'novo_cliente') {
      openCreateModal()
      setQuickAction({ type: null })
    }
  }, [quickAction, setQuickAction])

  // Mantém o selectedClient sincronizado com os dados mais recentes do DataStore
  useEffect(() => {
    if (selectedClient) {
      const fresh = clients.find((c) => c.id === selectedClient.id)
      if (fresh) setSelectedClient(fresh)
    }
  }, [clients])

  const openCreateModal = () => {
    setEditingClient(null)
    setFormData({
      name: '',
      type: 'PJ',
      document: '',
      email: '',
      phone: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: 'SP',
      monthlyValue: '0,00',
      dueDay: 10,
      notes: '',
      status: 'ativo',
      multifoco_client_id: '',
    })
    setErrors({})
    setIsFormOpen(true)
  }

  const openEditModal = (client: Client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      type: client.type || (client.document.replace(/\D/g, '').length === 11 ? 'PF' : 'PJ'),
      document: maskDocument(
        client.document,
        client.type || (client.document.replace(/\D/g, '').length === 11 ? 'PF' : 'PJ'),
      ),
      email: client.email,
      phone: client.phone,
      street: client.street || '',
      number: client.number || '',
      neighborhood: client.neighborhood || '',
      city: client.city || '',
      state: client.state || 'SP',
      monthlyValue:
        client.monthlyValue !== undefined
          ? client.monthlyValue.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '0,00',
      dueDay: client.dueDay || 10,
      notes: client.notes || '',
      status: client.status,
      multifoco_client_id: client.multifoco_client_id || '',
    })
    setErrors({})
    setIsFormOpen(true)
  }

  // Manipulador de troca de tipo PF / PJ no formulário
  const handleTypeChange = (newType: ClientType) => {
    const rawDoc = formData.document.replace(/\D/g, '')
    setFormData((prev) => ({
      ...prev,
      type: newType,
      document: maskDocument(rawDoc, newType),
    }))
    if (errors.document) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.document
        return next
      })
    }
  }

  // Manipulador de digitação do documento com máscara instantânea
  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const masked = maskDocument(raw, formData.type)
    setFormData((prev) => ({ ...prev, document: masked }))
    if (errors.document) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.document
        return next
      })
    }
  }

  // Validação client-side completa com dígito verificador módulo 11
  const validate = () => {
    const errs: Record<string, string> = {}

    if (!formData.name.trim()) {
      errs.name = 'O Nome / Razão Social é obrigatório.'
    }

    if (!formData.email.trim()) {
      errs.email = 'O E-mail é obrigatório.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Insira um e-mail com formato válido (ex: contato@empresa.com.br).'
    }

    if (!formData.phone.trim()) {
      errs.phone = 'O Telefone / WhatsApp é obrigatório.'
    }

    const cleanDoc = formData.document.replace(/\D/g, '')
    if (!formData.document.trim() || !cleanDoc) {
      errs.document = `O ${formData.type === 'PF' ? 'CPF' : 'CNPJ'} é obrigatório.`
    } else if (formData.type === 'PF') {
      if (cleanDoc.length !== 11) {
        errs.document = 'O CPF deve conter exatamente 11 dígitos.'
      } else if (!isValidCPF(cleanDoc)) {
        errs.document = 'CPF inválido: os dígitos verificadores não conferem.'
      }
    } else {
      if (cleanDoc.length !== 14) {
        errs.document = 'O CNPJ deve conter exatamente 14 dígitos.'
      } else if (!isValidCNPJ(cleanDoc)) {
        errs.document = 'CNPJ inválido: os dígitos verificadores não conferem.'
      }
    }

    const dueDayNum = Number(formData.dueDay)
    if (!formData.dueDay || isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) {
      errs.dueDay = 'Informe um dia de vencimento válido (entre 1 e 31).'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const parseMonthlyValue = (val: string | number): number => {
    if (typeof val === 'number') return val
    if (!val) return 0
    const clean = val
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.]/g, '')
    const n = parseFloat(clean)
    return isNaN(n) ? 0 : n
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const parsedValue = parseMonthlyValue(formData.monthlyValue)
    const dueDayNum = Math.min(31, Math.max(1, Number(formData.dueDay) || 10))

    const saved = await saveClient({
      id: editingClient ? editingClient.id : undefined,
      name: formData.name.trim(),
      type: formData.type,
      document: formData.document.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      street: formData.street.trim(),
      number: formData.number.trim(),
      neighborhood: formData.neighborhood.trim(),
      city: formData.city.trim(),
      state: formData.state.trim().toUpperCase(),
      monthlyValue: parsedValue,
      dueDay: dueDayNum,
      notes: formData.notes.trim(),
      status: formData.status,
      multifoco_client_id: formData.multifoco_client_id
        ? formData.multifoco_client_id.trim()
        : undefined,
    })

    if (selectedClient && selectedClient.id === saved.id) {
      setSelectedClient(saved)
    }

    setIsFormOpen(false)
  }

  // Ação de alternar status (ativo / inativo) com confirmação suave
  const handleToggleStatus = (client: Client) => {
    const nextStatus: ClientStatus = client.status === 'ativo' ? 'inativo' : 'ativo'
    saveClient({
      ...client,
      status: nextStatus,
    })
    setStatusConfirmClient(null)
    addToast('info', `Cliente "${client.name}" alterado para ${nextStatus.toUpperCase()}.`)
  }

  // Sincronização com Multi Foco
  const handleSyncMultiFoco = async (client: Client) => {
    const baseUrl = companySettings.multiFocoBaseUrl
    const token = companySettings.multiFocoApiToken

    if (!baseUrl || !baseUrl.trim()) {
      addToast(
        'error',
        'Configure a URL e o token do Multi Foco em Configurações para habilitar a sincronização.',
        'Integração Não Configurada',
      )
      return
    }

    setIsSyncing(true)
    addToast('info', `Consultando ${client.name} no Multi Foco...`, 'Buscando Cadastro')

    try {
      const res = await syncClientWithMultiFoco(client.document, baseUrl, token)

      if (res.success && res.clientId) {
        const updated = await saveClient({
          ...client,
          multifoco_client_id: res.clientId,
        })
        if (selectedClient && selectedClient.id === updated.id) {
          setSelectedClient(updated)
        }
        addToast(
          'success',
          `Cliente vinculado ao Multi Foco com ID: ${res.clientId}!`,
          'Sincronizado com Sucesso',
        )
      } else {
        addToast('error', res.message, 'Multi Foco')
      }
    } catch (err: any) {
      addToast(
        'error',
        err.message || 'Falha inesperada ao comunicar com o Multi Foco.',
        'Erro na Sincronização',
      )
    } finally {
      setIsSyncing(false)
    }
  }

  // Ordenação
  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDirection('asc')
    }
  }

  // Filtragem e Ordenação da Tabela
  const activeSearch = (globalSearch || searchTerm).trim().toLowerCase()
  const cleanSearchDigits = activeSearch.replace(/\D/g, '')

  const filteredAndSortedClients = useMemo(() => {
    const list = clients.filter((c) => {
      const matchStatus = statusFilter === 'todos' ? true : c.status === statusFilter
      if (!matchStatus) return false

      if (!activeSearch) return true

      const nameMatch = c.name.toLowerCase().includes(activeSearch)
      const emailMatch = c.email.toLowerCase().includes(activeSearch)
      const docRaw = c.document.replace(/\D/g, '')
      const docMatch =
        c.document.toLowerCase().includes(activeSearch) ||
        (cleanSearchDigits && docRaw.includes(cleanSearchDigits))
      const multiFocoMatch = c.multifoco_client_id?.toLowerCase().includes(activeSearch)

      return nameMatch || emailMatch || docMatch || multiFocoMatch
    })

    list.sort((a, b) => {
      let comparison = 0

      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
          break
        case 'document': {
          const docA = a.document.replace(/\D/g, '')
          const docB = b.document.replace(/\D/g, '')
          comparison = docA.localeCompare(docB)
          break
        }
        case 'email':
          comparison = a.email.localeCompare(b.email, 'pt-BR', { sensitivity: 'base' })
          break
        case 'phone':
          comparison = a.phone.localeCompare(b.phone)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'monthlyValue': {
          const valA = typeof a.monthlyValue === 'number' ? a.monthlyValue : 0
          const valB = typeof b.monthlyValue === 'number' ? b.monthlyValue : 0
          comparison = valA - valB
          break
        }
        case 'nextCharge': {
          const dateA = calculateNextChargeDate(a.dueDay).getTime()
          const dateB = calculateNextChargeDate(b.dueDay).getTime()
          comparison = dateA - dateB
          break
        }
        default:
          comparison = 0
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return list
  }, [clients, activeSearch, cleanSearchDigits, statusFilter, sortColumn, sortDirection])

  const renderSortIcon = (col: SortColumn) => {
    if (sortColumn !== col) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-[#5A6B7B]/60 inline-block ml-1" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#0F4C5C] inline-block ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#0F4C5C] inline-block ml-1" />
    )
  }

  if (!isDataLoaded && isDataLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-16 bg-white rounded-xl border border-[#E2E8F0] animate-pulse" />
        <TableSkeleton rows={6} />
      </div>
    )
  }

  if (dataError && !isDataLoaded) {
    return (
      <ErrorState
        title="Erro ao carregar Clientes"
        message={dataError}
        onRetry={() => refreshData()}
      />
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra de Filtros e Ação */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#5A6B7B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, documento ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C] focus:ring-2 focus:ring-[#0F4C5C]/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-lg text-[#1A202C] focus:outline-none focus:border-[#0F4C5C]"
            >
              <option value="todos">Status: Todos</option>
              <option value="ativo">Somente Ativos</option>
              <option value="inativo">Somente Inativos</option>
            </select>

            <span className="text-xs text-[#5A6B7B] hidden sm:inline px-1">
              {filteredAndSortedClients.length} de {clients.length}
            </span>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-sm font-semibold transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Listagem em Tabela Desktop / Cards Mobile */}
      {filteredAndSortedClients.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description="Não encontramos nenhum cliente com os filtros aplicados. Tente ajustar o termo de busca ou cadastre um novo cliente."
          actionLabel="Cadastrar Cliente"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Desktop Table com 7 colunas pedidas + Ações */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7F8FA] text-[#5A6B7B] text-xs uppercase font-semibold border-b border-[#E2E8F0] select-none">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3.5 px-4 cursor-pointer hover:text-[#0F4C5C] transition-colors"
                  >
                    <div className="flex items-center">
                      <span>Nome / Razão Social</span>
                      {renderSortIcon('name')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('document')}
                    className="py-3.5 px-4 cursor-pointer hover:text-[#0F4C5C] transition-colors"
                  >
                    <div className="flex items-center">
                      <span>Documento</span>
                      {renderSortIcon('document')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('email')}
                    className="py-3.5 px-4 cursor-pointer hover:text-[#0F4C5C] transition-colors"
                  >
                    <div className="flex items-center">
                      <span>E-mail</span>
                      {renderSortIcon('email')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('phone')}
                    className="py-3.5 px-4 cursor-pointer hover:text-[#0F4C5C] transition-colors"
                  >
                    <div className="flex items-center">
                      <span>Telefone</span>
                      {renderSortIcon('phone')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="py-3.5 px-3 cursor-pointer hover:text-[#0F4C5C] transition-colors"
                  >
                    <div className="flex items-center">
                      <span>Status</span>
                      {renderSortIcon('status')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('monthlyValue')}
                    className="py-3.5 px-4 cursor-pointer hover:text-[#0F4C5C] transition-colors text-right"
                  >
                    <div className="flex items-center justify-end">
                      <span>Valor Mensal</span>
                      {renderSortIcon('monthlyValue')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('nextCharge')}
                    className="py-3.5 px-4 cursor-pointer hover:text-[#0F4C5C] transition-colors text-right"
                  >
                    <div className="flex items-center justify-end">
                      <span>Próx. Cobrança</span>
                      {renderSortIcon('nextCharge')}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredAndSortedClients.map((client) => {
                  const monthly = client.monthlyValue || 0
                  const isSync = !!client.multifoco_client_id

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-[#F7F8FA]/70 transition-colors group cursor-pointer"
                      onClick={() => setSelectedClient(client)}
                    >
                      {/* Nome ou Razão Social + badge PF/PJ + tag Multi Foco */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1A202C] group-hover:text-[#0F4C5C] transition-colors">
                            {client.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {client.type ||
                              (client.document.replace(/\D/g, '').length === 11 ? 'PF' : 'PJ')}
                          </span>
                        </div>
                        {isSync && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#2E9E6B] font-medium mt-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>MF: {client.multifoco_client_id}</span>
                          </span>
                        )}
                      </td>

                      {/* Documento */}
                      <td className="py-3.5 px-4 text-xs text-[#1A202C] font-mono whitespace-nowrap">
                        {formatDocument(client.document)}
                      </td>

                      {/* E-mail */}
                      <td
                        className="py-3.5 px-4 text-xs text-[#5A6B7B] max-w-[200px] truncate"
                        title={client.email}
                      >
                        {client.email}
                      </td>

                      {/* Telefone */}
                      <td className="py-3.5 px-4 text-xs text-[#5A6B7B] whitespace-nowrap">
                        {client.phone}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <StatusBadge status={client.status} type="client" />
                      </td>

                      {/* Valor Mensal */}
                      <td className="py-3.5 px-4 text-xs font-semibold text-[#1A202C] text-right whitespace-nowrap">
                        {formatCurrency(monthly)}
                      </td>

                      {/* Próxima Cobrança */}
                      <td className="py-3.5 px-4 text-xs text-right whitespace-nowrap">
                        <span className="text-[#1A202C] font-medium">
                          {formatNextChargeDate(client.dueDay)}
                        </span>
                        <span className="text-[11px] text-[#5A6B7B] block">
                          venc. dia {client.dueDay || 10}
                        </span>
                      </td>

                      {/* Ações por linha: editar, desativar/ativar e ver ficha */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedClient(client)}
                            title="Ver Ficha Completa"
                            className="p-1.5 text-[#5A6B7B] hover:text-[#0F4C5C] hover:bg-[#0F4C5C]/10 rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(client)}
                            title="Editar Cliente"
                            className="p-1.5 text-[#5A6B7B] hover:text-[#0F4C5C] hover:bg-[#0F4C5C]/10 rounded-md transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setStatusConfirmClient(client)}
                            title={
                              client.status === 'ativo' ? 'Desativar Cliente' : 'Ativar Cliente'
                            }
                            className={`p-1.5 rounded-md transition-colors ${
                              client.status === 'ativo'
                                ? 'text-[#5A6B7B] hover:text-[#C0392B] hover:bg-[#C0392B]/10'
                                : 'text-[#5A6B7B] hover:text-[#2E9E6B] hover:bg-[#2E9E6B]/10'
                            }`}
                          >
                            {client.status === 'ativo' ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Cards */}
          <div className="lg:hidden divide-y divide-[#E2E8F0]">
            {filteredAndSortedClients.map((client) => {
              const isSync = !!client.multifoco_client_id

              return (
                <div
                  key={client.id}
                  className="p-4 space-y-3 hover:bg-[#F7F8FA] transition-colors"
                  onClick={() => setSelectedClient(client)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-[#1A202C]">{client.name}</h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {client.type ||
                            (client.document.replace(/\D/g, '').length === 11 ? 'PF' : 'PJ')}
                        </span>
                      </div>
                      <p className="text-xs text-[#5A6B7B] font-mono mt-0.5">
                        {formatDocument(client.document)}
                      </p>
                      {isSync && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#2E9E6B] font-medium mt-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Multi Foco: {client.multifoco_client_id}</span>
                        </span>
                      )}
                    </div>
                    <StatusBadge status={client.status} type="client" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-[#5A6B7B] pt-1 border-t border-[#E2E8F0]/60">
                    <div>
                      <span className="text-[10px] text-[#5A6B7B] uppercase block">
                        Valor Mensal
                      </span>
                      <span className="font-semibold text-[#1A202C]">
                        {formatCurrency(client.monthlyValue || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#5A6B7B] uppercase block">
                        Próx. Cobrança
                      </span>
                      <span className="font-semibold text-[#1A202C]">
                        {formatNextChargeDate(client.dueDay)} (dia {client.dueDay || 10})
                      </span>
                    </div>
                    <div className="col-span-2 space-y-1 pt-1">
                      <div className="flex items-center gap-1.5 text-xs text-[#5A6B7B] truncate">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#5A6B7B]">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setSelectedClient(client)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#0F4C5C] bg-[#0F4C5C]/10 rounded-md hover:bg-[#0F4C5C]/20 transition-colors"
                    >
                      Ver Ficha
                    </button>
                    <button
                      onClick={() => openEditModal(client)}
                      className="p-1.5 text-[#5A6B7B] hover:text-[#0F4C5C] rounded-md"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setStatusConfirmClient(client)}
                      className={`p-1.5 rounded-md ${
                        client.status === 'ativo'
                          ? 'text-[#5A6B7B] hover:text-[#C0392B]'
                          : 'text-[#5A6B7B] hover:text-[#2E9E6B]'
                      }`}
                      title={client.status === 'ativo' ? 'Desativar' : 'Ativar'}
                    >
                      {client.status === 'ativo' ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal Criar / Editar Cliente */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
        subtitle="Preencha os dados cadastrais, regras de cobrança e identificação fiscal"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Seletor Tipo (PF ou PJ) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1.5">
                Tipo de Cliente *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleTypeChange('PJ')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-xs font-semibold transition-all ${
                    formData.type === 'PJ'
                      ? 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-sm'
                      : 'bg-[#F7F8FA] text-[#5A6B7B] border-[#E2E8F0] hover:bg-slate-100'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>Pessoa Jurídica (PJ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('PF')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-xs font-semibold transition-all ${
                    formData.type === 'PF'
                      ? 'bg-[#0F4C5C] text-white border-[#0F4C5C] shadow-sm'
                      : 'bg-[#F7F8FA] text-[#5A6B7B] border-[#E2E8F0] hover:bg-slate-100'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Pessoa Física (PF)</span>
                </button>
              </div>
            </div>

            {/* Nome Completo ou Razão Social */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                {formData.type === 'PF' ? 'Nome Completo *' : 'Razão Social / Nome da Empresa *'}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: '' })
                }}
                placeholder={
                  formData.type === 'PF' ? 'Ex: Carlos Silva' : 'Ex: Sigma Tecnologia Ltda'
                }
                className={`w-full px-3 py-2 text-sm bg-[#FFFFFF] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 ${
                  errors.name ? 'border-[#C0392B] bg-red-50/20' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.name && <p className="text-xs text-[#C0392B] mt-1">{errors.name}</p>}
            </div>

            {/* Documento com máscara e validação */}
            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1 flex items-center justify-between">
                <span>{formData.type === 'PF' ? 'CPF *' : 'CNPJ *'}</span>
                <span className="text-[11px] text-[#5A6B7B] font-normal">
                  {formData.type === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                </span>
              </label>
              <input
                type="text"
                value={formData.document}
                onChange={handleDocumentChange}
                placeholder={formData.type === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
                className={`w-full px-3 py-2 text-sm font-mono bg-[#FFFFFF] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 ${
                  errors.document ? 'border-[#C0392B] bg-red-50/20' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.document && <p className="text-xs text-[#C0392B] mt-1">{errors.document}</p>}
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Status Cadastral
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                E-mail Principal *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  if (errors.email) setErrors({ ...errors, email: '' })
                }}
                placeholder="contato@empresa.com.br"
                className={`w-full px-3 py-2 text-sm bg-[#FFFFFF] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 ${
                  errors.email ? 'border-[#C0392B] bg-red-50/20' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.email && <p className="text-xs text-[#C0392B] mt-1">{errors.email}</p>}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Telefone / WhatsApp *
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value })
                  if (errors.phone) setErrors({ ...errors, phone: '' })
                }}
                placeholder="(11) 99999-8888"
                className={`w-full px-3 py-2 text-sm bg-[#FFFFFF] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 ${
                  errors.phone ? 'border-[#C0392B] bg-red-50/20' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.phone && <p className="text-xs text-[#C0392B] mt-1">{errors.phone}</p>}
            </div>

            {/* Regras Financeiras / Mensalidade */}
            <div className="sm:col-span-2 pt-2 border-t border-[#E2E8F0]">
              <h5 className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#0F4C5C]" />
                <span>Cobrança Recorrente</span>
              </h5>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Valor Mensal (R$)
              </label>
              <input
                type="text"
                value={formData.monthlyValue}
                onChange={(e) => setFormData({ ...formData, monthlyValue: e.target.value })}
                placeholder="Ex: 2.200,00"
                className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
              <p className="text-[11px] text-[#5A6B7B] mt-1">
                Valor do contrato ou assinatura mensal
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Dia de Vencimento (1 a 31) *
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={formData.dueDay}
                onChange={(e) => {
                  setFormData({ ...formData, dueDay: e.target.value })
                  if (errors.dueDay) setErrors({ ...errors, dueDay: '' })
                }}
                placeholder="10"
                className={`w-full px-3 py-2 text-sm bg-[#FFFFFF] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 ${
                  errors.dueDay ? 'border-[#C0392B] bg-red-50/20' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.dueDay && <p className="text-xs text-[#C0392B] mt-1">{errors.dueDay}</p>}
            </div>

            {/* Campo multifoco_client_id: somente leitura no formulário */}
            <div className="sm:col-span-2 pt-2 border-t border-[#E2E8F0]">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-[#0F4C5C]" />
                  <span>ID Multi Foco (multifoco_client_id)</span>
                </span>
                {formData.multifoco_client_id ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E9E6B]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sincronizado</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-[#5A6B7B]">Não sincronizado</span>
                )}
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={formData.multifoco_client_id || ''}
                placeholder="Preenchido automaticamente após sincronização com Multi Foco"
                className="w-full px-3 py-2 text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-lg text-[#5A6B7B] cursor-not-allowed select-none"
              />
              <p className="text-[11px] text-[#5A6B7B] mt-1">
                {formData.multifoco_client_id
                  ? 'Este cliente já está vinculado ao Multi Foco. O ID é de leitura somente.'
                  : 'Campo preenchido após sincronização com o Multi Foco através da busca por documento.'}
              </p>
            </div>

            {/* Endereço */}
            <div className="sm:col-span-2 pt-2 border-t border-[#E2E8F0]">
              <h5 className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>Endereço</span>
              </h5>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">Logradouro</label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="Av. Paulista, Rua das Flores..."
                className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">Número</label>
              <input
                type="text"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                placeholder="100, Bloco B"
                className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">Bairro</label>
              <input
                type="text"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                placeholder="Centro, Jardins..."
                className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">Cidade</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="São Paulo, Curitiba..."
                className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">UF (Estado)</label>
              <input
                type="text"
                maxLength={2}
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                placeholder="SP"
                className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Observações Internas
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Particularidades contratuais, SLAs, preferências..."
                className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 border border-[#E2E8F0] text-[#5A6B7B] hover:text-[#1A202C] rounded-lg text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
            >
              {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmação Leve de Ativar / Desativar */}
      <Modal
        isOpen={!!statusConfirmClient}
        onClose={() => setStatusConfirmClient(null)}
        title={statusConfirmClient?.status === 'ativo' ? 'Desativar Cliente' : 'Reativar Cliente'}
        subtitle={statusConfirmClient?.name || ''}
        maxWidth="sm"
      >
        {statusConfirmClient && (
          <div className="space-y-4">
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2.5 ${
                statusConfirmClient.status === 'ativo'
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {statusConfirmClient.status === 'ativo'
                    ? 'Deseja marcar este cliente como Inativo?'
                    : 'Deseja reativar este cliente?'}
                </p>
                <p className="mt-1 text-[11px]">
                  {statusConfirmClient.status === 'ativo'
                    ? 'O cadastro será preservado e continuará acessível para consulta histórica no CRM.'
                    : 'O cliente voltará a constar como ativo no faturamento e relatórios.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusConfirmClient(null)}
                className="px-3 py-1.5 border border-[#E2E8F0] text-xs font-semibold text-[#5A6B7B] hover:text-[#1A202C] rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(statusConfirmClient)}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors ${
                  statusConfirmClient.status === 'ativo'
                    ? 'bg-[#C0392B] hover:bg-red-700'
                    : 'bg-[#2E9E6B] hover:bg-emerald-700'
                }`}
              >
                {statusConfirmClient.status === 'ativo'
                  ? 'Confirmar Desativação'
                  : 'Confirmar Ativação'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Ficha do Cliente: Painel Lateral (Drawer) */}
      <ClientDetailsDrawer
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onEdit={(c) => {
          setSelectedClient(null)
          openEditModal(c)
        }}
        onToggleStatus={(c) => setStatusConfirmClient(c)}
        onSyncMultiFoco={handleSyncMultiFoco}
        isSyncing={isSyncing}
        proposals={proposals}
        serviceOrders={serviceOrders}
        charges={charges}
        invoices={invoices}
        onNavigateSection={(sec) => {
          setSelectedClient(null)
          setActiveSection(sec)
        }}
      />
    </div>
  )
}
