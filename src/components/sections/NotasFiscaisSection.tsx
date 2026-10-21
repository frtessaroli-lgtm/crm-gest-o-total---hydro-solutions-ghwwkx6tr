import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Plus,
  Send,
  Eye,
  FileText,
  Building,
  CheckCircle,
  FileCheck,
  AlertCircle,
  Receipt,
  Layers,
} from 'lucide-react'
import { useCRM } from '../../context/CRMContext'
import { Invoice, InvoiceStatus } from '../../types/crm'
import { StatusBadge, EmptyState, TableSkeleton, ErrorState } from '../CommonUI'
import { Modal } from '../FeedbackAndModal'
import { formatCurrency, formatDate } from '../../utils/formatters'

export const NotasFiscaisSection: React.FC = () => {
  const {
    invoices,
    clients,
    serviceOrders,
    globalSearch,
    saveInvoice,
    updateInvoiceStatus,
    companySettings,
    quickAction,
    setQuickAction,
    isDataLoading,
    isDataLoaded,
    dataError,
    refreshData,
  } = useCRM()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todas' | InvoiceStatus>('todas')

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)

  // Form State
  const [clientId, setClientId] = useState('')
  const [selectedOSIds, setSelectedOSIds] = useState<string[]>([])
  const [issueDate, setIssueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (quickAction.type === 'emitir_nota') {
      openCreateModal()
      setQuickAction({ type: null })
    }
  }, [quickAction])

  const openCreateModal = () => {
    setClientId(clients[0]?.id || '')
    setSelectedOSIds([])
    setIssueDate(new Date().toISOString().split('T')[0])
    setNotes('Serviços técnicos e consultoria conforme Ordens de Serviço vinculadas.')
    setErrors({})
    setIsFormOpen(true)
  }

  // As OS disponíveis para o cliente selecionado
  const availableOS = useMemo(() => {
    if (!clientId) return []
    return serviceOrders.filter((os) => os.clientId === clientId)
  }, [serviceOrders, clientId])

  const toggleOSSelection = (osId: string) => {
    setSelectedOSIds((prev) =>
      prev.includes(osId) ? prev.filter((id) => id !== osId) : [...prev, osId],
    )
  }

  const computedTotal = useMemo(() => {
    return selectedOSIds.reduce((acc, osId) => {
      const os = serviceOrders.find((o) => o.id === osId)
      return acc + (os ? os.value : 0)
    }, 0)
  }, [selectedOSIds, serviceOrders])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!clientId) errs.clientId = 'Selecione o cliente tomador do serviço.'
    if (selectedOSIds.length === 0) {
      errs.selectedOS = 'Selecione ao menos uma Ordem de Serviço para compor a nota.'
    }
    if (!issueDate) errs.issueDate = 'Data de emissão é obrigatória.'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const selClient = clients.find((c) => c.id === clientId)

    saveInvoice({
      clientId,
      clientName: selClient ? selClient.name : 'Cliente',
      serviceOrderIds: selectedOSIds,
      serviceOrderCodes: [], // DataStore preenche
      issueDate,
      total: computedTotal,
      status: 'pendente',
      notes: notes.trim(),
    })

    setIsFormOpen(false)
  }

  // Filtragem
  const activeSearch = globalSearch || searchTerm
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.number.toLowerCase().includes(activeSearch.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(activeSearch.toLowerCase())

      const matchStatus = statusFilter === 'todas' ? true : inv.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [invoices, activeSearch, statusFilter])

  const handleSendToClient = (invoice: Invoice) => {
    updateInvoiceStatus(invoice.id, 'enviada')
    if (viewingInvoice?.id === invoice.id) {
      setViewingInvoice({ ...invoice, status: 'enviada' })
    }
  }

  if (!isDataLoaded && isDataLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-16 bg-white rounded-xl border border-[#E2E8F0] animate-pulse" />
        <TableSkeleton rows={5} />
      </div>
    )
  }

  if (dataError && !isDataLoaded) {
    return (
      <ErrorState
        title="Erro ao carregar Notas Fiscais"
        message={dataError}
        onRetry={() => refreshData()}
      />
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra de Filtros e Emitir Nota */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-[#5A6B7B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por número da NF ou cliente tomador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F7F8FA] p-1 rounded-lg border border-[#E2E8F0] overflow-x-auto text-xs">
            {(['todas', 'pendente', 'emitida', 'enviada', 'cancelada'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-[#0F4C5C] text-white shadow-sm'
                    : 'text-[#5A6B7B] hover:text-[#1A202C]'
                }`}
              >
                {st === 'todas' ? 'Todas' : st}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-sm font-semibold transition-all shadow-sm shrink-0"
        >
          <Receipt className="w-4 h-4" />
          <span>Emitir Nota Fiscal</span>
        </button>
      </div>

      {/* Lista de Notas Fiscais */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          title="Nenhuma Nota Fiscal encontrada"
          description="Emita notas de prestação de serviços a partir das ordens de serviço executadas."
          actionLabel="Emitir Nova Nota"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7F8FA] text-[#5A6B7B] text-xs uppercase font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-6">Número da NF</th>
                  <th className="py-3.5 px-4">Cliente Tomador</th>
                  <th className="py-3.5 px-4">Data Emissão</th>
                  <th className="py-3.5 px-4">OS Vinculadas</th>
                  <th className="py-3.5 px-4">Valor Total</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-[#F7F8FA]/60 transition-colors group cursor-pointer"
                    onClick={() => setViewingInvoice(inv)}
                  >
                    <td className="py-4 px-6">
                      <div className="font-mono font-bold text-[#1A202C] group-hover:text-[#0F4C5C] flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#0F4C5C]" />
                        <span>NF-{inv.number}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium text-[#1A202C]">{inv.clientName}</td>
                    <td className="py-4 px-4 text-xs text-[#5A6B7B]">
                      {formatDate(inv.issueDate)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {inv.serviceOrderCodes.map((c) => (
                          <span
                            key={c}
                            className="text-[11px] font-mono bg-slate-100 text-[#5A6B7B] px-1.5 py-0.5 rounded border border-[#E2E8F0]"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-[#1A202C]">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={inv.status} type="invoice" />
                    </td>
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status !== 'enviada' && inv.status !== 'cancelada' && (
                          <button
                            onClick={() => handleSendToClient(inv)}
                            title="Enviar ao Cliente"
                            className="p-1.5 text-[#2E9E6B] hover:bg-[#2E9E6B]/10 rounded-md transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setViewingInvoice(inv)}
                          title="Visualizar Nota"
                          className="p-1.5 text-[#5A6B7B] hover:text-[#0F4C5C] hover:bg-[#F7F8FA] rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Versão Mobile */}
          <div className="md:hidden divide-y divide-[#E2E8F0]">
            {filteredInvoices.map((inv) => (
              <div key={inv.id} className="p-4 space-y-3" onClick={() => setViewingInvoice(inv)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#0F4C5C]">
                      NF-{inv.number}
                    </span>
                    <h4 className="text-sm font-semibold text-[#1A202C] mt-1">{inv.clientName}</h4>
                    <p className="text-xs text-[#5A6B7B]">Emissão: {formatDate(inv.issueDate)}</p>
                  </div>
                  <StatusBadge status={inv.status} type="invoice" />
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E2E8F0]">
                  <span className="text-[#5A6B7B]">
                    {inv.serviceOrderCodes.length} OS vinculada(s)
                  </span>
                  <span className="font-bold text-[#1A202C]">{formatCurrency(inv.total)}</span>
                </div>

                <div
                  className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {inv.status !== 'enviada' && (
                    <button
                      onClick={() => handleSendToClient(inv)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#2E9E6B] bg-[#2E9E6B]/10 rounded-md"
                    >
                      Enviar
                    </button>
                  )}
                  <button
                    onClick={() => setViewingInvoice(inv)}
                    className="px-2.5 py-1 text-xs font-semibold text-[#0F4C5C] bg-[#0F4C5C]/10 rounded-md"
                  >
                    Ver Espelho
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Emitir Nova NF */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Emissão de Nota Fiscal de Serviços"
        subtitle="Número sequencial gerado automaticamente. O valor é totalizado pelas Ordens de Serviço vinculadas."
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1A202C] mb-1">
              Cliente Tomador dos Serviços *
            </label>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value)
                setSelectedOSIds([]) // Reseta seleção
              }}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.document})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A202C] mb-1">
              Data de Emissão / Competência *
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
            />
          </div>

          {/* Seleção de OS */}
          <div>
            <label className="block text-xs font-semibold text-[#1A202C] mb-1">
              Selecione as Ordens de Serviço a faturar *
            </label>
            {errors.selectedOS && (
              <p className="text-xs text-[#C0392B] mb-2">{errors.selectedOS}</p>
            )}

            {availableOS.length === 0 ? (
              <p className="text-xs text-[#5A6B7B] p-3 bg-slate-50 border rounded-lg">
                Nenhuma OS cadastrada para este cliente. Abra uma OS primeiro antes de emitir a nota
                fiscal.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border border-[#E2E8F0] rounded-lg p-2">
                {availableOS.map((os) => {
                  const isChecked = selectedOSIds.includes(os.id)
                  return (
                    <label
                      key={os.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-[#0F4C5C]/5 border-[#0F4C5C]'
                          : 'bg-white border-[#E2E8F0] hover:bg-[#F7F8FA]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOSSelection(os.id)}
                          className="w-4 h-4 rounded text-[#0F4C5C] focus:ring-[#0F4C5C]"
                        />
                        <div>
                          <span className="font-semibold text-[#1A202C] block font-mono">
                            {os.code} - {os.title}
                          </span>
                          <span className="text-[11px] text-[#5A6B7B]">
                            Status: {os.status.replace('_', ' ')} • Conclusão prevista:{' '}
                            {formatDate(os.endDate)}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-[#1A202C]">
                        {formatCurrency(os.value)}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A202C] mb-1">
              Discriminação dos Serviços / Observações da NF
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
            />
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
            <span className="text-xs text-[#5A6B7B]">Total calculado da NF:</span>
            <span className="text-xl font-bold text-[#0F4C5C] font-mono">
              {formatCurrency(computedTotal)}
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
              disabled={availableOS.length === 0}
              className="px-5 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
            >
              Gerar e Emitir Nota
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Espelho da Nota Fiscal (Visualização) */}
      <Modal
        isOpen={!!viewingInvoice}
        onClose={() => setViewingInvoice(null)}
        title={
          viewingInvoice ? `Nota Fiscal Eletrônica de Serviço: NF-${viewingInvoice.number}` : ''
        }
        subtitle="Espelho de emissão para simples conferência operacional (Simulação)"
        maxWidth="2xl"
      >
        {viewingInvoice && (
          <div className="space-y-6">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                <strong>Ambiente de Demonstração CRM:</strong> Documento simulado sem valor fiscal
                junto à Prefeitura/SEFAZ.
              </span>
            </div>

            {/* Cabeçalho Emissor e Tomador */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0] text-xs">
              <div>
                <span className="font-semibold text-[#5A6B7B] uppercase tracking-wider block mb-1">
                  Prestador / Emissor
                </span>
                <p className="font-bold text-[#1A202C]">{companySettings.companyName}</p>
                <p className="text-[#5A6B7B]">CNPJ: {companySettings.cnpj}</p>
                <p className="text-[#5A6B7B]">
                  {companySettings.street}, {companySettings.number} - {companySettings.city}/
                  {companySettings.state}
                </p>
              </div>

              <div>
                <span className="font-semibold text-[#5A6B7B] uppercase tracking-wider block mb-1">
                  Tomador do Serviço
                </span>
                <p className="font-bold text-[#1A202C]">{viewingInvoice.clientName}</p>
                <p className="text-[#5A6B7B]">
                  Data Emissão: {formatDate(viewingInvoice.issueDate)}
                </p>
                <div className="mt-1">
                  <StatusBadge status={viewingInvoice.status} type="invoice" />
                </div>
              </div>
            </div>

            {/* Ordens de Serviço Vinculadas */}
            <div>
              <h4 className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider mb-2">
                Ordens de Serviço Integradas nesta NF
              </h4>
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden divide-y divide-[#E2E8F0] text-xs">
                {viewingInvoice.serviceOrderIds.map((osId) => {
                  const os = serviceOrders.find((o) => o.id === osId)
                  return (
                    <div key={osId} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-[#1A202C]">
                          {os ? os.code : osId}
                        </span>{' '}
                        —{' '}
                        <span className="font-medium text-[#1A202C]">
                          {os?.title || 'Serviço prestado'}
                        </span>
                        <span className="block text-[11px] text-[#5A6B7B]">
                          Responsável: {os?.technician || 'Técnico responsável'}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-[#1A202C]">
                        {formatCurrency(os ? os.value : 0)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Descrição */}
            {viewingInvoice.notes && (
              <div>
                <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider block mb-1">
                  Discriminação dos Serviços
                </span>
                <p className="text-xs text-[#1A202C] p-3 bg-slate-50 border border-[#E2E8F0] rounded-lg">
                  {viewingInvoice.notes}
                </p>
              </div>
            )}

            {/* Totalizadores e Impostos */}
            <div className="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
              <div className="flex justify-between text-[#5A6B7B]">
                <span>Base de Cálculo ISS (100%):</span>
                <span>{formatCurrency(viewingInvoice.total)}</span>
              </div>
              <div className="flex justify-between text-[#5A6B7B]">
                <span>Alíquota ISS Estimada (Simples / Lucro Presumido):</span>
                <span>2,00% (Retido na fonte conforme legislação)</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#1A202C] pt-2 border-t border-[#E2E8F0]">
                <span>Valor Líquido da Nota:</span>
                <span className="font-mono text-[#0F4C5C]">
                  {formatCurrency(viewingInvoice.total)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
              <button
                onClick={() => setViewingInvoice(null)}
                className="px-4 py-2 border border-[#E2E8F0] text-xs font-semibold text-[#5A6B7B] rounded-lg"
              >
                Fechar
              </button>

              {viewingInvoice.status !== 'enviada' && (
                <button
                  onClick={() => handleSendToClient(viewingInvoice)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#2E9E6B] hover:bg-[#268559] text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Nota ao Cliente</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
