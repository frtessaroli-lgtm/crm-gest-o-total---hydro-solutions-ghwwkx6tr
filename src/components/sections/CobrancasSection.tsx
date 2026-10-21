import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Copy,
  Download,
  AlertTriangle,
  RotateCcw,
  Check,
  Calendar,
  User,
  Filter,
  DollarSign,
  ArrowUpDown,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useCRM } from '../../context/CRMContext'
import { Charge, ChargeStatus } from '../../types/crm'
import { StatusBadge, EmptyState, TableSkeleton, ErrorState } from '../CommonUI'
import { Modal } from '../FeedbackAndModal'
import {
  formatCurrency,
  formatDate,
  calculateDaysOverdue,
  generateDigitableLine,
  maskDigitableLine,
  formatCompetence,
} from '../../utils/formatters'

const FILTERS_STORAGE_KEY = 'nexocrm_cobrancas_filters'

type SortField = 'dueDate' | 'value' | 'clientName' | 'competence' | 'code'
type SortOrder = 'asc' | 'desc'

export const CobrancasSection: React.FC = () => {
  const {
    charges,
    clients,
    globalSearch,
    saveCharge,
    checkAndExpireCharges,
    registerPayment,
    cancelCharge,
    quickAction,
    setQuickAction,
    addToast,
    isDataLoading,
    isDataLoaded,
    dataError,
    refreshData,
  } = useCRM()
  // Efeito de auto-vencimento ao montar ou carregar a seção
  useEffect(() => {
    checkAndExpireCharges()
  }, [checkAndExpireCharges])

  // Recupera filtros persistidos do localStorage
  const savedFilters = useMemo(() => {
    try {
      const stored = localStorage.getItem(FILTERS_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // Ignora erro
    }
    return null
  }, [])

  const [searchTerm, setSearchTerm] = useState<string>(savedFilters?.search || '')
  const [statusFilter, setStatusFilter] = useState<
    'Todos' | 'Emitido' | 'Pago' | 'Vencido' | 'Cancelado'
  >(savedFilters?.status || 'Todos')
  const [competenceFilter, setCompetenceFilter] = useState<string>(
    savedFilters?.competence || 'todas',
  )
  const [clientFilter, setClientFilter] = useState<string>(savedFilters?.clientId || 'todos')

  // Ordenação
  const [sortField, setSortField] = useState<SortField>(savedFilters?.sortField || 'dueDate')
  const [sortOrder, setSortOrder] = useState<SortOrder>(savedFilters?.sortOrder || 'desc')

  // Copiado feedback
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Persiste filtros no localStorage sempre que mudarem
  useEffect(() => {
    try {
      localStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({
          search: searchTerm,
          status: statusFilter,
          competence: competenceFilter,
          clientId: clientFilter,
          sortField,
          sortOrder,
        }),
      )
    } catch {
      // safe fallback
    }
  }, [searchTerm, statusFilter, competenceFilter, clientFilter, sortField, sortOrder])

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [cancelModalCharge, setCancelModalCharge] = useState<Charge | null>(null)

  // Form State para Nova Cobrança
  const [clientId, setClientId] = useState('')
  const [competenceMonth, setCompetenceMonth] = useState<number>(new Date().getMonth() + 1)
  const [competenceYear, setCompetenceYear] = useState<number>(new Date().getFullYear())
  const [value, setValue] = useState<number>(0)
  const [dueDate, setDueDate] = useState<string>('')
  const [repeatMonths, setRepeatMonths] = useState<number>(1) // 1 = só a atual; >1 = repete por N meses seguintes
  const [enableRepeat, setEnableRepeat] = useState<boolean>(false)
  const [description, setDescription] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Listener para Quick Action do Header ("Nova Cobrança")
  useEffect(() => {
    if (quickAction.type === 'nova_cobranca') {
      openCreateModal()
      setQuickAction({ type: null })
    }
  }, [quickAction])

  // Quando seleciona cliente ou muda competência, pré-preenche valor e vencimento
  const handleClientChange = (
    selectedClientId: string,
    month = competenceMonth,
    year = competenceYear,
  ) => {
    setClientId(selectedClientId)
    const selClient = clients.find((c) => c.id === selectedClientId)
    if (selClient) {
      if (typeof selClient.monthlyValue === 'number' && selClient.monthlyValue > 0) {
        setValue(selClient.monthlyValue)
      } else {
        setValue(1500)
      }
      const dueDay = selClient.dueDay || 10
      // Calcula data no mês/ano da competência selecionada
      const daysInMonth = new Date(year, month, 0).getDate()
      const clampedDay = Math.min(dueDay, daysInMonth)
      const formattedMonth = String(month).padStart(2, '0')
      const formattedDay = String(clampedDay).padStart(2, '0')
      setDueDate(`${year}-${formattedMonth}-${formattedDay}`)
      if (!description.trim()) {
        setDescription(`Mensalidade de Serviços - ${selClient.name}`)
      }
    }
  }

  const handleCompetenceChange = (month: number, year: number) => {
    setCompetenceMonth(month)
    setCompetenceYear(year)
    const selClient = clients.find((c) => c.id === clientId)
    const dueDay = selClient?.dueDay || 10
    const daysInMonth = new Date(year, month, 0).getDate()
    const clampedDay = Math.min(dueDay, daysInMonth)
    const formattedMonth = String(month).padStart(2, '0')
    const formattedDay = String(clampedDay).padStart(2, '0')
    setDueDate(`${year}-${formattedMonth}-${formattedDay}`)
  }

  const openCreateModal = () => {
    const defaultClient = clients[0]
    const curDate = new Date()
    const curMonth = curDate.getMonth() + 1
    const curYear = curDate.getFullYear()

    setClientId(defaultClient ? defaultClient.id : '')
    setCompetenceMonth(curMonth)
    setCompetenceYear(curYear)
    setEnableRepeat(false)
    setRepeatMonths(1)
    setErrors({})

    if (defaultClient) {
      setValue(defaultClient.monthlyValue || 1500)
      const dueDay = defaultClient.dueDay || 10
      const daysInMonth = new Date(curYear, curMonth, 0).getDate()
      const clampedDay = Math.min(dueDay, daysInMonth)
      setDueDate(
        `${curYear}-${String(curMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`,
      )
      setDescription(`Mensalidade de Serviços - ${defaultClient.name}`)
    } else {
      setValue(1500)
      setDueDate(`${curYear}-${String(curMonth).padStart(2, '0')}-10`)
      setDescription('Mensalidade de Suporte & Manutenção')
    }

    setIsFormOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!clientId) errs.clientId = 'Selecione o cliente pagador.'
    if (value <= 0 || isNaN(value)) errs.value = 'O valor da cobrança deve ser maior que zero.'
    if (!dueDate) errs.dueDate = 'Data de vencimento é obrigatória.'
    if (!competenceMonth || !competenceYear) errs.competence = 'Competência é obrigatória.'
    if (enableRepeat && (repeatMonths < 1 || repeatMonths > 24)) {
      errs.repeatMonths = 'Defina a repetição entre 1 e 24 meses.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const selClient = clients.find((c) => c.id === clientId)
    const clientName = selClient ? selClient.name : 'Cliente'
    const dueDay = selClient?.dueDay || parseInt(dueDate.split('-')[2], 10) || 10

    const totalToGenerate = enableRepeat ? Math.max(1, repeatMonths) : 1
    let curM = competenceMonth
    let curY = competenceYear

    for (let i = 0; i < totalToGenerate; i++) {
      const compStr = `${String(curM).padStart(2, '0')}/${curY}`
      const daysInM = new Date(curY, curM, 0).getDate()
      const cDay = Math.min(dueDay, daysInM)
      const thisDueDate = `${curY}-${String(curM).padStart(2, '0')}-${String(cDay).padStart(2, '0')}`

      saveCharge({
        clientId,
        clientName,
        description: description.trim() || `Mensalidade ${compStr} - ${clientName}`,
        competence: compStr,
        value: Number(value),
        dueDate: thisDueDate,
        status: 'Emitido',
        digitableLine: generateDigitableLine(),
      })

      // Incrementa mês para próxima repetição
      curM++
      if (curM > 12) {
        curM = 1
        curY++
      }
    }

    if (totalToGenerate > 1) {
      addToast(
        'success',
        `${totalToGenerate} cobranças geradas com sucesso para os próximos meses!`,
      )
    }

    setIsFormOpen(false)
  }

  // Ações por linha
  const handleCopyDigitableLine = async (charge: Charge) => {
    const line = charge.digitableLine || generateDigitableLine()
    try {
      await navigator.clipboard.writeText(line)
      setCopiedId(charge.id)
      setTimeout(() => setCopiedId(null), 2000)
      addToast('success', 'Linha digitável copiada para a área de transferência!', 'Copiado')
    } catch {
      // Fallback manual de cópia se o clipboard API falhar
      const textarea = document.createElement('textarea')
      textarea.value = line
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedId(charge.id)
      setTimeout(() => setCopiedId(null), 2000)
      addToast('success', 'Linha digitável copiada!', 'Copiado')
    }
  }

  const handleDownloadDuplicate = (charge: Charge) => {
    addToast(
      'info',
      `A emissão do PDF de 2ª via do boleto (${charge.code}) será integrada na emissão real de boleto.`,
      'Download de 2ª Via',
    )
  }

  const handleConfirmCancel = () => {
    if (cancelModalCharge) {
      cancelCharge(cancelModalCharge.id)
      setCancelModalCharge(null)
      addToast('info', `Cobrança ${cancelModalCharge.code} cancelada com sucesso.`)
    }
  }

  // Lista de competências distintas encontradas nos dados para o filtro
  const availableCompetences = useMemo(() => {
    const comps = new Set<string>()
    charges.forEach((c) => {
      if (c.competence) comps.add(c.competence)
      else if (c.dueDate) {
        const parts = c.dueDate.split('-')
        if (parts.length >= 2) comps.add(`${parts[1]}/${parts[0]}`)
      }
    })
    return Array.from(comps).sort().reverse()
  }, [charges])

  // Normalizador de status
  const normalizeStatus = (status: ChargeStatus): 'Emitido' | 'Pago' | 'Vencido' | 'Cancelado' => {
    if (status === 'em_aberto' || status === 'Emitido') return 'Emitido'
    if (status === 'pago' || status === 'Pago') return 'Pago'
    if (status === 'em_atraso' || status === 'Vencido') return 'Vencido'
    return 'Cancelado'
  }

  // Resumo financeiro no topo
  const metrics = useMemo(() => {
    let pago = 0
    let emitido = 0
    let vencido = 0
    let cancelado = 0
    let countPago = 0
    let countEmitido = 0
    let countVencido = 0
    let countCancelado = 0

    charges.forEach((c) => {
      const st = normalizeStatus(c.status)
      if (st === 'Pago') {
        pago += c.value
        countPago++
      } else if (st === 'Emitido') {
        emitido += c.value
        countEmitido++
      } else if (st === 'Vencido') {
        vencido += c.value
        countVencido++
      } else if (st === 'Cancelado') {
        cancelado += c.value
        countCancelado++
      }
    })

    return {
      pago,
      emitido,
      vencido,
      cancelado,
      countPago,
      countEmitido,
      countVencido,
      countCancelado,
      totalGeral: pago + emitido + vencido,
    }
  }, [charges])

  // Filtragem e busca
  const activeSearch = (globalSearch || searchTerm).trim().toLowerCase()

  const filteredAndSortedCharges = useMemo(() => {
    const filtered = charges.filter((c) => {
      const normalizedSt = normalizeStatus(c.status)

      // Filtro Status
      if (statusFilter !== 'Todos' && normalizedSt !== statusFilter) {
        return false
      }

      // Filtro Cliente
      if (clientFilter !== 'todos' && c.clientId !== clientFilter) {
        return false
      }

      // Filtro Competência
      if (competenceFilter !== 'todas') {
        const cComp =
          c.competence || (c.dueDate ? `${c.dueDate.split('-')[1]}/${c.dueDate.split('-')[0]}` : '')
        if (cComp !== competenceFilter) {
          return false
        }
      }

      // Busca textual por nome do cliente, código, descrição ou linha digitável
      if (activeSearch) {
        const matchClient = c.clientName.toLowerCase().includes(activeSearch)
        const matchCode = c.code.toLowerCase().includes(activeSearch)
        const matchDesc = c.description.toLowerCase().includes(activeSearch)
        const matchLine = c.digitableLine?.toLowerCase().includes(activeSearch)
        const matchComp = c.competence?.toLowerCase().includes(activeSearch)
        if (!matchClient && !matchCode && !matchDesc && !matchLine && !matchComp) {
          return false
        }
      }

      return true
    })

    // Ordenação
    return filtered.sort((a, b) => {
      let comparison = 0
      if (sortField === 'dueDate') {
        comparison = (a.dueDate || '').localeCompare(b.dueDate || '')
      } else if (sortField === 'value') {
        comparison = a.value - b.value
      } else if (sortField === 'clientName') {
        comparison = a.clientName.localeCompare(b.clientName)
      } else if (sortField === 'competence') {
        comparison = (a.competence || '').localeCompare(b.competence || '')
      } else if (sortField === 'code') {
        comparison = a.code.localeCompare(b.code)
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [charges, statusFilter, clientFilter, competenceFilter, activeSearch, sortField, sortOrder])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('Todos')
    setCompetenceFilter('todas')
    setClientFilter('todos')
  }

  const hasActiveFilters =
    searchTerm !== '' ||
    statusFilter !== 'Todos' ||
    competenceFilter !== 'todas' ||
    clientFilter !== 'todos'

  if (!isDataLoaded && isDataLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-[#E2E8F0] space-y-3">
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-7 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
        <TableSkeleton rows={6} />
      </div>
    )
  }

  if (dataError && !isDataLoaded) {
    return (
      <ErrorState
        title="Erro ao carregar Cobranças"
        message={dataError}
        onRetry={() => refreshData()}
      />
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Resumos Financeiros do Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Emitido */}
        <div className="bg-[#FFFFFF] p-5 rounded-[12px] border border-[#E2E8F0] border-t-4 border-t-[#0F4C5C] shadow-sm transition-all duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider">
              Emitido (A Vencer)
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#0F4C5C]/10 text-[#0F4C5C] flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-[#1A202C]">{formatCurrency(metrics.emitido)}</h3>
            <span className="text-xs font-semibold text-[#0F4C5C] bg-[#0F4C5C]/10 px-2 py-0.5 rounded-full">
              {metrics.countEmitido} boletos
            </span>
          </div>
          <span className="text-[11px] text-[#5A6B7B] block mt-1">
            Aguardando liquidação bancária
          </span>
        </div>

        {/* Pago */}
        <div className="bg-[#FFFFFF] p-5 rounded-[12px] border border-[#E2E8F0] border-t-4 border-t-[#2E9E6B] shadow-sm transition-all duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider">
              Pago (Recebido)
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#2E9E6B]/10 text-[#2E9E6B] flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-[#2E9E6B]">{formatCurrency(metrics.pago)}</h3>
            <span className="text-xs font-semibold text-[#2E9E6B] bg-[#2E9E6B]/15 px-2 py-0.5 rounded-full">
              {metrics.countPago} liquidados
            </span>
          </div>
          <span className="text-[11px] text-[#5A6B7B] block mt-1">Total de receita compensada</span>
        </div>

        {/* Vencido */}
        <div className="bg-[#FFFFFF] p-5 rounded-[12px] border border-[#E2E8F0] border-t-4 border-t-[#C0392B] shadow-sm transition-all duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider">
              Vencido (Em Atraso)
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#C0392B]/10 text-[#C0392B] flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-[#C0392B]">{formatCurrency(metrics.vencido)}</h3>
            <span className="text-xs font-bold text-[#C0392B] bg-[#C0392B]/15 px-2 py-0.5 rounded-full">
              {metrics.countVencido} em atraso
            </span>
          </div>
          <span className="text-[11px] text-[#C0392B] font-medium block mt-1">
            Cobrança ativa e régua requerida
          </span>
        </div>

        {/* Cancelado */}
        <div className="bg-[#FFFFFF] p-5 rounded-[12px] border border-[#E2E8F0] border-t-4 border-t-slate-400 shadow-sm transition-all duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider">
              Cancelado
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-slate-700">
              {formatCurrency(metrics.cancelado)}
            </h3>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {metrics.countCancelado} baixados
            </span>
          </div>
          <span className="text-[11px] text-[#5A6B7B] block mt-1">
            Títulos cancelados ou estornados
          </span>
        </div>
      </div>

      {/* 2. Barra de Filtros e Busca Persistidos */}
      <div className="bg-[#FFFFFF] p-4 rounded-[12px] border border-[#E2E8F0] shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Busca por nome do cliente ou dados */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-[#5A6B7B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, código (COB-1090), descrição ou linha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-[8px] focus:outline-none focus:border-[#0F4C5C] focus:bg-white transition-colors"
            />
          </div>

          {/* Filtros em dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Cliente */}
            <div className="flex items-center gap-1.5 bg-[#F7F8FA] border border-[#E2E8F0] rounded-[8px] px-2.5 py-1.5 text-xs">
              <User className="w-3.5 h-3.5 text-[#5A6B7B]" />
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="bg-transparent font-medium text-[#1A202C] focus:outline-none cursor-pointer pr-1"
              >
                <option value="todos">Todos os clientes</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Competência */}
            <div className="flex items-center gap-1.5 bg-[#F7F8FA] border border-[#E2E8F0] rounded-[8px] px-2.5 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#5A6B7B]" />
              <select
                value={competenceFilter}
                onChange={(e) => setCompetenceFilter(e.target.value)}
                className="bg-transparent font-medium text-[#1A202C] focus:outline-none cursor-pointer pr-1"
              >
                <option value="todas">Todas as competências</option>
                {availableCompetences.map((comp) => (
                  <option key={comp} value={comp}>
                    {formatCompetence(comp)}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#5A6B7B] hover:text-[#C0392B] hover:bg-red-50 rounded-[8px] transition-colors"
                title="Limpar todos os filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}

            {/* Botão Nova Cobrança */}
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-[8px] text-sm font-semibold transition-all duration-150 shadow-sm shrink-0 ml-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Cobrança</span>
            </button>
          </div>
        </div>

        {/* Abas / Pílulas de Status */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-xs border-t border-[#E2E8F0]/80">
          {(['Todos', 'Emitido', 'Pago', 'Vencido', 'Cancelado'] as const).map((st) => {
            const count =
              st === 'Todos'
                ? charges.length
                : charges.filter((c) => normalizeStatus(c.status) === st).length

            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-semibold transition-all duration-150 whitespace-nowrap ${
                  statusFilter === st
                    ? st === 'Emitido'
                      ? 'bg-[#0F4C5C] text-white shadow-sm'
                      : st === 'Pago'
                        ? 'bg-[#2E9E6B] text-white shadow-sm'
                        : st === 'Vencido'
                          ? 'bg-[#C0392B] text-white shadow-sm'
                          : st === 'Cancelado'
                            ? 'bg-slate-600 text-white shadow-sm'
                            : 'bg-[#0F4C5C] text-white shadow-sm'
                    : 'bg-[#F7F8FA] text-[#5A6B7B] hover:text-[#1A202C] hover:bg-slate-200/70 border border-[#E2E8F0]'
                }`}
              >
                <span>{st}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === st ? 'bg-white/20 text-white' : 'bg-white text-[#5A6B7B]'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Tabela Desktop / Cards Mobile */}
      {filteredAndSortedCharges.length === 0 ? (
        <EmptyState
          title="Nenhuma cobrança encontrada"
          description={
            hasActiveFilters
              ? 'Tente ajustar os filtros ou a busca para localizar os títulos.'
              : 'Gere boletos e cobranças recorrentes vinculadas aos clientes ativos.'
          }
          actionLabel={hasActiveFilters ? 'Limpar Filtros' : 'Nova Cobrança'}
          onAction={hasActiveFilters ? resetFilters : openCreateModal}
        />
      ) : (
        <div className="bg-[#FFFFFF] rounded-[12px] border border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Tabela Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7F8FA] text-[#5A6B7B] text-xs uppercase font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th
                    className="py-3.5 px-5 cursor-pointer hover:text-[#1A202C] select-none"
                    onClick={() => toggleSort('clientName')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Cliente</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-[#1A202C] select-none"
                    onClick={() => toggleSort('competence')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Competência</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-[#1A202C] select-none"
                    onClick={() => toggleSort('value')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Valor</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-[#1A202C] select-none"
                    onClick={() => toggleSort('dueDate')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Vencimento</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Linha Digitável</th>
                  <th className="py-3.5 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredAndSortedCharges.map((cob) => {
                  const normalizedSt = normalizeStatus(cob.status)
                  const daysOverdue = calculateDaysOverdue(cob.dueDate)
                  const isLate =
                    normalizedSt === 'Vencido' || (normalizedSt === 'Emitido' && daysOverdue > 0)
                  const isCopied = copiedId === cob.id
                  const formattedLine = cob.digitableLine || generateDigitableLine()
                  const isFinalized = normalizedSt === 'Pago' || normalizedSt === 'Cancelado'

                  return (
                    <tr
                      key={cob.id}
                      className="hover:bg-[#F7F8FA]/70 transition-colors duration-150"
                    >
                      {/* Cliente */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-[#1A202C]">{cob.clientName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-[#5A6B7B]">
                            {cob.code}
                          </span>
                          <span
                            className="text-xs text-[#5A6B7B] truncate max-w-xs"
                            title={cob.description}
                          >
                            {cob.description}
                          </span>
                        </div>
                      </td>

                      {/* Competência */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-[#F7F8FA] text-[#1A202C] rounded-[6px] border border-[#E2E8F0]">
                          <Calendar className="w-3 h-3 text-[#0F4C5C]" />
                          <span>{formatCompetence(cob.competence)}</span>
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-4 px-4 font-bold text-[#1A202C] whitespace-nowrap">
                        {formatCurrency(cob.value)}
                      </td>

                      {/* Vencimento */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs">
                        <span
                          className={
                            isLate ? 'text-[#C0392B] font-bold' : 'text-[#1A202C] font-medium'
                          }
                        >
                          {formatDate(cob.dueDate)}
                        </span>
                        {isLate && (
                          <span className="block text-[11px] font-semibold text-[#C0392B]">
                            {daysOverdue > 0 ? `${daysOverdue} dias atrasado` : 'Vencido'}
                          </span>
                        )}
                        {cob.paymentDate && (
                          <span className="block text-[11px] text-[#2E9E6B] font-semibold">
                            Pago em {formatDate(cob.paymentDate)}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusBadge status={normalizedSt} type="charge" />
                      </td>

                      {/* Linha Digitável Mascarada */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 group">
                          <span
                            className="text-xs font-mono text-[#5A6B7B] bg-[#F7F8FA] px-2 py-1 rounded-[6px] border border-[#E2E8F0] select-all cursor-pointer hover:text-[#0F4C5C] hover:border-[#0F4C5C]/40 transition-colors"
                            onClick={() => handleCopyDigitableLine(cob)}
                            title={`Clique para copiar linha completa:\n${formattedLine}`}
                          >
                            {maskDigitableLine(formattedLine)}
                          </span>
                          <button
                            onClick={() => handleCopyDigitableLine(cob)}
                            title="Copiar linha digitável (47 dígitos)"
                            className="p-1 text-[#5A6B7B] hover:text-[#0F4C5C] hover:bg-[#0F4C5C]/10 rounded-[6px] transition-colors"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-[#2E9E6B]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copiar linha digitável */}
                          <button
                            onClick={() => handleCopyDigitableLine(cob)}
                            title="Copiar Linha Digitável"
                            className="p-1.5 text-[#5A6B7B] hover:text-[#0F4C5C] hover:bg-[#0F4C5C]/10 rounded-[6px] transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Baixar 2ª via (placeholder) */}
                          <button
                            onClick={() => handleDownloadDuplicate(cob)}
                            title="Baixar 2ª via do Boleto"
                            className="p-1.5 text-[#5A6B7B] hover:text-[#0F4C5C] hover:bg-[#0F4C5C]/10 rounded-[6px] transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Marcar como pago */}
                          {!isFinalized && (
                            <>
                              <button
                                onClick={() => registerPayment(cob.id)}
                                title="Marcar como Pago"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#2E9E6B]/10 hover:bg-[#2E9E6B]/20 text-[#2E9E6B] rounded-[6px] text-xs font-semibold transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Pagar</span>
                              </button>

                              {/* Cancelar com confirmação */}
                              <button
                                onClick={() => setCancelModalCharge(cob)}
                                title="Cancelar Cobrança"
                                className="p-1.5 text-[#5A6B7B] hover:text-[#C0392B] hover:bg-[#C0392B]/10 rounded-[6px] transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {normalizedSt === 'Pago' && (
                            <span className="text-xs text-[#2E9E6B] font-semibold inline-flex items-center gap-1 pl-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Liquidado</span>
                            </span>
                          )}

                          {normalizedSt === 'Cancelado' && (
                            <span className="text-xs text-[#5A6B7B] font-medium italic pl-1">
                              Cancelado
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Cards Mobile */}
          <div className="lg:hidden divide-y divide-[#E2E8F0]">
            {filteredAndSortedCharges.map((cob) => {
              const normalizedSt = normalizeStatus(cob.status)
              const daysOverdue = calculateDaysOverdue(cob.dueDate)
              const isLate =
                normalizedSt === 'Vencido' || (normalizedSt === 'Emitido' && daysOverdue > 0)
              const isCopied = copiedId === cob.id
              const formattedLine = cob.digitableLine || generateDigitableLine()
              const isFinalized = normalizedSt === 'Pago' || normalizedSt === 'Cancelado'

              return (
                <div key={cob.id} className="p-4 space-y-3">
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-[#5A6B7B] bg-slate-100 px-1.5 py-0.5 rounded">
                          {cob.code}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-[#F7F8FA] rounded border border-[#E2E8F0] text-[#0F4C5C]">
                          {formatCompetence(cob.competence)}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#1A202C] mt-1.5 leading-snug">
                        {cob.clientName}
                      </h4>
                      <p className="text-xs text-[#5A6B7B] mt-0.5">{cob.description}</p>
                    </div>
                    <StatusBadge status={normalizedSt} type="charge" />
                  </div>

                  {/* Informações Centrais */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#E2E8F0] bg-[#F7F8FA]/60 p-2.5 rounded-[8px]">
                    <div>
                      <span className="text-[#5A6B7B] block text-[11px]">Vencimento</span>
                      <span
                        className={
                          isLate ? 'text-[#C0392B] font-bold' : 'text-[#1A202C] font-semibold'
                        }
                      >
                        {formatDate(cob.dueDate)}
                      </span>
                      {isLate && (
                        <span className="block text-[10px] font-bold text-[#C0392B]">
                          {daysOverdue > 0 ? `${daysOverdue}d em atraso` : 'Vencido'}
                        </span>
                      )}
                      {cob.paymentDate && (
                        <span className="block text-[10px] text-[#2E9E6B] font-semibold">
                          Pago: {formatDate(cob.paymentDate)}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[#5A6B7B] block text-[11px]">Valor</span>
                      <span className="font-bold text-sm text-[#1A202C]">
                        {formatCurrency(cob.value)}
                      </span>
                    </div>
                  </div>

                  {/* Linha Digitável Mascarada */}
                  <div className="flex items-center justify-between text-xs p-2 bg-[#F7F8FA] rounded-[8px] border border-[#E2E8F0]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-[#0F4C5C] shrink-0" />
                      <span className="font-mono text-[11px] text-[#5A6B7B] truncate">
                        {maskDigitableLine(formattedLine)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyDigitableLine(cob)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-[#E2E8F0] rounded text-[11px] font-semibold text-[#0F4C5C] shrink-0 hover:bg-slate-50"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-[#2E9E6B]" />
                          <span className="text-[#2E9E6B]">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Ações Mobile */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] gap-2">
                    <button
                      onClick={() => handleDownloadDuplicate(cob)}
                      className="inline-flex items-center gap-1 text-xs text-[#5A6B7B] hover:text-[#0F4C5C] font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>2ª Via</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {!isFinalized && (
                        <>
                          <button
                            onClick={() => setCancelModalCharge(cob)}
                            className="px-2.5 py-1 text-xs text-[#5A6B7B] hover:text-[#C0392B] font-semibold"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => registerPayment(cob.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-[#2E9E6B] text-white rounded-[6px] text-xs font-semibold shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Marcar Pago</span>
                          </button>
                        </>
                      )}
                      {normalizedSt === 'Pago' && (
                        <span className="text-xs text-[#2E9E6B] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Liquidado</span>
                        </span>
                      )}
                      {normalizedSt === 'Cancelado' && (
                        <span className="text-xs text-[#5A6B7B] font-medium italic">Cancelado</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. Modal "Nova Cobrança" com Repetição Automática */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Nova Cobrança"
        subtitle="Selecione o cliente, a competência e gere boletos avulsos ou recorrentes"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleção do Cliente */}
          <div>
            <label className="block text-xs font-semibold text-[#1A202C] mb-1">
              Cliente Pagador *
            </label>
            <select
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-[8px] focus:outline-none focus:border-[#0F4C5C] ${
                errors.clientId ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
              }`}
            >
              <option value="">Selecione o cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.monthlyValue ? `— ${formatCurrency(c.monthlyValue)}/mês` : ''}
                </option>
              ))}
            </select>
            {errors.clientId && <p className="text-xs text-[#C0392B] mt-1">{errors.clientId}</p>}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-[#1A202C] mb-1">
              Descrição da Cobrança
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Mensalidade de Gestão e Suporte de TI"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-[8px] focus:outline-none focus:border-[#0F4C5C]"
            />
          </div>

          {/* Competência (Mês / Ano) */}
          <div>
            <label className="block text-xs font-semibold text-[#1A202C] mb-1">
              Competência (Mês e Ano) *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={competenceMonth}
                onChange={(e) => handleCompetenceChange(Number(e.target.value), competenceYear)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-[8px] focus:outline-none focus:border-[#0F4C5C]"
              >
                {[
                  { m: 1, name: '01 - Janeiro' },
                  { m: 2, name: '02 - Fevereiro' },
                  { m: 3, name: '03 - Março' },
                  { m: 4, name: '04 - Abril' },
                  { m: 5, name: '05 - Maio' },
                  { m: 6, name: '06 - Junho' },
                  { m: 7, name: '07 - Julho' },
                  { m: 8, name: '08 - Agosto' },
                  { m: 9, name: '09 - Setembro' },
                  { m: 10, name: '10 - Outubro' },
                  { m: 11, name: '11 - Novembro' },
                  { m: 12, name: '12 - Dezembro' },
                ].map((item) => (
                  <option key={item.m} value={item.m}>
                    {item.name}
                  </option>
                ))}
              </select>

              <select
                value={competenceYear}
                onChange={(e) => handleCompetenceChange(competenceMonth, Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-[8px] focus:outline-none focus:border-[#0F4C5C]"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {errors.competence && (
              <p className="text-xs text-[#C0392B] mt-1">{errors.competence}</p>
            )}
          </div>

          {/* Valor Pré-preenchido e Vencimento Pré-preenchido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Valor da Cobrança (R$) *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={value || ''}
                onChange={(e) => setValue(Number(e.target.value))}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-[8px] focus:outline-none font-mono ${
                  errors.value ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
              <span className="text-[11px] text-[#5A6B7B] mt-0.5 block">
                Pré-preenchido pelo valor mensal cadastrado
              </span>
              {errors.value && <p className="text-xs text-[#C0392B] mt-1">{errors.value}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-[8px] focus:outline-none ${
                  errors.dueDate ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
              <span className="text-[11px] text-[#5A6B7B] mt-0.5 block">
                Pré-preenchido pelo dia de vencimento do cliente
              </span>
              {errors.dueDate && <p className="text-xs text-[#C0392B] mt-1">{errors.dueDate}</p>}
            </div>
          </div>

          {/* Opção de Repetir Automaticamente nos Próximos Meses */}
          <div className="p-3.5 bg-[#F7F8FA] rounded-[10px] border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableRepeat}
                  onChange={(e) => setEnableRepeat(e.target.checked)}
                  className="w-4 h-4 text-[#0F4C5C] rounded border-[#E2E8F0] focus:ring-[#0F4C5C]"
                />
                <span className="text-xs font-bold text-[#1A202C]">
                  Repetir automaticamente nos próximos meses
                </span>
              </label>
              {enableRepeat && (
                <span className="text-[11px] font-semibold text-[#0F4C5C] bg-[#0F4C5C]/10 px-2 py-0.5 rounded">
                  {repeatMonths} meses no total
                </span>
              )}
            </div>

            {enableRepeat && (
              <div className="pt-2 border-t border-[#E2E8F0] flex items-center gap-3">
                <label className="text-xs text-[#5A6B7B] shrink-0">
                  Gerar cobranças para os próximos:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="2"
                    max="24"
                    value={repeatMonths}
                    onChange={(e) => setRepeatMonths(Math.max(1, Number(e.target.value)))}
                    className="w-20 px-2.5 py-1 text-sm bg-white border border-[#E2E8F0] rounded-[6px] focus:outline-none focus:border-[#0F4C5C] font-mono text-center"
                  />
                  <span className="text-xs text-[#5A6B7B]">meses</span>
                </div>
              </div>
            )}
            {errors.repeatMonths && <p className="text-xs text-[#C0392B]">{errors.repeatMonths}</p>}
            <p className="text-[11px] text-[#5A6B7B]">
              Cada título será gerado com status <strong>Emitido</strong> e linha digitável única de
              47 dígitos formatada.
            </p>
          </div>

          {/* Aviso sobre Prompt 9 */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-[8px] text-xs text-amber-950 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Nota:</strong> a emissão real de boleto substituirá a linha digitável fictícia
              no Prompt 9. A cobrança passa a nascer da cadeia proposta → OS finalizada → NFS-e
              emitida.
            </p>
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 border border-[#E2E8F0] text-[#5A6B7B] hover:text-[#1A202C] hover:bg-slate-50 rounded-[8px] text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-[8px] text-sm font-semibold transition-all duration-150 shadow-sm"
            >
              {enableRepeat && repeatMonths > 1
                ? `Gerar ${repeatMonths} Cobranças`
                : 'Gerar Cobrança'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. Modal de Confirmação de Cancelamento */}
      <Modal
        isOpen={!!cancelModalCharge}
        onClose={() => setCancelModalCharge(null)}
        title="Cancelar Cobrança"
        subtitle="Confirme o cancelamento do título bancário"
        maxWidth="md"
      >
        {cancelModalCharge && (
          <div className="space-y-4">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-[8px] text-xs text-[#C0392B] flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Atenção: esta ação não pode ser desfeita.</p>
                <p className="mt-1">
                  O boleto <strong>{cancelModalCharge.code}</strong> do cliente{' '}
                  <strong>{cancelModalCharge.clientName}</strong> no valor de{' '}
                  <strong>{formatCurrency(cancelModalCharge.value)}</strong> será marcado como
                  Cancelado.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalCharge(null)}
                className="px-4 py-2 border border-[#E2E8F0] text-[#5A6B7B] rounded-[8px] text-sm font-semibold"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-[#C0392B] hover:bg-red-700 text-white rounded-[8px] text-sm font-semibold shadow-sm"
              >
                Sim, Cancelar Cobrança
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
