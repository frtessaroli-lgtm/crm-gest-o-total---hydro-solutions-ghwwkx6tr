import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Plus,
  Edit2,
  Eye,
  CheckCircle2,
  Wrench,
  Calendar,
  User,
  Clock,
  Link as LinkIcon,
  FileCheck,
} from 'lucide-react'
import { useCRM } from '../../context/CRMContext'
import { ServiceOrder, ServiceOrderStatus } from '../../types/crm'
import { StatusBadge, EmptyState } from '../CommonUI'
import { Modal } from '../FeedbackAndModal'
import { formatCurrency, formatDate } from '../../utils/formatters'

export const OrdensServicoSection: React.FC = () => {
  const {
    serviceOrders,
    clients,
    proposals,
    globalSearch,
    saveServiceOrder,
    completeServiceOrder,
    updateServiceOrderStatus,
    quickAction,
    setQuickAction,
  } = useCRM()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todas' | ServiceOrderStatus>('todas')

  // Modal Criar / Editar
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingOS, setEditingOS] = useState<ServiceOrder | null>(null)

  // Modal Visualizar Detalhe
  const [viewingOS, setViewingOS] = useState<ServiceOrder | null>(null)

  // Form State
  const [clientId, setClientId] = useState('')
  const [proposalId, setProposalId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [technician, setTechnician] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [value, setValue] = useState<number>(0)
  const [status, setStatus] = useState<ServiceOrderStatus>('aberta')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (quickAction.type === 'nova_os') {
      openCreateModal()
      setQuickAction({ type: null })
    }
  }, [quickAction])

  const openCreateModal = () => {
    setEditingOS(null)
    setClientId(clients[0]?.id || '')
    setProposalId('')
    setTitle('')
    setDescription('')
    setTechnician('Rafael Souza (DevOps Lead)')
    const today = new Date().toISOString().split('T')[0]
    const in15 = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(in15)
    setValue(3500)
    setStatus('aberta')
    setErrors({})
    setIsFormOpen(true)
  }

  const openEditModal = (os: ServiceOrder) => {
    setEditingOS(os)
    setClientId(os.clientId)
    setProposalId(os.proposalId || '')
    setTitle(os.title)
    setDescription(os.description)
    setTechnician(os.technician)
    setStartDate(os.startDate)
    setEndDate(os.endDate)
    setValue(os.value)
    setStatus(os.status)
    setErrors({})
    setIsFormOpen(true)
  }

  const handleProposalLinkChange = (propId: string) => {
    setProposalId(propId)
    if (propId) {
      const p = proposals.find((item) => item.id === propId)
      if (p) {
        setClientId(p.clientId)
        if (!title) setTitle(`Execução: ${p.title}`)
        if (!description) setDescription(p.description)
        setValue(p.total)
      }
    }
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!clientId) errs.clientId = 'Selecione o cliente atendido.'
    if (!title.trim()) errs.title = 'O título do serviço é obrigatório.'
    if (!technician.trim()) errs.technician = 'Informe o técnico ou especialista responsável.'
    if (!startDate) errs.startDate = 'Data de início é obrigatória.'
    if (!endDate) errs.endDate = 'Data de previsão/fim é obrigatória.'
    if (value <= 0) errs.value = 'O valor da OS deve ser superior a zero.'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const selClient = clients.find((c) => c.id === clientId)

    saveServiceOrder({
      id: editingOS ? editingOS.id : undefined,
      clientId,
      clientName: selClient ? selClient.name : 'Cliente',
      proposalId: proposalId || undefined,
      title: title.trim(),
      description: description.trim(),
      technician: technician.trim(),
      startDate,
      endDate,
      value: Number(value),
      status,
    })

    setIsFormOpen(false)
  }

  // Filtragem
  const activeSearch = globalSearch || searchTerm
  const filteredOS = useMemo(() => {
    return serviceOrders.filter((os) => {
      const matchSearch =
        os.code.toLowerCase().includes(activeSearch.toLowerCase()) ||
        os.title.toLowerCase().includes(activeSearch.toLowerCase()) ||
        os.clientName.toLowerCase().includes(activeSearch.toLowerCase()) ||
        os.technician.toLowerCase().includes(activeSearch.toLowerCase())

      const matchStatus = statusFilter === 'todas' ? true : os.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [serviceOrders, activeSearch, statusFilter])

  const handleComplete = (os: ServiceOrder) => {
    completeServiceOrder(os.id)
    if (viewingOS?.id === os.id) {
      setViewingOS({ ...os, status: 'concluida' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra de Filtros e Ação */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-[#5A6B7B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código (OS-2025), título, cliente ou técnico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F7F8FA] p-1 rounded-lg border border-[#E2E8F0] overflow-x-auto text-xs">
            {(['todas', 'aberta', 'em_andamento', 'concluida', 'cancelada'] as const).map((st) => (
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
                  : st === 'em_andamento'
                    ? 'Em andamento'
                    : st === 'concluida'
                      ? 'Concluída'
                      : st === 'aberta'
                        ? 'Aberta'
                        : 'Cancelada'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-sm font-semibold transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova OS</span>
        </button>
      </div>

      {/* Listagem */}
      {filteredOS.length === 0 ? (
        <EmptyState
          title="Nenhuma Ordem de Serviço encontrada"
          description="Gerencie as demandas técnicas e operacionais dos seus clientes de forma organizada."
          actionLabel="Abrir Ordem de Serviço"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7F8FA] text-[#5A6B7B] text-xs uppercase font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-6">Código / Serviço</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Responsável Técnico</th>
                  <th className="py-3.5 px-4">Período</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredOS.map((os) => (
                  <tr
                    key={os.id}
                    className="hover:bg-[#F7F8FA]/60 transition-colors group cursor-pointer"
                    onClick={() => setViewingOS(os)}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 font-semibold text-[#1A202C] group-hover:text-[#0F4C5C]">
                        <span className="text-xs px-2 py-0.5 rounded bg-[#0F4C5C]/10 text-[#0F4C5C] font-mono font-bold">
                          {os.code}
                        </span>
                        <span className="truncate max-w-xs">{os.title}</span>
                      </div>
                      <span className="text-xs text-[#5A6B7B] block mt-1">
                        Criada em {formatDate(os.createdAt)}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-medium text-[#1A202C]">{os.clientName}</td>
                    <td className="py-4 px-4 text-xs text-[#5A6B7B]">
                      <div className="flex items-center gap-1.5 text-[#1A202C]">
                        <User className="w-3.5 h-3.5 text-[#0F4C5C]" />
                        <span>{os.technician}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-[#5A6B7B]">
                      {formatDate(os.startDate)} até {formatDate(os.endDate)}
                    </td>
                    <td className="py-4 px-4 font-bold text-[#1A202C]">
                      {formatCurrency(os.value)}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={os.status} type="os" />
                    </td>
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {os.status !== 'concluida' && os.status !== 'cancelada' && (
                          <button
                            onClick={() => handleComplete(os)}
                            title="Concluir OS"
                            className="p-1.5 text-[#2E9E6B] hover:bg-[#2E9E6B]/10 rounded-md transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setViewingOS(os)}
                          title="Ver Detalhes"
                          className="p-1.5 text-[#5A6B7B] hover:text-[#0F4C5C] hover:bg-[#F7F8FA] rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(os)}
                          title="Editar OS"
                          className="p-1.5 text-[#5A6B7B] hover:text-[#0F4C5C] hover:bg-[#F7F8FA] rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
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
            {filteredOS.map((os) => (
              <div key={os.id} className="p-4 space-y-3" onClick={() => setViewingOS(os)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#0F4C5C] bg-[#0F4C5C]/10 px-2 py-0.5 rounded">
                      {os.code}
                    </span>
                    <h4 className="text-sm font-semibold text-[#1A202C] mt-1.5">{os.title}</h4>
                    <p className="text-xs text-[#5A6B7B]">{os.clientName}</p>
                  </div>
                  <StatusBadge status={os.status} type="os" />
                </div>

                <div className="text-xs text-[#5A6B7B] flex items-center justify-between">
                  <span>Técnico: {os.technician}</span>
                  <span className="font-bold text-[#1A202C]">{formatCurrency(os.value)}</span>
                </div>

                <div
                  className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {os.status !== 'concluida' && (
                    <button
                      onClick={() => handleComplete(os)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#2E9E6B] bg-[#2E9E6B]/10 rounded-md"
                    >
                      Concluir
                    </button>
                  )}
                  <button
                    onClick={() => setViewingOS(os)}
                    className="px-2.5 py-1 text-xs font-semibold text-[#0F4C5C] bg-[#0F4C5C]/10 rounded-md"
                  >
                    Ver Detalhes
                  </button>
                  <button onClick={() => openEditModal(os)} className="p-1 text-[#5A6B7B]">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Criar / Editar OS */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingOS ? `Editar ${editingOS.code}` : 'Nova Ordem de Serviço (OS)'}
        subtitle="Vincule ao cliente, determine datas de execução e responsável técnico"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">Cliente *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:border-[#0F4C5C] ${
                  errors.clientId ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              >
                <option value="">Selecione o cliente...</option>
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
                Vincular a Proposta (Opcional)
              </label>
              <select
                value={proposalId}
                onChange={(e) => handleProposalLinkChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              >
                <option value="">Nenhuma proposta vinculada</option>
                {proposals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.title} ({formatCurrency(p.total)})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Título do Serviço / Projeto *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Auditoria de Infraestrutura Cloud AWS"
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:border-[#0F4C5C] ${
                  errors.title ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.title && <p className="text-xs text-[#C0392B] mt-1">{errors.title}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Descrição do Trabalho
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instruções de execução, escopo técnico e entregáveis..."
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Técnico / Responsável *
              </label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="Nome do analista ou equipe"
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:border-[#0F4C5C] ${
                  errors.technician ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.technician && (
                <p className="text-xs text-[#C0392B] mt-1">{errors.technician}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Status da OS
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ServiceOrderStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              >
                <option value="aberta">Aberta (Aguardando início)</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Data Início *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none ${
                  errors.startDate ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Previsão Fim *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none ${
                  errors.endDate ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Valor Total da OS (R$) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none font-mono ${
                  errors.value ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 border border-[#E2E8F0] text-[#5A6B7B] hover:text-[#1A202C] rounded-lg text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-sm font-semibold shadow-sm"
            >
              Gravar OS
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Visualização Detalhada da OS */}
      <Modal
        isOpen={!!viewingOS}
        onClose={() => setViewingOS(null)}
        title={viewingOS ? `${viewingOS.code} - ${viewingOS.title}` : ''}
        subtitle={viewingOS ? `Cliente: ${viewingOS.clientName}` : ''}
        maxWidth="xl"
      >
        {viewingOS && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0]">
              <div>
                <span className="text-xs text-[#5A6B7B]">Status</span>
                <div className="mt-1">
                  <StatusBadge status={viewingOS.status} type="os" />
                </div>
              </div>
              <div>
                <span className="text-xs text-[#5A6B7B]">Período de Execução</span>
                <p className="text-xs font-semibold text-[#1A202C] mt-1">
                  {formatDate(viewingOS.startDate)} até {formatDate(viewingOS.endDate)}
                </p>
              </div>
              <div>
                <span className="text-xs text-[#5A6B7B]">Valor do Serviço</span>
                <p className="text-base font-bold text-[#0F4C5C] font-mono mt-0.5">
                  {formatCurrency(viewingOS.value)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider block mb-1">
                  Responsável Técnico
                </span>
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#1A202C]">
                  <User className="w-4 h-4 text-[#0F4C5C]" />
                  <span>{viewingOS.technician}</span>
                </div>
              </div>

              {viewingOS.proposalId && (
                <div>
                  <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider block mb-1">
                    Proposta Comercial de Origem
                  </span>
                  <div className="flex items-center gap-2 p-2.5 bg-[#0F4C5C]/5 border border-[#0F4C5C]/20 rounded-lg text-xs font-medium text-[#0F4C5C]">
                    <LinkIcon className="w-4 h-4" />
                    <span>Vinculada à Proposta {viewingOS.proposalId}</span>
                  </div>
                </div>
              )}

              <div>
                <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider block mb-1">
                  Descrição do Trabalho
                </span>
                <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-lg text-sm text-[#1A202C] leading-relaxed">
                  {viewingOS.description || 'Nenhum detalhe adicional informado.'}
                </div>
              </div>

              {/* Linha do Tempo / Timeline */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider block mb-2">
                  Histórico e Marcos
                </span>
                <div className="border-l-2 border-[#0F4C5C] pl-4 space-y-3 text-xs">
                  <div>
                    <span className="font-semibold text-[#1A202C]">Abertura da OS</span>
                    <p className="text-[#5A6B7B]">
                      Registrado em {formatDate(viewingOS.createdAt)}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-[#1A202C]">Previsão de Entrega</span>
                    <p className="text-[#5A6B7B]">{formatDate(viewingOS.endDate)}</p>
                  </div>
                  {viewingOS.completedAt && (
                    <div>
                      <span className="font-semibold text-[#2E9E6B]">Conclusão Homologada</span>
                      <p className="text-[#5A6B7B]">{formatDate(viewingOS.completedAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
              <button
                onClick={() => {
                  const toEdit = viewingOS
                  setViewingOS(null)
                  openEditModal(toEdit)
                }}
                className="px-3 py-1.5 border border-[#E2E8F0] text-xs font-semibold text-[#5A6B7B] hover:text-[#1A202C] rounded-lg"
              >
                Editar
              </button>

              {viewingOS.status !== 'concluida' ? (
                <button
                  onClick={() => handleComplete(viewingOS)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#2E9E6B] hover:bg-[#268559] text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Concluir Ordem de Serviço</span>
                </button>
              ) : (
                <span className="text-xs text-[#2E9E6B] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>OS Totalmente Finalizada</span>
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
