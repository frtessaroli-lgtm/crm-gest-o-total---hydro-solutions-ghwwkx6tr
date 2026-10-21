import React, { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Edit2,
  Eye,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building2,
  FileSpreadsheet,
  Wrench,
  Receipt,
  FileCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { useCRM } from '../../context/CRMContext'
import { Client } from '../../types/crm'
import { StatusBadge, EmptyState } from '../CommonUI'
import { Modal } from '../FeedbackAndModal'
import { formatCurrency, formatDate, formatDocument } from '../../utils/formatters'

export const ClientesSection: React.FC = () => {
  const {
    clients,
    proposals,
    serviceOrders,
    charges,
    invoices,
    globalSearch,
    saveClient,
    deleteClient,
    setActiveSection,
  } = useCRM()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos')

  // Modal de criação / edição
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  // Drawer de Detalhes
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Form State & Errors
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    notes: '',
    status: 'ativo' as 'ativo' | 'inativo',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const openCreateModal = () => {
    setEditingClient(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      document: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: 'SP',
      notes: '',
      status: 'ativo',
    })
    setErrors({})
    setIsFormOpen(true)
  }

  const openEditModal = (client: Client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      document: client.document,
      street: client.street || '',
      number: client.number || '',
      neighborhood: client.neighborhood || '',
      city: client.city || '',
      state: client.state || 'SP',
      notes: client.notes || '',
      status: client.status,
    })
    setErrors({})
    setIsFormOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!formData.name.trim()) errs.name = 'O Nome / Razão Social é obrigatório.'
    if (!formData.email.trim()) {
      errs.email = 'O E-mail é obrigatório.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Insira um e-mail com formato válido.'
    }
    if (!formData.phone.trim()) errs.phone = 'Telefone de contato é obrigatório.'
    if (!formData.document.trim()) {
      errs.document = 'O Documento (CPF ou CNPJ) é obrigatório.'
    } else if (formData.document.replace(/\D/g, '').length < 11) {
      errs.document = 'Documento incompleto (mínimo 11 dígitos).'
    }
    if (!formData.city.trim()) errs.city = 'A Cidade é obrigatória.'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    saveClient({
      id: editingClient ? editingClient.id : undefined,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      document: formData.document.trim(),
      street: formData.street.trim(),
      number: formData.number.trim(),
      neighborhood: formData.neighborhood.trim(),
      city: formData.city.trim(),
      state: formData.state.trim().toUpperCase(),
      notes: formData.notes.trim(),
      status: formData.status,
    })

    setIsFormOpen(false)
  }

  // Filtragem
  const activeSearch = globalSearch || searchTerm
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(activeSearch.toLowerCase()) ||
        c.city.toLowerCase().includes(activeSearch.toLowerCase()) ||
        c.document.includes(activeSearch)

      const matchStatus = statusFilter === 'todos' ? true : c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [clients, activeSearch, statusFilter])

  // Estatísticas do cliente selecionado no Drawer
  const clientProposals = useMemo(
    () => (selectedClient ? proposals.filter((p) => p.clientId === selectedClient.id) : []),
    [selectedClient, proposals],
  )
  const clientOS = useMemo(
    () => (selectedClient ? serviceOrders.filter((o) => o.clientId === selectedClient.id) : []),
    [selectedClient, serviceOrders],
  )
  const clientCharges = useMemo(
    () => (selectedClient ? charges.filter((c) => c.clientId === selectedClient.id) : []),
    [selectedClient, charges],
  )
  const clientInvoices = useMemo(
    () => (selectedClient ? invoices.filter((i) => i.clientId === selectedClient.id) : []),
    [selectedClient, invoices],
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra de Filtros e Ação */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#5A6B7B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, e-mail, cidade ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C] focus:ring-2 focus:ring-[#0F4C5C]/20 transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-lg text-[#1A202C] focus:outline-none focus:border-[#0F4C5C]"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Somente Ativos</option>
            <option value="inativo">Somente Inativos</option>
          </select>
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
      {filteredClients.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description="Não encontramos nenhum cliente com os filtros aplicados. Cadastre uma nova empresa para começar."
          actionLabel="Cadastrar Cliente"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7F8FA] text-[#5A6B7B] text-xs uppercase font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-6">Nome / Razão Social</th>
                  <th className="py-3.5 px-4">Contato</th>
                  <th className="py-3.5 px-4">Localização</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-[#F7F8FA]/60 transition-colors group cursor-pointer"
                    onClick={() => setSelectedClient(client)}
                  >
                    <td className="py-4 px-6">
                      <div className="font-semibold text-[#1A202C] group-hover:text-[#0F4C5C]">
                        {client.name}
                      </div>
                      <div className="text-xs text-[#5A6B7B] mt-0.5">
                        {formatDocument(client.document)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-xs text-[#1A202C] flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#5A6B7B]" />
                        <span>{client.email}</span>
                      </div>
                      <div className="text-xs text-[#5A6B7B] flex items-center gap-1.5 mt-1">
                        <Phone className="w-3.5 h-3.5 text-[#5A6B7B]" />
                        <span>{client.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-[#5A6B7B]">
                      <div className="flex items-center gap-1 text-[#1A202C]">
                        <MapPin className="w-3.5 h-3.5 text-[#0F4C5C]" />
                        <span>
                          {client.city} - {client.state}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#5A6B7B] block mt-0.5">
                        {client.neighborhood || 'Centro'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={client.status} type="client" />
                    </td>
                    <td
                      className="py-4 px-6 text-right"
                      onClick={(e) => e.stopPropagation()} // Não abre o drawer ao clicar nos botões
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedClient(client)}
                          title="Ver Detalhes do Cliente"
                          className="p-1.5 text-[#5A6B7B] hover:text-[#0F4C5C] hover:bg-[#F7F8FA] rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(client)}
                          title="Editar Cadastro"
                          className="p-1.5 text-[#5A6B7B] hover:text-[#0F4C5C] hover:bg-[#F7F8FA] rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(`Deseja realmente remover o cliente ${client.name}?`)
                            ) {
                              deleteClient(client.id)
                            }
                          }}
                          title="Excluir Cliente"
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

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-[#E2E8F0]">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="p-4 space-y-3 hover:bg-[#F7F8FA] transition-colors"
                onClick={() => setSelectedClient(client)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[#1A202C]">{client.name}</h4>
                    <p className="text-xs text-[#5A6B7B]">{formatDocument(client.document)}</p>
                  </div>
                  <StatusBadge status={client.status} type="client" />
                </div>

                <div className="text-xs text-[#5A6B7B] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{client.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{client.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>
                      {client.city}/{client.state}
                    </span>
                  </div>
                </div>

                <div
                  className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setSelectedClient(client)}
                    className="px-2.5 py-1 text-xs font-semibold text-[#0F4C5C] bg-[#0F4C5C]/10 rounded-md"
                  >
                    Ver Resumo
                  </button>
                  <button
                    onClick={() => openEditModal(client)}
                    className="p-1.5 text-[#5A6B7B] hover:text-[#0F4C5C]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Deseja remover ${client.name}?`)) {
                        deleteClient(client.id)
                      }
                    }}
                    className="p-1.5 text-[#5A6B7B] hover:text-[#C0392B]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Criar / Editar Cliente */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
        subtitle="Preencha os dados cadastrais da empresa ou pessoa física"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Nome Completo / Razão Social *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Sigma Tecnologia e Inovação Ltda"
                className={`w-full px-3 py-2 text-sm bg-[#FFFFFF] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 ${
                  errors.name ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.name && <p className="text-xs text-[#C0392B] mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                E-mail Principal *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@empresa.com.br"
                className={`w-full px-3 py-2 text-sm bg-[#FFFFFF] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 ${
                  errors.email ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.email && <p className="text-xs text-[#C0392B] mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Telefone / WhatsApp *
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-8888"
                className={`w-full px-3 py-2 text-sm bg-[#FFFFFF] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 ${
                  errors.phone ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.phone && <p className="text-xs text-[#C0392B] mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Documento (CPF ou CNPJ) *
              </label>
              <input
                type="text"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                placeholder="00.000.000/0001-00"
                className={`w-full px-3 py-2 text-sm bg-[#FFFFFF] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 ${
                  errors.document ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.document && <p className="text-xs text-[#C0392B] mt-1">{errors.document}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-[#E2E8F0]">
              <h5 className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider mb-2">
                Endereço
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
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">Cidade *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="São Paulo, Curitiba..."
                className={`w-full px-3 py-2 text-sm bg-[#FFFFFF] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 ${
                  errors.city ? 'border-[#C0392B]' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.city && <p className="text-xs text-[#C0392B] mt-1">{errors.city}</p>}
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
                placeholder="Particularidades contratuais, dia preferido de pagamento, SLAs..."
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
              Salvar Cliente
            </button>
          </div>
        </form>
      </Modal>

      {/* Drawer / Modal de Detalhes do Cliente */}
      <Modal
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        title={selectedClient?.name || 'Detalhes do Cliente'}
        subtitle={`Cadastrado em ${formatDate(selectedClient?.createdAt)} • ${formatDocument(
          selectedClient?.document || '',
        )}`}
        maxWidth="2xl"
      >
        {selectedClient && (
          <div className="space-y-6">
            {/* Cabeçalho de Dados Rápidos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#F7F8FA] rounded-xl border border-[#E2E8F0]">
              <div>
                <span className="text-xs text-[#5A6B7B]">Status</span>
                <div className="mt-1">
                  <StatusBadge status={selectedClient.status} type="client" />
                </div>
              </div>
              <div>
                <span className="text-xs text-[#5A6B7B]">E-mail & Telefone</span>
                <p className="text-xs font-semibold text-[#1A202C] mt-1">{selectedClient.email}</p>
                <p className="text-xs text-[#5A6B7B]">{selectedClient.phone}</p>
              </div>
              <div>
                <span className="text-xs text-[#5A6B7B]">Endereço Completo</span>
                <p className="text-xs text-[#1A202C] font-medium mt-1">
                  {selectedClient.street
                    ? `${selectedClient.street}, ${selectedClient.number || 'S/N'}`
                    : '—'}
                </p>
                <p className="text-xs text-[#5A6B7B]">
                  {selectedClient.city} - {selectedClient.state}
                </p>
              </div>
            </div>

            {selectedClient.notes && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900">
                <strong>Observações:</strong> {selectedClient.notes}
              </div>
            )}

            {/* Resumo Relacionado: Propostas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-[#1A202C] uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-[#0F4C5C]" />
                  <span>Propostas Comerciais ({clientProposals.length})</span>
                </h4>
                <button
                  onClick={() => {
                    setSelectedClient(null)
                    setActiveSection('propostas')
                  }}
                  className="text-xs text-[#0F4C5C] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Ver todas</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {clientProposals.length === 0 ? (
                <p className="text-xs text-[#5A6B7B] italic">Nenhuma proposta vinculada.</p>
              ) : (
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg overflow-hidden">
                  {clientProposals.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-[#F7F8FA]"
                    >
                      <div>
                        <span className="font-semibold text-[#1A202C]">
                          {p.code}: {p.title}
                        </span>
                        <span className="text-[11px] text-[#5A6B7B] block">
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

            {/* Resumo Relacionado: Ordens de Serviço */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-[#1A202C] uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-[#0F4C5C]" />
                  <span>Ordens de Serviço ({clientOS.length})</span>
                </h4>
                <button
                  onClick={() => {
                    setSelectedClient(null)
                    setActiveSection('ordens-servico')
                  }}
                  className="text-xs text-[#0F4C5C] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Ver todas</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {clientOS.length === 0 ? (
                <p className="text-xs text-[#5A6B7B] italic">
                  Nenhuma OS em andamento ou registrada.
                </p>
              ) : (
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg overflow-hidden">
                  {clientOS.map((o) => (
                    <div
                      key={o.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-[#F7F8FA]"
                    >
                      <div>
                        <span className="font-semibold text-[#1A202C]">
                          {o.code}: {o.title}
                        </span>
                        <span className="text-[11px] text-[#5A6B7B] block">
                          Resp: {o.technician}
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

            {/* Resumo Relacionado: Cobranças / Boletos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-[#1A202C] uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#0F4C5C]" />
                  <span>Cobranças e Boletos ({clientCharges.length})</span>
                </h4>
                <button
                  onClick={() => {
                    setSelectedClient(null)
                    setActiveSection('cobrancas')
                  }}
                  className="text-xs text-[#0F4C5C] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Financeiro</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {clientCharges.length === 0 ? (
                <p className="text-xs text-[#5A6B7B] italic">Nenhuma cobrança registrada.</p>
              ) : (
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg overflow-hidden">
                  {clientCharges.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-[#F7F8FA]"
                    >
                      <div>
                        <span className="font-semibold text-[#1A202C]">
                          {c.code} - {c.description}
                        </span>
                        <span className="text-[11px] text-[#5A6B7B] block">
                          Vencimento: {formatDate(c.dueDate)}
                        </span>
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

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
              <button
                onClick={() => {
                  const toEdit = selectedClient
                  setSelectedClient(null)
                  openEditModal(toEdit)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F4C5C] text-white rounded-lg text-xs font-semibold hover:bg-[#0C3D4B]"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar este Cliente</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
