import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Barcode,
  Calendar,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Receipt,
  Clock,
} from 'lucide-react'
import { useCRM } from '../../context/CRMContext'
import { Charge, ChargeStatus } from '../../types/crm'
import { StatusBadge, EmptyState } from '../CommonUI'
import { Modal } from '../FeedbackAndModal'
import { formatCurrency, formatDate, calculateDaysOverdue } from '../../utils/formatters'

export const CobrancasSection: React.FC = () => {
  const {
    charges,
    clients,
    globalSearch,
    saveCharge,
    registerPayment,
    cancelCharge,
    quickAction,
    setQuickAction,
  } = useCRM()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todas' | ChargeStatus>('todas')

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null)

  // Form State
  const [clientId, setClientId] = useState('')
  const [description, setDescription] = useState('')
  const [value, setValue] = useState<number>(0)
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<ChargeStatus>('em_aberto')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (quickAction.type === 'nova_cobranca') {
      openCreateModal()
      setQuickAction({ type: null })
    }
  }, [quickAction])

  const openCreateModal = () => {
    setEditingCharge(null)
    setClientId(clients[0]?.id || '')
    setDescription('Mensalidade de Suporte & Infraestrutura')
    setValue(2200)
    const in10 = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
    setDueDate(in10)
    setStatus('em_aberto')
    setErrors({})
    setIsFormOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!clientId) errs.clientId = 'Selecione o cliente pagador.'
    if (!description.trim()) errs.description = 'A descrição da cobrança é obrigatória.'
    if (!dueDate) errs.dueDate = 'Data de vencimento é obrigatória.'
    if (value <= 0) errs.value = 'O valor do boleto deve ser maior que zero.'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const selClient = clients.find((c) => c.id === clientId)

    saveCharge({
      id: editingCharge ? editingCharge.id : undefined,
      clientId,
      clientName: selClient ? selClient.name : 'Cliente',
      description: description.trim(),
      value: Number(value),
      dueDate,
      status,
    })

    setIsFormOpen(false)
  }

  // 1. Resumos Financeiros do Topo
  const totalEmAberto = charges
    .filter((c) => c.status === 'em_aberto')
    .reduce((acc, c) => acc + c.value, 0)

  const totalEmAtraso = charges
    .filter((c) => c.status === 'em_atraso')
    .reduce((acc, c) => acc + c.value, 0)

  const totalPagoMes = charges
    .filter((c) => c.status === 'pago')
    .reduce((acc, c) => acc + c.value, 0)

  // Filtragem
  const activeSearch = globalSearch || searchTerm
  const filteredCharges = useMemo(() => {
    return charges.filter((c) => {
      const matchSearch =
        c.code.toLowerCase().includes(activeSearch.toLowerCase()) ||
        c.clientName.toLowerCase().includes(activeSearch.toLowerCase()) ||
        c.description.toLowerCase().includes(activeSearch.toLowerCase())

      const matchStatus = statusFilter === 'todas' ? true : c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [charges, activeSearch, statusFilter])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Resumo no Topo das Cobranças */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E2E8F0] border-t-4 border-t-[#E0A100] shadow-sm">
          <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider block mb-1">
            Total em Aberto (A Vencer)
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-[#1A202C]">{formatCurrency(totalEmAberto)}</h3>
            <span className="text-xs font-medium text-[#B88300] bg-[#E0A100]/15 px-2 py-0.5 rounded">
              {charges.filter((c) => c.status === 'em_aberto').length} boletos
            </span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E2E8F0] border-t-4 border-t-[#C0392B] shadow-sm">
          <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider block mb-1">
            Total em Atraso (Inadimplência)
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-[#C0392B]">{formatCurrency(totalEmAtraso)}</h3>
            <span className="text-xs font-bold text-[#C0392B] bg-[#C0392B]/15 px-2 py-0.5 rounded">
              {charges.filter((c) => c.status === 'em_atraso').length} boletos
            </span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E2E8F0] border-t-4 border-t-[#2E9E6B] shadow-sm">
          <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider block mb-1">
            Total Recebido (Compensado)
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-[#2E9E6B]">{formatCurrency(totalPagoMes)}</h3>
            <span className="text-xs font-medium text-[#2E9E6B] bg-[#2E9E6B]/10 px-2 py-0.5 rounded">
              {charges.filter((c) => c.status === 'pago').length} liquidados
            </span>
          </div>
        </div>
      </div>

      {/* 2. Barra de Filtros e Nova Cobrança */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-[#5A6B7B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código (COB-1090), cliente ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F7F8FA] p-1 rounded-lg border border-[#E2E8F0] overflow-x-auto text-xs">
            {(['todas', 'em_aberto', 'pago', 'em_atraso', 'cancelado'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-[#0F4C5C] text-white shadow-sm'
                    : 'text-[#5A6B7B] hover:text-[#1A202C]'
                }`}
              >
                {st === 'todas'
                  ? 'Todas'
                  : st === 'em_aberto'
                    ? 'Em aberto'
                    : st === 'pago'
                      ? 'Pago'
                      : st === 'em_atraso'
                        ? 'Em atraso'
                        : 'Cancelado'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-sm font-semibold transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Cobrança</span>
        </button>
      </div>

      {/* 3. Tabela de Cobranças */}
      {filteredCharges.length === 0 ? (
        <EmptyState
          title="Nenhuma cobrança encontrada"
          description="Controle o envio e a liquidação dos boletos bancários mensais de seus clientes."
          actionLabel="Criar Cobrança"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7F8FA] text-[#5A6B7B] text-xs uppercase font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-6">Código / Descrição</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Vencimento</th>
                  <th className="py-3.5 px-4">Método</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredCharges.map((cob) => {
                  const daysOverdue = calculateDaysOverdue(cob.dueDate)
                  const isLate =
                    cob.status === 'em_atraso' || (cob.status === 'em_aberto' && daysOverdue > 0)

                  return (
                    <tr key={cob.id} className="hover:bg-[#F7F8FA]/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 font-semibold text-[#1A202C]">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-[#5A6B7B] font-mono font-bold">
                            {cob.code}
                          </span>
                          <span className="truncate max-w-xs">{cob.description}</span>
                        </div>
                        {cob.paymentDate && (
                          <span className="text-xs text-[#2E9E6B] block mt-1">
                            Pago em {formatDate(cob.paymentDate)}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-medium text-[#1A202C]">{cob.clientName}</td>
                      <td className="py-4 px-4 text-xs">
                        <span className={isLate ? 'text-[#C0392B] font-bold' : 'text-[#1A202C]'}>
                          {formatDate(cob.dueDate)}
                        </span>
                        {isLate && (
                          <span className="block text-[11px] font-semibold text-[#C0392B]">
                            {daysOverdue > 0 ? `${daysOverdue} dias em atraso` : 'Vencido'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-slate-100 text-[#0F4C5C] rounded border border-[#E2E8F0]">
                          <Barcode className="w-3 h-3" />
                          <span>Boleto</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-[#1A202C]">
                        {formatCurrency(cob.value)}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={cob.status} type="charge" />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {cob.status !== 'pago' && cob.status !== 'cancelado' && (
                            <>
                              <button
                                onClick={() => registerPayment(cob.id)}
                                title="Registrar Pagamento Recebido"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#2E9E6B]/15 hover:bg-[#2E9E6B]/25 text-[#2E9E6B] rounded-md text-xs font-semibold transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Registrar Pagamento</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Deseja cancelar o boleto ${cob.code}?`)) {
                                    cancelCharge(cob.id)
                                  }
                                }}
                                title="Cancelar Cobrança"
                                className="p-1.5 text-[#5A6B7B] hover:text-[#C0392B] hover:bg-[#C0392B]/10 rounded-md transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {cob.status === 'pago' && (
                            <span className="text-xs text-[#2E9E6B] font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Liquidado</span>
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

          {/* Versão Mobile */}
          <div className="md:hidden divide-y divide-[#E2E8F0]">
            {filteredCharges.map((cob) => {
              const daysOverdue = calculateDaysOverdue(cob.dueDate)
              const isLate =
                cob.status === 'em_atraso' || (cob.status === 'em_aberto' && daysOverdue > 0)

              return (
                <div key={cob.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#5A6B7B]">
                          {cob.code}
                        </span>
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 bg-slate-100 rounded">
                          Boleto
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-[#1A202C] mt-1">
                        {cob.description}
                      </h4>
                      <p className="text-xs text-[#5A6B7B]">{cob.clientName}</p>
                    </div>
                    <StatusBadge status={cob.status} type="charge" />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E2E8F0]">
                    <div>
                      <span className="text-[#5A6B7B]">Vencimento: </span>
                      <span className={isLate ? 'text-[#C0392B] font-bold' : 'text-[#1A202C]'}>
                        {formatDate(cob.dueDate)}
                      </span>
                      {isLate && (
                        <span className="block text-[10px] font-semibold text-[#C0392B]">
                          {daysOverdue > 0 ? `${daysOverdue} dias atrasado` : 'Vencido'}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-sm text-[#1A202C]">
                      {formatCurrency(cob.value)}
                    </span>
                  </div>

                  {cob.status !== 'pago' && cob.status !== 'cancelado' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                      <button
                        onClick={() => {
                          if (window.confirm('Cancelar este boleto?')) cancelCharge(cob.id)
                        }}
                        className="px-2.5 py-1 text-xs text-[#5A6B7B] hover:text-[#C0392B]"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => registerPayment(cob.id)}
                        className="px-3 py-1 bg-[#2E9E6B] text-white rounded-md text-xs font-semibold"
                      >
                        Registrar Pagamento
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal Criar Nova Cobrança */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Gerar Nova Cobrança (Boleto)"
        subtitle="Emita cobranças mensais ou avulsas vinculadas a um cliente"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1A202C] mb-1">Cliente *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:border-[#0F4C5C] ${
                errors.clientId ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
              }`}
            >
              <option value="">Selecione o cliente pagador...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.clientId && <p className="text-xs text-[#C0392B] mt-1">{errors.clientId}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A202C] mb-1">
              Descrição da Cobrança *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Mensalidade de Gestão e Suporte de TI"
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:border-[#0F4C5C] ${
                errors.description ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
              }`}
            />
            {errors.description && (
              <p className="text-xs text-[#C0392B] mt-1">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Valor do Boleto (R$) *
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none font-mono ${
                  errors.value ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
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
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none ${
                  errors.dueDate ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.dueDate && <p className="text-xs text-[#C0392B] mt-1">{errors.dueDate}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A202C] mb-1">
              Status Inicial
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ChargeStatus)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
            >
              <option value="em_aberto">Em aberto (Aguardando vencimento)</option>
              <option value="pago">Já liquidado / Pago</option>
              <option value="em_atraso">Em atraso</option>
            </select>
          </div>

          <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs text-[#5A6B7B] flex items-center gap-2">
            <Barcode className="w-5 h-5 text-[#0F4C5C] shrink-0" />
            <span>
              O boleto será registrado com nosso emissor integrado e linha digitável simulada.
            </span>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 border border-[#E2E8F0] text-[#5A6B7B] rounded-lg text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-sm font-semibold shadow-sm"
            >
              Salvar Cobrança
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
