import React, { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Wrench,
  Receipt,
  DollarSign,
  Settings,
  Menu,
  X,
  Search,
  Plus,
  LogOut,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { useCRM } from '../context/CRMContext'
import { SectionId } from '../types/crm'
import { ToastContainer } from './FeedbackAndModal'

interface NavItem {
  id: SectionId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'propostas', label: 'Propostas', icon: FileSpreadsheet },
  { id: 'ordens-servico', label: 'Ordens de Serviço', icon: Wrench },
  { id: 'notas-fiscais', label: 'Notas Fiscais', icon: Receipt },
  { id: 'cobrancas', label: 'Cobranças', icon: DollarSign },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
]

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    activeSection,
    setActiveSection,
    globalSearch,
    setGlobalSearch,
    clients,
    userProfile,
    setQuickAction,
    addToast,
    logout,
    refreshData,
    isDataLoading,
  } = useCRM()

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)

  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Fecha dropdown de busca ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Clientes encontrados pela busca global para atalhos rápidos
  const matchingClients =
    globalSearch.trim().length > 1
      ? clients
          .filter(
            (c) =>
              c.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
              c.document.includes(globalSearch),
          )
          .slice(0, 4)
      : []

  const handleNavClick = (sectionId: SectionId) => {
    setActiveSection(sectionId)
    setIsMobileMenuOpen(false)
  }

  // Botão de ação contextual do cabeçalho
  const getContextualAction = () => {
    switch (activeSection) {
      case 'dashboard':
        return {
          label: 'Nova Proposta',
          onClick: () => setQuickAction({ type: 'nova_proposta' }),
        }
      case 'clientes':
        return {
          label: 'Novo Cliente',
          onClick: () => {
            // A seção Clientes trata seu próprio botão ou dispara
            const btn = document.querySelector('button:has(svg)')
            setQuickAction({ type: 'novo_cliente' })
          },
        }
      case 'propostas':
        return {
          label: 'Nova Proposta',
          onClick: () => setQuickAction({ type: 'nova_proposta' }),
        }
      case 'ordens-servico':
        return {
          label: 'Nova OS',
          onClick: () => setQuickAction({ type: 'nova_os' }),
        }
      case 'notas-fiscais':
        return {
          label: 'Emitir Nota',
          onClick: () => setQuickAction({ type: 'emitir_nota' }),
        }
      case 'cobrancas':
        return {
          label: 'Nova Cobrança',
          onClick: () => setQuickAction({ type: 'nova_cobranca' }),
        }
      case 'configuracoes':
        return null
      default:
        return null
    }
  }

  const contextualAction = getContextualAction()

  const getSectionTitle = () => {
    const item = navItems.find((n) => n.id === activeSection)
    return item ? item.label : 'Nexo CRM'
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1A202C] flex">
      {/* Sistema Global de Notificações Toast */}
      <ToastContainer />

      {/* OVERLAY MOBILE */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-[#0F4C5C]/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-60 lg:w-60 bg-[#FFFFFF] border-r border-[#E2E8F0] flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Topo / Logo */}
        <div>
          <div className="h-16 flex items-center justify-between px-6 border-b border-[#E2E8F0]">
            <div
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0F4C5C] text-white flex items-center justify-center font-black tracking-wider text-sm shadow-sm">
                N
              </div>
              <div className="leading-tight">
                <span className="font-bold text-base tracking-tight text-[#0F4C5C]">Nexo</span>
                <span className="text-xs font-semibold uppercase tracking-widest text-[#5A6B7B] ml-1">
                  CRM
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-[#5A6B7B] hover:text-[#1A202C]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navegação Principal */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative ${
                    isActive
                      ? 'bg-[#0F4C5C] text-white shadow-sm font-semibold'
                      : 'text-[#5A6B7B] hover:text-[#1A202C] hover:bg-[#F7F8FA]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#5A6B7B]'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#2E9E6B] rounded-r-md" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Rodapé da Sidebar: Perfil do Usuário */}
        <div className="p-3 border-t border-[#E2E8F0] relative">
          <div
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F7F8FA] cursor-pointer transition-colors"
          >
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.name}
              className="w-9 h-9 rounded-full object-cover border border-[#E2E8F0]"
            />
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-semibold text-[#1A202C] truncate leading-tight">
                {userProfile.name}
              </h5>
              <p className="text-[11px] text-[#5A6B7B] truncate">Gestor Comercial</p>
            </div>
          </div>

          {/* Menu Dropdown de Usuário */}
          {isUserMenuOpen && (
            <div className="absolute bottom-16 left-3 right-3 bg-white rounded-xl border border-[#E2E8F0] shadow-xl p-1 z-20 animate-fade-in">
              <button
                onClick={() => {
                  handleNavClick('configuracoes')
                  setIsUserMenuOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-[#1A202C] hover:bg-[#F7F8FA] rounded-lg"
              >
                Meu Perfil & Configurações
              </button>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false)
                  logout()
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-[#C0392B] hover:bg-red-50 rounded-lg flex items-center justify-between cursor-pointer"
              >
                <span>Sair</span>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 lg:pl-60 flex flex-col min-h-screen min-w-0">
        {/* HEADER SUPERIOR FIXO */}
        <header className="sticky top-0 z-30 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E2E8F0] px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 text-[#5A6B7B] hover:text-[#1A202C] rounded-lg hover:bg-[#F7F8FA]"
                aria-label="Abrir Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-lg sm:text-xl font-semibold text-[#1A202C] tracking-tight">
                {getSectionTitle()}
              </h1>
              {isDataLoading && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0F4C5C]/10 text-[#0F4C5C] animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0F4C5C] animate-ping" />
                  Sincronizando...
                </span>
              )}
            </div>

            {/* Ação Contextual (Mobile topo compacto) */}
            {contextualAction && (
              <div className="sm:hidden">
                <button
                  onClick={contextualAction.onClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{contextualAction.label}</span>
                </button>
              </div>
            )}
          </div>

          {/* Barra de Busca Global e Ação Contextual Desktop */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => refreshData()}
              disabled={isDataLoading}
              title="Sincronizar com banco PocketBase"
              className="p-2 text-[#5A6B7B] hover:text-[#0F4C5C] rounded-xl hover:bg-[#F7F8FA] border border-[#E2E8F0] transition-colors disabled:opacity-50"
            >
              <Sparkles
                className={`w-4 h-4 ${isDataLoading ? 'animate-spin text-[#0F4C5C]' : ''}`}
              />
            </button>
            <div ref={searchContainerRef} className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-[#5A6B7B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Busca geral no CRM..."
                value={globalSearch}
                onFocus={() => setIsSearchDropdownOpen(true)}
                onChange={(e) => {
                  setGlobalSearch(e.target.value)
                  setIsSearchDropdownOpen(true)
                }}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#0F4C5C] focus:ring-2 focus:ring-[#0F4C5C]/20 transition-all"
              />

              {/* Dropdown com Atalhos ao Cliente Encontrado */}
              {isSearchDropdownOpen && matchingClients.length > 0 && (
                <div className="absolute top-12 left-0 right-0 bg-white rounded-xl border border-[#E2E8F0] shadow-xl p-2 z-40 animate-fade-in">
                  <div className="px-2 py-1 text-[11px] font-semibold text-[#5A6B7B] uppercase tracking-wider">
                    Clientes Encontrados
                  </div>
                  <div className="divide-y divide-[#E2E8F0]">
                    {matchingClients.map((c) => (
                      <div key={c.id} className="py-2 px-2 hover:bg-[#F7F8FA] rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-[#1A202C]">{c.name}</span>
                          <span className="text-[10px] text-[#5A6B7B]">{c.city}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                          <button
                            onClick={() => {
                              setActiveSection('clientes')
                              setIsSearchDropdownOpen(false)
                            }}
                            className="text-[#0F4C5C] hover:underline font-medium"
                          >
                            Ver em Clientes
                          </button>
                          <span className="text-[#E2E8F0]">•</span>
                          <button
                            onClick={() => {
                              setActiveSection('propostas')
                              setIsSearchDropdownOpen(false)
                            }}
                            className="text-[#0F4C5C] hover:underline font-medium"
                          >
                            Propostas
                          </button>
                          <span className="text-[#E2E8F0]">•</span>
                          <button
                            onClick={() => {
                              setActiveSection('ordens-servico')
                              setIsSearchDropdownOpen(false)
                            }}
                            className="text-[#0F4C5C] hover:underline font-medium"
                          >
                            Ordens de Serviço
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Botão Contextual no Desktop */}
            {contextualAction && (
              <button
                onClick={contextualAction.onClick}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-xl text-sm font-semibold transition-all shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{contextualAction.label}</span>
              </button>
            )}
          </div>
        </header>

        {/* CONTAINER DO CONTEÚDO PRINCIPAL */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
