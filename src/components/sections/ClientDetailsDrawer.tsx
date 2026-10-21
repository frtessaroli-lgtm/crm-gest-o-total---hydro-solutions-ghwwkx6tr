import React from 'react'
import {
  FileSpreadsheet,
  Wrench,
  Receipt,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  X,
  Edit2,
} from 'lucide-react'
import { Client, Proposal, ServiceOrder, Charge, Invoice } from '../../types/crm'
import { StatusBadge } from '../CommonUI'
import {
  formatCurrency,
  formatDate,
  formatDocument,
  formatNextChargeDate,
} from '../../utils/formatters'

interface ClientDetailsDrawerProps {
  client: Client | null
  onClose: () => void
  onEdit: (client: Client) => void
  onToggleStatus: (client: Client) => void
  onSyncMultiFoco: (client: Client) => void
  isSyncing: boolean
  proposals: Proposal[]
  serviceOrders: ServiceOrder[]
  charges: Charge[]
  invoices: Invoice[]
  onNavigateSection: (section: 'propostas' | 'ordens-servico' | 'cobrancas') => void
}

export const ClientDetailsDrawer: React.FC<ClientDetailsDrawerProps> = ({
  client,
  onClose,
  onEdit,
  onToggleStatus,
  onSyncMultiFoco,
  isSyncing,
  proposals,
  serviceOrders,
  charges,
  onNavigateSection,
}) => {
  if (!client) return null

  const clientProposals = proposals.filter((p) => p.clientId === client.id)
  const clientOS = serviceOrders.filter((o) => o.clientId === client.id)
  const clientCharges = charges.filter((c) => c.clientId === client.id)

  let totalPaid = 0
  let totalOpen = 0
  clientCharges.forEach((c) => {
    if (c.status === 'Pago' || c.status === 'pago') {
      totalPaid += c.value
    } else if (
      c.status === 'Emitido' ||
      c.status === 'em_aberto' ||
      c.status === 'Vencido' ||
      c.status === 'em_atraso'
    ) {
      totalOpen += c.value
    }
  })

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      <div
        className="absolute inset-0 bg-[#0F4C5C]/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col transform transition-all duration-200 ease-in-out border-l border-[#E2E8F0]">
          {/* Cabeçalho */}
          <div className="px-6 py-5 bg-[#F7F8FA] border-b border-[#E2E8F0] flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#0F4C5C]/10 text-[#0F4C5C]">
                  {client.type || (client.document.replace(/\D/g, '').length === 11 ? 'PF' : 'PJ')}
                </span>
                <StatusBadge status={client.status} type="client" />
                <span className="text-xs text-[#5A6B7B]">
                  Cadastrado em {formatDate(client.createdAt)}
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#1A202C] mt-1.5 leading-snug">
                {client.name}
              </h2>
              <p className="text-xs text-[#5A6B7B] font-mono mt-0.5">
                {formatDocument(client.document)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(client)}
                className="p-2 text-[#5A6B7B] hover:text-[#0F4C5C] hover:bg-white rounded-lg transition-colors border border-[#E2E8F0]"
                title="Editar Cliente"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-[#5A6B7B] hover:text-[#1A202C] hover:bg-white rounded-lg transition-colors border border-[#E2E8F0]"
                title="Fechar painel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conteúdo com rolagem */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Bloco Multi Foco */}
            <div className="p-4 rounded-xl border border-[#E2E8F0] bg-gradient-to-r from-[#F7F8FA] to-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#0F4C5C]" />
                  <span className="text-xs font-semibold text-[#1A202C] uppercase tracking-wider">
                    Sincronização Multi Foco
                  </span>
                </div>
                {client.multifoco_client_id ? (
                  <p className="text-xs text-[#2E9E6B] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ID Vinculado: {client.multifoco_client_id}</span>
                  </p>
                ) : (
                  <p className="text-xs text-[#5A6B7B]">
                    Nenhum identificador sincronizado para este documento.
                  </p>
                )}
              </div>

              <button
                onClick={() => onSyncMultiFoco(client)}
                disabled={isSyncing}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                  isSyncing
                    ? 'bg-slate-200 text-slate-500 cursor-wait'
                    : 'bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar com Multi Foco'}</span>
              </button>
            </div>

            {/* Totais Pago / Em Aberto / Valor Mensal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  Total Pago
                </span>
                <span className="text-base font-bold text-emerald-700 mt-0.5 block">
                  {formatCurrency(totalPaid)}
                </span>
                <span className="text-[10px] text-emerald-600 mt-1 block">
                  Cobranças liquidadas
                </span>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                  Total em Aberto
                </span>
                <span className="text-base font-bold text-amber-700 mt-0.5 block">
                  {formatCurrency(totalOpen)}
                </span>
                <span className="text-[10px] text-amber-600 mt-1 block">
                  A receber ou em atraso
                </span>
              </div>

              <div className="p-3.5 bg-[#F7F8FA] border border-[#E2E8F0] rounded-xl">
                <span className="text-[11px] font-semibold text-[#5A6B7B] uppercase tracking-wider block">
                  Valor Mensal
                </span>
                <span className="text-base font-bold text-[#0F4C5C] mt-0.5 block">
                  {formatCurrency(client.monthlyValue || 0)}
                </span>
                <span className="text-[10px] text-[#5A6B7B] mt-1 block">
                  Próx: {formatNextChargeDate(client.dueDay)} (dia {client.dueDay || 10})
                </span>
              </div>
            </div>

            {/* Dados Cadastrais */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#1A202C] uppercase tracking-wider">
                Dados Cadastrais
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0] text-xs">
                <div>
                  <span className="text-[#5A6B7B] block">E-mail:</span>
                  <span className="font-semibold text-[#1A202C]">{client.email}</span>
                </div>
                <div>
                  <span className="text-[#5A6B7B] block">Telefone:</span>
                  <span className="font-semibold text-[#1A202C]">{client.phone}</span>
                </div>
                <div>
                  <span className="text-[#5A6B7B] block">Endereço:</span>
                  <span className="font-semibold text-[#1A202C]">
                    {client.street
                      ? `${client.street}, ${client.number || 'S/N'}`
                      : 'Não informado'}
                  </span>
                  {client.neighborhood && (
                    <span className="text-[#5A6B7B] block text-[11px]">{client.neighborhood}</span>
                  )}
                </div>
                <div>
                  <span className="text-[#5A6B7B] block">Cidade / UF:</span>
                  <span className="font-semibold text-[#1A202C]">
                    {client.city ? `${client.city} - ${client.state}` : '—'}
                  </span>
                </div>
              </div>

              {client.notes && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs text-amber-950">
                  <strong>Observações:</strong> {client.notes}
                </div>
              )}
            </div>

            {/* Histórico de Cobranças */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#1A202C] uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#0F4C5C]" />
                  <span>Histórico de Cobranças ({clientCharges.length})</span>
                </h3>
                <button
                  onClick={() => {
                    onClose()
                    onNavigateSection('cobrancas')
                  }}
                  className="text-xs text-[#0F4C5C] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Ir para Cobranças</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {clientCharges.length === 0 ? (
                <p className="text-xs text-[#5A6B7B] italic p-3 bg-[#F7F8FA] rounded-lg">
                  Nenhuma cobrança registrada para este cliente.
                </p>
              ) : (
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden">
                  {clientCharges.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-[#F7F8FA] transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-[#1A202C]">
                          {c.code} • {c.description}
                        </div>
                        <div className="text-[11px] text-[#5A6B7B] mt-0.5">
                          Vencimento: {formatDate(c.dueDate)}
                          {c.paymentDate && ` • Pago em ${formatDate(c.paymentDate)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#1A202C]">{formatCurrency(c.value)}</span>
                        <StatusBadge status={c.status} type="charge" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Propostas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#1A202C] uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-[#0F4C5C]" />
                  <span>Propostas Comerciais ({clientProposals.length})</span>
                </h3>
                <button
                  onClick={() => {
                    onClose()
                    onNavigateSection('propostas')
                  }}
                  className="text-xs text-[#0F4C5C] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Ver Propostas</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {clientProposals.length === 0 ? (
                <p className="text-xs text-[#5A6B7B] italic p-3 bg-[#F7F8FA] rounded-lg">
                  Nenhuma proposta comercial vinculada.
                </p>
              ) : (
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden">
                  {clientProposals.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-[#F7F8FA]"
                    >
                      <div>
                        <span className="font-semibold text-[#1A202C]">
                          {p.code}: {p.title}
                        </span>
                        <span className="text-[11px] text-[#5A6B7B] block mt-0.5">
                          {formatDate(p.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#1A202C]">{formatCurrency(p.total)}</span>
                        <StatusBadge status={p.status} type="proposal" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ordens de Serviço */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#1A202C] uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-[#0F4C5C]" />
                  <span>Ordens de Serviço ({clientOS.length})</span>
                </h3>
                <button
                  onClick={() => {
                    onClose()
                    onNavigateSection('ordens-servico')
                  }}
                  className="text-xs text-[#0F4C5C] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Ver OS</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {clientOS.length === 0 ? (
                <p className="text-xs text-[#5A6B7B] italic p-3 bg-[#F7F8FA] rounded-lg">
                  Nenhuma ordem de serviço vinculada.
                </p>
              ) : (
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden">
                  {clientOS.map((o) => (
                    <div
                      key={o.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-[#F7F8FA]"
                    >
                      <div>
                        <span className="font-semibold text-[#1A202C]">
                          {o.code}: {o.title}
                        </span>
                        <span className="text-[11px] text-[#5A6B7B] block mt-0.5">
                          Técnico: {o.technician}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#1A202C]">{formatCurrency(o.value)}</span>
                        <StatusBadge status={o.status} type="os" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div className="p-4 bg-[#F7F8FA] border-t border-[#E2E8F0] flex items-center justify-between gap-3">
            <button
              onClick={() => onToggleStatus(client)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                client.status === 'ativo'
                  ? 'border-red-200 text-[#C0392B] hover:bg-red-50'
                  : 'border-emerald-200 text-[#2E9E6B] hover:bg-emerald-50'
              }`}
            >
              {client.status === 'ativo' ? 'Desativar Cliente' : 'Reativar Cliente'}
            </button>

            <button
              onClick={() => onEdit(client)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar Cadastro</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
