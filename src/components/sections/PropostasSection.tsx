import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  Send,
  Copy,
  ExternalLink,
  Wrench,
  RotateCcw,
  Check,
  PlusCircle,
  X,
  FileText,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
} from 'lucide-react'
import { useCRM } from '../../context/CRMContext'
import { Proposal, ProposalItem, ProposalStatus } from '../../types/crm'
import { StatusBadge, EmptyState, TableSkeleton, ErrorState } from '../CommonUI'
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
    enviarParaAssinatura,
    saveServiceOrder,
    setActiveSection,
    addToast,
    quickAction,
    setQuickAction,
    isDataLoading,
    isDataLoaded,
    dataError,
    refreshData,
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
  const [notes, setNotes] = useState('')
  const [value, setValue] = useState<number | string>('')
  const [status, setStatus] = useState<ProposalStatus>('rascunho')
  const [validUntil, setValidUntil] = useState('')
  const [items, setItems] = useState<ProposalItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 },
  ])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Estado de envio / cópia de link
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [generatingOsId, setGeneratingOsId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
    setNotes('')
    setValue('')
    setStatus('rascunho')
    // Validade padrão: 30 dias
    const date30 = new Date()
    date30.setDate(date30.getDate() + 30)
    setValidUntil(date30.toISOString().split('T')[0])
    setItems([
      {
        id: 'item-' + Date.now(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
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
    setNotes('')
    setValue(proposal.total || '')
    setStatus(proposal.status)
    setValidUntil(proposal.validUntil || '')
    setItems(
      proposal.items.length > 0
        ? proposal.items
        : [
            {
              id: 'item-' + Date.now(),
              description: proposal.description || proposal.title,
              quantity: 1,
              unitPrice: proposal.total,
              total: proposal.total,
            },
          ],
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
    const itemsTotal = items.reduce((acc, it) => acc + (it.total || 0), 0)
    if (itemsTotal > 0) return itemsTotal
    const directVal = Number(value)
    return isNaN(directVal) ? 0 : directVal
  }, [items, value])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!clientId) errs.clientId = 'Selecione um cliente para a proposta.'
    if (!description.trim() && !title.trim()) {
      errs.description = 'Informe a descrição do serviço para a proposta.'
    }
    const hasValidItem = items.some((it) => it.description.trim() && it.unitPrice > 0)
    const directVal = Number(value)
    if (!hasValidItem && (!directVal || directVal <= 0)) {
      errs.value = 'Informe um valor maior que zero para o serviço ou preencha os itens.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const mainTitle =
      title.trim() || description.trim().split('\n')[0].slice(0, 80) || 'Proposta de Serviço'
    const fullDesc = [description.trim(), notes.trim() ? `Observações:\n${notes.trim()}` : '']
      .filter(Boolean)
      .join('\n\n')

    let validItems = items.filter((it) => it.description.trim() && it.unitPrice > 0)
    if (validItems.length === 0 && Number(value) > 0) {
      validItems = [
        {
          id: 'item-1',
          description: description.trim() || mainTitle,
          quantity: 1,
          unitPrice: Number(value),
          total: Number(value),
        },
      ]
    }

    const selClient = clients.find((c) => c.id === clientId)

    saveProposal({
      id: editingProposal ? editingProposal.id : undefined,
      clientId,
      clientName: selClient ? selClient.name : 'Cliente',
      title: mainTitle,
      description: fullDesc,
      status: editingProposal ? status : 'rascunho',
      validUntil,
      items: validItems,
      total: computedSubtotal,
    })

    setIsFormOpen(false)
  }

  // Ação de Enviar para Assinatura (ZapSign)
  const handleSendToSignature = async (proposal: Proposal) => {
    try {
      setSendingId(proposal.id)
      const res = await enviarParaAssinatura(proposal.id)
      if (viewingProposal?.id === proposal.id) {
        setViewingProposal({
          ...proposal,
          status: 'enviada',
          signatureLink: res.signatureUrl,
          zapsignDocToken: res.docToken,
        })
      }
    } catch (_) {
      // Erro já exibido pelo toast do context
    } finally {
      setSendingId(null)
    }
  }

  // Copiar link de assinatura para a área de transferência
  const handleCopySignatureLink = (proposal: Proposal) => {
    const link = proposal.signatureLink
    if (!link) {
      addToast('error', 'Link de assinatura ainda não disponível para esta proposta.')
      return
    }
    navigator.clipboard.writeText(link)
    setCopiedId(proposal.id)
    addToast('success', 'Link copiado para a área de transferência!', 'Link Copiado')
    setTimeout(() => {
      setCopiedId(null)
    }, 3000)
  }

  // Gerar Ordem de Serviço a partir de Proposta Assinada
  const handleGenerateServiceOrder = async (proposal: Proposal) => {
    try {
      setGeneratingOsId(proposal.id)
      const selClient = clients.find((c) => c.id === proposal.clientId)
      const newOs = await saveServiceOrder({
        clientId: proposal.clientId,
        clientName: selClient ? selClient.name : proposal.clientName,
        proposalId: proposal.id,
        title: `Execução: ${proposal.title}`,
        description: `Referente à proposta ${proposal.code}. ${proposal.description || ''}`,
        technician: 'A definir (Gestão Operacional)',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        value: proposal.total,
        status: 'pendente_envio' as any,
      })

      addToast(
        'success',
        `Ordem de Serviço ${newOs.code} gerada com sucesso! Redirecionando...`,
        'OS Criada',
      )

      if (viewingProposal) {
        setViewingProposal(null)
      }

      // Leva o usuário para a seção de Ordens de Serviço
      setActiveSection('ordens-servico')
    } catch (err: any) {
      addToast('error', err?.message || 'Erro ao gerar Ordem de Serviço.', 'Falha')
    } finally {
      setGeneratingOsId(null)
    }
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
        title="Erro ao carregar Propostas"
        message={dataError}
        onRetry={() => refreshData()}
      />
    )
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
            {(['todas', 'rascunho', 'enviada', 'assinada', 'recusada', 'aceita'] as const).map(
              (st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st as any)}
                  className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-[#0F4C5C] text-white shadow-sm'
                      : 'text-[#5A6B7B] hover:text-[#1A202C]'
                  }`}
                >
                  {st === 'todas'
                    ? 'Todas'
                    : st === 'assinada'
                      ? 'Assinadas'
                      : st === 'enviada'
                        ? 'Enviadas'
                        : st === 'rascunho'
                          ? 'Rascunhos'
                          : st === 'recusada'
                            ? 'Recusadas'
                            : 'Aceitas'}
                </button>
              ),
            )}
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
                  <th className="py-3.5 px-6">Cliente</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-6">Descrição</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Data</th>
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
                    {/* Cliente */}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-[#1A202C] group-hover:text-[#0F4C5C]">
                        {prop.clientName}
                      </div>
                      <span className="text-xs font-mono font-bold text-[#0F4C5C] bg-[#0F4C5C]/10 px-2 py-0.5 rounded mt-1 inline-block">
                        {prop.code}
                      </span>
                    </td>

                    {/* Valor */}
                    <td className="py-4 px-4 font-bold text-[#1A202C] font-mono whitespace-nowrap">
                      {formatCurrency(prop.total)}
                    </td>

                    {/* Descrição */}
                    <td className="py-4 px-6">
                      <div className="font-medium text-[#1A202C] line-clamp-1">{prop.title}</div>
                      {prop.description && (
                        <p className="text-xs text-[#5A6B7B] line-clamp-1 mt-0.5 max-w-sm">
                          {prop.description}
                        </p>
                      )}
                      {/* Link de Assinatura inline se Enviada */}
                      {prop.status === 'enviada' && prop.signatureLink && (
                        <div
                          className="mt-2 flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[11px] text-[#0F4C5C] bg-[#0F4C5C]/5 px-2 py-0.5 rounded border border-[#0F4C5C]/20 font-mono truncate max-w-[200px]">
                            {prop.signatureLink}
                          </span>
                          <button
                            onClick={() => handleCopySignatureLink(prop)}
                            title="Copiar link de assinatura"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F4C5C] hover:bg-[#0F4C5C]/10 px-2 py-0.5 rounded transition-colors"
                          >
                            {copiedId === prop.id ? (
                              <>
                                <Check className="w-3 h-3 text-[#2E9E6B]" />
                                <span className="text-[#2E9E6B]">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <StatusBadge status={prop.status} type="proposal" />
                    </td>

                    {/* Data */}
                    <td className="py-4 px-4 text-xs text-[#5A6B7B] whitespace-nowrap">
                      <div>{formatDate(prop.createdAt)}</div>
                      {prop.validUntil && (
                        <div className="text-[11px] text-slate-400">
                          Até {formatDate(prop.validUntil)}
                        </div>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Botão Enviar para Assinatura (disponível em Rascunho e Recusada) */}
                        {(prop.status === 'rascunho' || prop.status === 'recusada') && (
                          <button
                            onClick={() => handleSendToSignature(prop)}
                            disabled={sendingId === prop.id}
                            title={
                              prop.status === 'recusada'
                                ? 'Reenviar para Assinatura (ZapSign)'
                                : 'Enviar para Assinatura (ZapSign)'
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-md transition-all shadow-sm disabled:opacity-50"
                          >
                            {prop.status === 'recusada' ? (
                              <RotateCcw
                                className={`w-3.5 h-3.5 ${sendingId === prop.id ? 'animate-spin' : ''}`}
                              />
                            ) : (
                              <Send
                                className={`w-3.5 h-3.5 ${sendingId === prop.id ? 'animate-spin' : ''}`}
                              />
                            )}
                            <span className="hidden lg:inline">
                              {sendingId === prop.id
                                ? 'Enviando...'
                                : prop.status === 'recusada'
                                  ? 'Reenviar'
                                  : 'Enviar p/ Assinatura'}
                            </span>
                          </button>
                        )}

                        {/* Botão Copiar Link (disponível quando já tem link de assinatura) */}
                        {prop.signatureLink && (
                          <button
                            onClick={() => handleCopySignatureLink(prop)}
                            title="Copiar Link de Assinatura"
                            className="p-1.5 text-[#0F4C5C] hover:bg-[#0F4C5C]/10 rounded-md transition-colors"
                          >
                            {copiedId === prop.id ? (
                              <Check className="w-4 h-4 text-[#2E9E6B]" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {/* Botão Gerar Ordem de Serviço (disponível quando Assinada) */}
                        {(prop.status === 'assinada' || prop.status === 'aceita') && (
                          <button
                            onClick={() => handleGenerateServiceOrder(prop)}
                            disabled={generatingOsId === prop.id}
                            title="Gerar Ordem de Serviço vinculada"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-[#2E9E6B] hover:bg-[#268559] text-white rounded-md transition-all shadow-sm disabled:opacity-50"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">Gerar OS</span>
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

                {/* Link de Assinatura Mobile */}
                {prop.status === 'enviada' && prop.signatureLink && (
                  <div
                    className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[11px] font-mono text-[#0F4C5C] truncate flex-1">
                      {prop.signatureLink}
                    </span>
                    <button
                      onClick={() => handleCopySignatureLink(prop)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#0F4C5C] bg-[#0F4C5C]/10 rounded-md"
                    >
                      {copiedId === prop.id ? (
                        <Check className="w-3.5 h-3.5 text-[#2E9E6B]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === prop.id ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                )}

                <div
                  className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0] flex-wrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(prop.status === 'rascunho' || prop.status === 'recusada') && (
                    <button
                      onClick={() => handleSendToSignature(prop)}
                      disabled={sendingId === prop.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#0F4C5C] rounded-md shadow-sm disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      <span>{sendingId === prop.id ? 'Enviando...' : 'Enviar p/ Assinatura'}</span>
                    </button>
                  )}

                  {(prop.status === 'assinada' || prop.status === 'aceita') && (
                    <button
                      onClick={() => handleGenerateServiceOrder(prop)}
                      disabled={generatingOsId === prop.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#2E9E6B] rounded-md shadow-sm disabled:opacity-50"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Gerar OS</span>
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
        title={editingProposal ? `Editar ${editingProposal.code}` : 'Nova Proposta'}
        subtitle="Preencha cliente, descrição do serviço, valor e observações para gerar o documento"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cliente */}
            <div className="sm:col-span-2">
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
                    {c.name} {c.city ? `(${c.city})` : ''}
                  </option>
                ))}
              </select>
              {errors.clientId && <p className="text-xs text-[#C0392B] mt-1">{errors.clientId}</p>}
            </div>

            {/* Descrição do Serviço */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Descrição do Serviço *
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Consultoria técnica para automação de processos, integração com API de pagamentos e suporte dedicado mensal..."
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:border-[#0F4C5C] ${
                  errors.description ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.description && (
                <p className="text-xs text-[#C0392B] mt-1">{errors.description}</p>
              )}
            </div>

            {/* Valor */}
            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Valor Total (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5A6B7B]">
                  R$
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={value}
                  onChange={(e) => {
                    const val = e.target.value
                    setValue(val)
                    if (items.length <= 1) {
                      handleItemChange(0, 'unitPrice', Number(val) || 0)
                    }
                  }}
                  className={`w-full pl-9 pr-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:border-[#0F4C5C] font-mono ${
                    errors.value ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                  }`}
                />
              </div>
              {errors.value && <p className="text-xs text-[#C0392B] mt-1">{errors.value}</p>}
            </div>

            {/* Validade */}
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

            {/* Observações */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">Observações</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Condições de pagamento, prazos de entrega, premissas contratuais adicionais..."
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>
          </div>

          {/* Itens detalhados (opcional / expansível para flexibilidade) */}
          <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider">
                Detalhamento dos Itens (Opcional)
              </span>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-xs text-[#0F4C5C] font-semibold hover:text-[#0C3D4B]"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Adicionar Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-[#F7F8FA] rounded-lg border border-[#E2E8F0]"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Item do serviço..."
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded focus:outline-none focus:border-[#0F4C5C]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qtd"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded focus:outline-none text-center"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Unitário"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded focus:outline-none text-right font-mono"
                      />
                    </div>
                    <div className="w-24 text-right font-bold text-xs text-[#1A202C] px-1 font-mono">
                      {formatCurrency(item.total)}
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1 text-[#5A6B7B] hover:text-[#C0392B]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-end items-center gap-3 pt-2 text-sm">
              <span className="text-[#5A6B7B] font-semibold text-xs">Valor Total Calculado:</span>
              <span className="text-lg font-bold text-[#0F4C5C] font-mono">
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
              Salvar Proposta (Rascunho)
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

            {/* Banner ZapSign com Link de Assinatura */}
            {viewingProposal.signatureLink && (
              <div className="p-4 bg-[#0F4C5C]/5 border border-[#0F4C5C]/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F4C5C] uppercase tracking-wider flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    Assinatura Digital (ZapSign)
                  </span>
                  {viewingProposal.status === 'assinada' && (
                    <span className="text-xs font-semibold text-[#2E9E6B] bg-[#2E9E6B]/15 px-2 py-0.5 rounded">
                      Documento Assinado
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={viewingProposal.signatureLink}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded font-mono text-[#1A202C] focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopySignatureLink(viewingProposal)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0F4C5C] text-white hover:bg-[#0C3D4B] rounded transition-all"
                    >
                      {copiedId === viewingProposal.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>
                    <a
                      href={viewingProposal.signatureLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 p-1.5 text-[#0F4C5C] hover:bg-[#0F4C5C]/10 rounded border border-[#0F4C5C]/20 transition-all"
                      title="Abrir página de assinatura"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
                {viewingProposal.zapsignDocToken && (
                  <p className="text-[11px] text-[#5A6B7B] font-mono">
                    Token ZapSign: {viewingProposal.zapsignDocToken}
                  </p>
                )}
              </div>
            )}

            {viewingProposal.description && (
              <div>
                <h4 className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider mb-1">
                  Escopo e Especificações
                </h4>
                <p className="text-sm text-[#1A202C] leading-relaxed bg-slate-50 p-3 rounded-lg border border-[#E2E8F0] whitespace-pre-line">
                  {viewingProposal.description}
                </p>
              </div>
            )}

            {viewingProposal.items && viewingProposal.items.length > 0 && (
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
            )}

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

              <div className="flex items-center gap-2 flex-wrap">
                {/* Ação Enviar ZapSign se Rascunho ou Recusada */}
                {(viewingProposal.status === 'rascunho' ||
                  viewingProposal.status === 'recusada') && (
                  <button
                    onClick={() => handleSendToSignature(viewingProposal)}
                    disabled={sendingId === viewingProposal.id}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                  >
                    {viewingProposal.status === 'recusada' ? (
                      <RotateCcw
                        className={`w-4 h-4 ${sendingId === viewingProposal.id ? 'animate-spin' : ''}`}
                      />
                    ) : (
                      <Send
                        className={`w-4 h-4 ${sendingId === viewingProposal.id ? 'animate-spin' : ''}`}
                      />
                    )}
                    <span>
                      {sendingId === viewingProposal.id
                        ? 'Enviando...'
                        : viewingProposal.status === 'recusada'
                          ? 'Reenviar para Assinatura (ZapSign)'
                          : 'Enviar para Assinatura (ZapSign)'}
                    </span>
                  </button>
                )}

                {/* Ação Gerar Ordem de Serviço se Assinada */}
                {(viewingProposal.status === 'assinada' || viewingProposal.status === 'aceita') && (
                  <button
                    onClick={() => handleGenerateServiceOrder(viewingProposal)}
                    disabled={generatingOsId === viewingProposal.id}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#2E9E6B] hover:bg-[#268559] text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Gerar Ordem de Serviço</span>
                  </button>
                )}

                {/* Compatibilidade com botão Marcar como Aceita legado se rascunho/enviada */}
                {viewingProposal.status !== 'aceita' && viewingProposal.status !== 'assinada' && (
                  <button
                    onClick={() => handleMarkAsAccepted(viewingProposal)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#2E9E6B] hover:bg-[#2E9E6B]/10 rounded-lg transition-colors border border-[#2E9E6B]/30"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Marcar Aceita</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
