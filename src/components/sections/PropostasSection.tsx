import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  FileCheck2,
  Calendar,
  DollarSign,
  PlusCircle,
  X,
  FileText,
  User,
} from 'lucide-react'
import { useCRM } from '../../context/CRMContext'
import { Proposal, ProposalItem, ProposalStatus } from '../../types/crm'
import { StatusBadge, EmptyState } from '../CommonUI'
import { Modal } from '../FeedbackAndModal'
import { formatCurrency, formatDate } from '../../utils/formatters'

export const PropostasSection: React.FC = () => {
  const {
    proposals,
    clients,
    globalSearch,
    saveProposal,
    updateProposalStatus,
    deleteProposal,
    saveServiceOrder,
    quickAction,
    setQuickAction,
  } = useCRM()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todas' | ProposalStatus>('todas')

  // Modal Criação / Edição
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null)

  // Modal Visualização / Detalhe
  const [viewingProposal, setViewingProposal] = useState<Proposal | null>(null)

  // Form State
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProposalStatus>('rascunho')
  const [validUntil, setValidUntil] = useState('')
  const [items, setItems] = useState<ProposalItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 },
  ])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Abre form vindo do quickAction do Dashboard
  useEffect(() => {
    if (quickAction.type === 'nova_proposta') {
      openCreateModal()
      setQuickAction({ type: null })
    }
  }, [quickAction])

  const openCreateModal = () => {
    setEditingProposal(null)
    setClientId(clients[0]?.id || '')
    setTitle('')
    setDescription('')
    setStatus('rascunho')
    // Validade padrão: 30 dias
    const date30 = new Date()
    date30.setDate(date30.getDate() + 30)
    setValidUntil(date30.toISOString().split('T')[0])
    setItems([
      {
        id: 'item-' + Date.now(),
        description: 'Serviço de Consultoria / Desenvolvimento',
        quantity: 1,
        unitPrice: 3500,
        total: 3500,
      },
    ])
    setErrors({})
    setIsFormOpen(true)
  }

  const openEditModal = (proposal: Proposal) => {
    setEditingProposal(proposal)
    setClientId(proposal.clientId)
    setTitle(proposal.title)
    setDescription(proposal.description || '')
    setStatus(proposal.status)
    setValidUntil(proposal.validUntil || '')
    setItems(
      proposal.items.length > 0
        ? proposal.items
        : [{ id: 'item-' + Date.now(), description: '', quantity: 1, unitPrice: 0, total: 0 }],
    )
    setErrors({})
    setIsFormOpen(true)
  }

  // Linhas dinâmicas de itens
  const handleItemChange = (index: number, field: keyof ProposalItem, value: any) => {
    setItems((prev) => {
      const next = [...prev]
      const item = { ...next[index], [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        const q = field === 'quantity' ? Number(value) : item.quantity
        const u = field === 'unitPrice' ? Number(value) : item.unitPrice
        item.total = (isNaN(q) ? 0 : q) * (isNaN(u) ? 0 : u)
      }
      next[index] = item
      return next
    })
  }

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: 'item-' + Date.now(), description: '', quantity: 1, unitPrice: 0, total: 0 },
    ])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const computedSubtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.total || 0), 0)
  }, [items])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!clientId) errs.clientId = 'Selecione um cliente para a proposta.'
    if (!title.trim()) errs.title = 'O título da proposta é obrigatório.'
    if (items.length === 0 || !items.some((it) => it.description.trim() && it.unitPrice > 0)) {
      errs.items = 'Adicione ao menos um item de serviço/produto com valor maior que zero.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const validItems = items.filter((it) => it.description.trim())
    const selClient = clients.find((c) => c.id === clientId)

    saveProposal({
      id: editingProposal ? editingProposal.id : undefined,
      clientId,
      clientName: selClient ? selClient.name : 'Cliente',
      title: title.trim(),
      description: description.trim(),
      status,
      validUntil,
      items: validItems,
      total: computedSubtotal,
    })

    setIsFormOpen(false)
  }

  // Filtragem
  const activeSearch = globalSearch || searchTerm
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchSearch =
        p.code.toLowerCase().includes(activeSearch.toLowerCase()) ||
        p.title.toLowerCase().includes(activeSearch.toLowerCase()) ||
        p.clientName.toLowerCase().includes(activeSearch.toLowerCase())

      const matchStatus = statusFilter === 'todas' ? true : p.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [proposals, activeSearch, statusFilter])

  const handleMarkAsAccepted = (proposal: Proposal) => {
    updateProposalStatus(proposal.id, 'aceita')
    if (viewingProposal?.id === proposal.id) {
      setViewingProposal({ ...proposal, status: 'aceita' })
    }

    // Pergunta opcional se deseja abrir OS correspondente
    if (
      window.confirm(
        'Proposta aprovada! Deseja gerar automaticamente uma Ordem de Serviço vinculada?',
      )
    ) {
      saveServiceOrder({
        clientId: proposal.clientId,
        clientName: proposal.clientName,
        proposalId: proposal.id,
        title: `Execução: ${proposal.title}`,
        description: `Referente à proposta ${proposal.code}. Itens aprovados: ${proposal.items.map((i) => i.description).join('; ')}`,
        technician: 'A definir (Gestão de Projetos)',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        value: proposal.total,
        status: 'aberta',
      })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra de Filtros e Novo */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-[#5A6B7B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código (ex: PROP-2025), título ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F7F8FA] p-1 rounded-lg border border-[#E2E8F0] overflow-x-auto text-xs">
            {(['todas', 'rascunho', 'enviada', 'aceita', 'recusada'] as const).map((st) => (
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
          <Plus className="w-4 h-4" />
          <span>Nova Proposta</span>
        </button>
      </div>

      {/* Grid / Tabela de Propostas */}
      {filteredProposals.length === 0 ? (
        <EmptyState
          title="Nenhuma proposta encontrada"
          description="Crie propostas de serviços profissionais com itens dinâmicos e controle de aprovação."
          actionLabel="Criar Proposta"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7F8FA] text-[#5A6B7B] text-xs uppercase font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-6">Código / Proposta</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Validade</th>
                  <th className="py-3.5 px-4">Valor Total</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredProposals.map((prop) => (
                  <tr
                    key={prop.id}
                    className="hover:bg-[#F7F8FA]/60 transition-colors group cursor-pointer"
                    onClick={() => setViewingProposal(prop)}
                  >
                    <td className="py-4 px-6">
                      <div className="font-semibold text-[#1A202C] group-hover:text-[#0F4C5C] flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-[#0F4C5C]/10 text-[#0F4C5C] font-mono font-bold">
                          {prop.code}
                        </span>
                        <span className="truncate max-w-xs">{prop.title}</span>
                      </div>
                      <span className="text-xs text-[#5A6B7B] block mt-1">
                        Criada em {formatDate(prop.createdAt)}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-medium text-[#1A202C]">{prop.clientName}</td>
                    <td className="py-4 px-4 text-xs text-[#5A6B7B]">
                      {formatDate(prop.validUntil)}
                    </td>
                    <td className="py-4 px-4 font-bold text-[#1A202C]">
                      {formatCurrency(prop.total)}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={prop.status} type="proposal" />
                    </td>
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {prop.status !== 'aceita' && (
                          <button
                            onClick={() => handleMarkAsAccepted(prop)}
                            title="Marcar como Aceita"
                            className="p-1.5 text-[#2E9E6B] hover:bg-[#2E9E6B]/10 rounded-md transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setViewingProposal(prop)}
                          title="Visualizar Proposta"
                          className="p-1.5 text-[#5A6B7B] hover:text-[#0F4C5C] hover:bg-[#F7F8FA] rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(prop)}
                          title="Editar Proposta"
                          className="p-1.5 text-[#5A6B7B] hover:text-[#0F4C5C] hover:bg-[#F7F8FA] rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Excluir a proposta ${prop.code}?`)) {
                              deleteProposal(prop.id)
                            }
                          }}
                          title="Excluir Proposta"
                          className="p-1.5 text-[#5A6B7B] hover:text-[#C0392B] hover:bg-[#C0392B]/10 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Versão Mobile em Cards */}
          <div className="md:hidden divide-y divide-[#E2E8F0]">
            {filteredProposals.map((prop) => (
              <div key={prop.id} className="p-4 space-y-3" onClick={() => setViewingProposal(prop)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#0F4C5C] bg-[#0F4C5C]/10 px-2 py-0.5 rounded">
                      {prop.code}
                    </span>
                    <h4 className="text-sm font-semibold text-[#1A202C] mt-1.5">{prop.title}</h4>
                    <p className="text-xs text-[#5A6B7B]">{prop.clientName}</p>
                  </div>
                  <StatusBadge status={prop.status} type="proposal" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-xs">
                  <span className="text-[#5A6B7B]">Valor Total:</span>
                  <span className="font-bold text-sm text-[#1A202C]">
                    {formatCurrency(prop.total)}
                  </span>
                </div>

                <div
                  className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {prop.status !== 'aceita' && (
                    <button
                      onClick={() => handleMarkAsAccepted(prop)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#2E9E6B] bg-[#2E9E6B]/10 rounded-md"
                    >
                      Aprovar
                    </button>
                  )}
                  <button
                    onClick={() => setViewingProposal(prop)}
                    className="px-2.5 py-1 text-xs font-semibold text-[#0F4C5C] bg-[#0F4C5C]/10 rounded-md"
                  >
                    Ver
                  </button>
                  <button onClick={() => openEditModal(prop)} className="p-1 text-[#5A6B7B]">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Criar / Editar Proposta */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProposal ? `Editar ${editingProposal.code}` : 'Nova Proposta Comercial'}
        subtitle="Adicione itens, quantitativos e valores com cálculo em tempo real"
        maxWidth="2xl"
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
                <option value="">Selecione um cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
              {errors.clientId && <p className="text-xs text-[#C0392B] mt-1">{errors.clientId}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProposalStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              >
                <option value="rascunho">Rascunho</option>
                <option value="enviada">Enviada ao cliente</option>
                <option value="aceita">Aceita / Aprovada</option>
                <option value="recusada">Recusada</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Título do Projeto / Proposta *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Implantação de Plataforma E-commerce e Split de Boletos"
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:border-[#0F4C5C] ${
                  errors.title ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.title && <p className="text-xs text-[#C0392B] mt-1">{errors.title}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Descrição do Escopo
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Resumo das entregas, objetivos técnicos e premissas..."
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Validade da Proposta
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>
          </div>

          {/* Tabela de Itens Dinâmicos */}
          <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-semibold text-[#1A202C] uppercase tracking-wider">
                Itens de Serviço / Entregáveis
              </h5>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 text-xs text-[#0F4C5C] font-semibold hover:text-[#0C3D4B]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Adicionar Linha</span>
              </button>
            </div>

            {errors.items && <p className="text-xs text-[#C0392B]">{errors.items}</p>}

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-[#F7F8FA] rounded-lg border border-[#E2E8F0]"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Descrição do serviço..."
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded focus:outline-none focus:border-[#0F4C5C]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qtd"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded focus:outline-none text-center"
                      />
                    </div>
                    <div className="w-28">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Unitário (R$)"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded focus:outline-none text-right font-mono"
                      />
                    </div>
                    <div className="w-28 text-right font-bold text-xs text-[#1A202C] px-2 font-mono">
                      {formatCurrency(item.total)}
                    </div>
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => removeItem(idx)}
                      className="p-1 text-[#5A6B7B] hover:text-[#C0392B] disabled:opacity-30"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total ao Vivo */}
            <div className="flex justify-end items-center gap-4 pt-3 border-t border-[#E2E8F0] text-sm">
              <span className="text-[#5A6B7B] font-semibold">Valor Total Proposta:</span>
              <span className="text-xl font-bold text-[#0F4C5C] font-mono">
                {formatCurrency(computedSubtotal)}
              </span>
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
              className="px-5 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
            >
              Salvar Proposta
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Visualização Detalhada da Proposta */}
      <Modal
        isOpen={!!viewingProposal}
        onClose={() => setViewingProposal(null)}
        title={viewingProposal ? `${viewingProposal.code} - ${viewingProposal.title}` : ''}
        subtitle={
          viewingProposal
            ? `Cliente: ${viewingProposal.clientName} • Válida até ${formatDate(viewingProposal.validUntil)}`
            : ''
        }
        maxWidth="2xl"
      >
        {viewingProposal && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0]">
              <div>
                <span className="text-xs text-[#5A6B7B]">Status Atual</span>
                <div className="mt-1">
                  <StatusBadge status={viewingProposal.status} type="proposal" />
                </div>
              </div>
              <div>
                <span className="text-xs text-[#5A6B7B]">Data de Emissão</span>
                <p className="text-xs font-semibold text-[#1A202C] mt-1">
                  {formatDate(viewingProposal.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#5A6B7B]">Total Global</span>
                <p className="text-lg font-bold text-[#0F4C5C] font-mono mt-0.5">
                  {formatCurrency(viewingProposal.total)}
                </p>
              </div>
            </div>

            {viewingProposal.description && (
              <div>
                <h4 className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider mb-1">
                  Escopo e Especificações
                </h4>
                <p className="text-sm text-[#1A202C] leading-relaxed bg-slate-50 p-3 rounded-lg border border-[#E2E8F0]">
                  {viewingProposal.description}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider mb-2">
                Itens e Composição do Valor
              </h4>
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8FA] text-[#5A6B7B] uppercase font-semibold border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-2.5 px-4">Item / Descrição</th>
                      <th className="py-2.5 px-3 text-center">Qtd</th>
                      <th className="py-2.5 px-3 text-right">Unitário</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {viewingProposal.items.map((it, i) => (
                      <tr key={it.id || i}>
                        <td className="py-3 px-4 text-[#1A202C] font-medium">{it.description}</td>
                        <td className="py-3 px-3 text-center text-[#5A6B7B]">{it.quantity}</td>
                        <td className="py-3 px-3 text-right font-mono text-[#5A6B7B]">
                          {formatCurrency(it.unitPrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#1A202C] font-mono">
                          {formatCurrency(it.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#F7F8FA] border-t border-[#E2E8F0]">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 font-bold text-right text-[#1A202C]">
                        Subtotal Geral:
                      </td>
                      <td className="py-3 px-4 font-bold text-right text-base text-[#0F4C5C] font-mono">
                        {formatCurrency(viewingProposal.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const toEdit = viewingProposal
                    setViewingProposal(null)
                    openEditModal(toEdit)
                  }}
                  className="px-3 py-1.5 border border-[#E2E8F0] text-xs font-semibold text-[#5A6B7B] hover:text-[#1A202C] rounded-lg"
                >
                  Editar Dados
                </button>
              </div>

              {viewingProposal.status !== 'aceita' ? (
                <button
                  onClick={() => handleMarkAsAccepted(viewingProposal)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#2E9E6B] hover:bg-[#268559] text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Marcar como Aceita pelo Cliente</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#2E9E6B] font-semibold bg-[#2E9E6B]/10 px-3 py-1.5 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  <span>Proposta Aprovada</span>
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
