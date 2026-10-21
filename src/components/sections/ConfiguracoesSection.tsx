import React, { useState } from 'react'
import {
  User,
  Building,
  Database,
  Download,
  RotateCcw,
  AlertTriangle,
  UploadCloud,
  FileCode,
  RefreshCw,
  Globe,
  Key,
} from 'lucide-react'
import { useCRM } from '../../context/CRMContext'
import { Modal } from '../FeedbackAndModal'

export const ConfiguracoesSection: React.FC = () => {
  const {
    userProfile,
    companySettings,
    saveUserProfile,
    saveCompanySettings,
    resetToSampleData,
    exportDataJSON,
    addToast,
  } = useCRM()

  // 1. Estado Perfil
  const [profileForm, setProfileForm] = useState({ ...userProfile })

  // 2. Estado Empresa
  const [companyForm, setCompanyForm] = useState({ ...companySettings })

  // 3. Modal de Confirmação de Reset
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveUserProfile(profileForm)
  }

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveCompanySettings(companyForm)
  }

  const handleExport = () => {
    const jsonStr = exportDataJSON()
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `nexocrm_backup_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    addToast('success', 'Arquivo JSON exportado com sucesso para seu dispositivo.')
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProfileForm((prev) => ({ ...prev, avatarUrl: reader.result as string }))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      {/* Card 1: Perfil do Usuário */}
      <div className="bg-[#FFFFFF] p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E2E8F0]">
          <div className="w-10 h-10 rounded-lg bg-[#0F4C5C]/10 text-[#0F4C5C] flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1A202C]">Perfil do Operador</h3>
            <p className="text-xs text-[#5A6B7B]">
              Gerencie suas informações de acesso e foto de exibição no CRM
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative">
              <img
                src={profileForm.avatarUrl}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-[#0F4C5C]/20 shadow-sm"
              />
            </div>
            <div className="flex-1 space-y-1 text-center sm:text-left">
              <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F7F8FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] text-xs font-semibold text-[#1A202C] rounded-lg cursor-pointer transition-colors">
                <UploadCloud className="w-4 h-4 text-[#0F4C5C]" />
                <span>Trocar Foto de Perfil</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-[#5A6B7B]">
                JPG, PNG ou GIF. Pré-visualização instantânea no navegador.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Nome de Exibição
              </label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                E-mail Corporativo
              </label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Cargo / Função
              </label>
              <input
                type="text"
                value={profileForm.role}
                onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-5 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              Salvar Perfil
            </button>
          </div>
        </form>
      </div>

      {/* Card 2: Dados da Empresa Emissora */}
      <div className="bg-[#FFFFFF] p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E2E8F0]">
          <div className="w-10 h-10 rounded-lg bg-[#0F4C5C]/10 text-[#0F4C5C] flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1A202C]">
              Dados da Empresa Emissora e Faturamento
            </h3>
            <p className="text-xs text-[#5A6B7B]">
              Informações utilizadas no cabeçalho das notas fiscais e boletos emitidos
            </p>
          </div>
        </div>

        <form onSubmit={handleCompanySubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Razão Social
              </label>
              <input
                type="text"
                value={companyForm.companyName}
                onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={companyForm.tradeName}
                onChange={(e) => setCompanyForm({ ...companyForm, tradeName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">CNPJ</label>
              <input
                type="text"
                value={companyForm.cnpj}
                onChange={(e) => setCompanyForm({ ...companyForm, cnpj: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Provedor de Boletos / Gateway
              </label>
              <input
                type="text"
                value={companyForm.boletoProvider}
                onChange={(e) => setCompanyForm({ ...companyForm, boletoProvider: e.target.value })}
                placeholder="Ex: Banco Inter V2 / Asaas / Cora"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            {/* Integração Multi Foco */}
            <div className="sm:col-span-2 pt-3 border-t border-[#E2E8F0]">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 text-[#0F4C5C]" />
                <h4 className="text-xs font-semibold text-[#1A202C] uppercase tracking-wider">
                  Integração com Multi Foco
                </h4>
              </div>
              <p className="text-xs text-[#5A6B7B] mb-3">
                Configure a URL base e o token de autenticação para sincronizar o identificador dos
                clientes via busca por documento (GET /v1/clients/filter/search/{'{termo}'}).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#5A6B7B]" />
                <span>Base URL Multi Foco</span>
              </label>
              <input
                type="url"
                value={companyForm.multiFocoBaseUrl || ''}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, multiFocoBaseUrl: e.target.value })
                }
                placeholder="https://api.multifoco.com.br"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
              <p className="text-[11px] text-[#5A6B7B] mt-1">
                Ex: https://api.multifoco.com.br ou ambiente homologado
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#5A6B7B]" />
                <span>Token de Acesso / API Key</span>
              </label>
              <input
                type="password"
                value={companyForm.multiFocoApiToken || ''}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, multiFocoApiToken: e.target.value })
                }
                placeholder="Bearer eyJhbGciOi..."
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
              <p className="text-[11px] text-[#5A6B7B] mt-1">
                Enviado no cabeçalho Authorization da requisição
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                Endereço Fiscal (Logradouro e Número)
              </label>
              <input
                type="text"
                value={`${companyForm.street}, ${companyForm.number}`}
                onChange={(e) => {
                  const parts = e.target.value.split(',')
                  setCompanyForm({
                    ...companyForm,
                    street: parts[0] || '',
                    number: parts[1]?.trim() || '',
                  })
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">Cidade</label>
              <input
                type="text"
                value={companyForm.city}
                onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1">UF (Estado)</label>
              <input
                type="text"
                value={companyForm.state}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, state: e.target.value.toUpperCase() })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F4C5C]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-5 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              Salvar Dados da Empresa
            </button>
          </div>
        </form>
      </div>

      {/* Card 3: Gestão de Dados (Backup & Restauração) */}
      <div className="bg-[#FFFFFF] p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E2E8F0]">
          <div className="w-10 h-10 rounded-lg bg-[#0F4C5C]/10 text-[#0F4C5C] flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1A202C]">
              Banco de Dados em Nuvem (PocketBase)
            </h3>
            <p className="text-xs text-[#5A6B7B]">
              Camada de dados conectada ao Skip Cloud (PocketBase) com autenticação e tempo real via
              SSE
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 font-semibold text-sm text-[#1A202C] mb-1">
                <FileCode className="w-4 h-4 text-[#0F4C5C]" />
                <span>Exportar Dados em JSON</span>
              </div>
              <p className="text-xs text-[#5A6B7B]">
                Faça o download completo de clientes, propostas, ordens de serviço, notas e
                cobranças.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#0F4C5C] transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Backup JSON</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 font-semibold text-sm text-[#1A202C] mb-1">
                <RotateCcw className="w-4 h-4 text-[#0F4C5C]" />
                <span>Sincronizar Banco em Nuvem</span>
              </div>
              <p className="text-xs text-[#5A6B7B]">
                Força nova sincronização completa de clientes, propostas, ordens, notas e cobranças
                com o PocketBase.
              </p>
            </div>
            <button
              type="button"
              onClick={() => resetToSampleData()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-[#0F4C5C]/5 border border-[#0F4C5C]/30 rounded-lg text-xs font-semibold text-[#0F4C5C] transition-all shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Sincronizar com PocketBase</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Reset */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Confirmar Restauração de Dados"
        subtitle="Esta ação substituirá os registros atuais pela semente de demonstração inicial"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900">
            <AlertTriangle className="w-5 h-5 text-[#C0392B] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Atenção: Ação irreversível!</p>
              <p className="mt-1">
                Todos os clientes, propostas ou ordens criados nesta sessão serão revertidos para os
                valores de fábrica do CRM.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="px-4 py-2 border border-[#E2E8F0] text-[#5A6B7B] rounded-lg text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                resetToSampleData()
                setIsResetModalOpen(false)
              }}
              className="px-4 py-2 bg-[#C0392B] hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              Sim, Restaurar Dados
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
