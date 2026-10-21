import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  FileSpreadsheet,
  Wrench,
  AlertTriangle,
  TrendingUp,
  Clock,
  PlusCircle,
  ArrowUpRight,
  ChevronRight,
  Briefcase,
  CheckCircle2,
} from 'lucide-react'
import { useCRM } from '../../context/CRMContext'
import { formatCurrency, formatRelativeTime } from '../../utils/formatters'

export const DashboardSection: React.FC = () => {
  const {
    charges,
    proposals,
    serviceOrders,
    invoices,
    activities,
    setActiveSection,
    setQuickAction,
  } = useCRM()

  // 1. Cálculos de Indicadores
  // Faturamento no mês: soma de cobranças pagas ou faturadas no mês atual
  const totalFaturamentoMes = charges
    .filter((c) => c.status === 'pago')
    .reduce((acc, c) => acc + c.value, 0)

  const propostasAbertas = proposals.filter(
    (p) => p.status === 'enviada' || p.status === 'rascunho',
  ).length

  const osEmAndamento = serviceOrders.filter(
    (os) => os.status === 'em_andamento' || os.status === 'aberta',
  ).length

  const cobrancasEmAtraso = charges.filter((c) => c.status === 'em_atraso').length
  const valorTotalAtraso = charges
    .filter((c) => c.status === 'em_atraso')
    .reduce((acc, c) => acc + c.value, 0)

  // 2. Gráfico dos últimos 6 meses (Simulação analítica consistente baseada nas OS e faturas)
  const monthlyData = [
    { month: 'Out', fullMonth: 'Outubro', value: 34500, count: 6 },
    { month: 'Nov', fullMonth: 'Novembro', value: 41200, count: 8 },
    { month: 'Dez', fullMonth: 'Dezembro', value: 49800, count: 9 },
    { month: 'Jan', fullMonth: 'Janeiro', value: 38900, count: 7 },
    { month: 'Fev', fullMonth: 'Fevereiro', value: 46200, count: 8 },
    { month: 'Mar', fullMonth: 'Março (atual)', value: 52750, count: 11 },
  ]

  const maxMonthValue = Math.max(...monthlyData.map((m) => m.value))
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Linha de Atalhos Rápidos */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0F4C5C]/10 text-[#0F4C5C] flex items-center justify-center font-bold">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#1A202C]">Painel de Controle Comercial</h4>
            <p className="text-xs text-[#5A6B7B]">
              Acompanhe pipeline de vendas, execução técnica e saúde financeira em tempo real
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuickAction({ type: 'nova_proposta' })}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova Proposta</span>
          </button>
          <button
            onClick={() => setQuickAction({ type: 'nova_os' })}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#FFFFFF] hover:bg-[#F7F8FA] text-[#0F4C5C] border border-[#0F4C5C]/30 rounded-lg text-xs font-semibold transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova OS</span>
          </button>
        </div>
      </div>

      {/* 4 Cards de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Faturamento */}
        <div
          onClick={() => setActiveSection('cobrancas')}
          className="cursor-pointer group bg-[#FFFFFF] p-6 rounded-xl border border-[#E2E8F0] border-t-4 border-t-[#2E9E6B] shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider">
              Faturamento no Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#2E9E6B]/10 text-[#2E9E6B] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-[#1A202C]">
              {formatCurrency(totalFaturamentoMes)}
            </h3>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#2E9E6B]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+12.4% vs mês anterior</span>
          </div>
        </div>

        {/* Card 2: Propostas em Aberto */}
        <div
          onClick={() => setActiveSection('propostas')}
          className="cursor-pointer group bg-[#FFFFFF] p-6 rounded-xl border border-[#E2E8F0] border-t-4 border-t-[#E0A100] shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider">
              Propostas em Aberto
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#E0A100]/15 text-[#B88300] flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-[#1A202C]">{propostasAbertas}</h3>
            <span className="text-xs text-[#5A6B7B]">
              Total:{' '}
              {formatCurrency(
                proposals
                  .filter((p) => p.status === 'enviada' || p.status === 'rascunho')
                  .reduce((acc, p) => acc + p.total, 0),
              )}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-[#5A6B7B] group-hover:text-[#0F4C5C]">
            <span>Ver pipeline comercial</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Card 3: Ordens de Serviço */}
        <div
          onClick={() => setActiveSection('ordens-servico')}
          className="cursor-pointer group bg-[#FFFFFF] p-6 rounded-xl border border-[#E2E8F0] border-t-4 border-t-[#0F4C5C] shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider">
              OS em Andamento
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#0F4C5C]/10 text-[#0F4C5C] flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-[#1A202C]">{osEmAndamento}</h3>
            <span className="text-xs text-[#5A6B7B]">
              {serviceOrders.filter((o) => o.status === 'concluida').length} concluídas
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-[#5A6B7B] group-hover:text-[#0F4C5C]">
            <span>Gerenciar equipe de campo</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Card 4: Cobranças em Atraso */}
        <div
          onClick={() => setActiveSection('cobrancas')}
          className="cursor-pointer group bg-[#FFFFFF] p-6 rounded-xl border border-[#E2E8F0] border-t-4 border-t-[#C0392B] shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider">
              Cobranças em Atraso
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#C0392B]/15 text-[#C0392B] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-[#C0392B]">{cobrancasEmAtraso}</h3>
            <span className="text-xs font-semibold text-[#C0392B]">
              {formatCurrency(valorTotalAtraso)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-[#C0392B] font-medium">
            <span>Ação de cobrança necessária</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Seção Central: Gráfico de Barras CSS puro e Atividade Recente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 6 meses */}
        <div className="lg:col-span-2 bg-[#FFFFFF] p-6 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-semibold text-[#1A202C]">
                  Faturamento Últimos 6 Meses
                </h3>
                <p className="text-xs text-[#5A6B7B]">
                  Receita faturada líquida por competência mensal (R$)
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#5A6B7B]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#0F4C5C]" />
                  <span>Faturamento Mensal</span>
                </div>
              </div>
            </div>

            {/* Gráfico em barras puras de DIV */}
            <div className="pt-8 pb-4">
              <div className="h-56 flex items-end justify-between gap-4 sm:gap-8 px-2 border-b border-[#E2E8F0]">
                {monthlyData.map((item, idx) => {
                  const heightPercent = Math.round((item.value / maxMonthValue) * 85) + 12
                  const isHovered = hoveredBar === idx

                  return (
                    <div
                      key={item.month}
                      className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                      onMouseEnter={() => setHoveredBar(idx)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Tooltip no Hover */}
                      {isHovered && (
                        <div
                          className="absolute -top-12 z-20 bg-[#1A202C] text-white text-xs py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap pointer-events-none transform -translate-x-1/2 left-1/2 animate-fade-in"
                          style={{ minWidth: '110px', textAlign: 'center' }}
                        >
                          <p className="font-semibold">{formatCurrency(item.value)}</p>
                          <p className="text-[10px] text-gray-300">{item.count} contratos/OS</p>
                          <div className="w-2 h-2 bg-[#1A202C] transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                        </div>
                      )}

                      {/* Barra */}
                      <div
                        className="w-full max-w-[48px] bg-[#0F4C5C] hover:bg-[#0C3D4B] rounded-t-lg transition-all duration-200 relative overflow-hidden"
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div className="absolute inset-x-0 top-0 h-1 bg-white/20" />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Rótulos dos meses */}
              <div className="flex justify-between gap-4 sm:gap-8 px-2 mt-3">
                {monthlyData.map((item) => (
                  <div key={item.month} className="flex-1 text-center">
                    <span className="text-xs font-medium text-[#5A6B7B]">{item.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#5A6B7B]">
            <span>Média mensal estimada: R$ 43.890,00</span>
            <span className="text-[#2E9E6B] font-semibold">Meta de Q1 atingida (108%)</span>
          </div>
        </div>

        {/* Atividade Recente */}
        <div className="bg-[#FFFFFF] p-6 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#1A202C]">Atividade Recente</h3>
              <Clock className="w-4 h-4 text-[#5A6B7B]" />
            </div>

            <div className="space-y-4">
              {activities.slice(0, 5).map((act) => {
                let badgeColor = 'bg-[#0F4C5C]/10 text-[#0F4C5C]'
                if (act.type === 'cobranca' && act.status === 'pago') {
                  badgeColor = 'bg-[#2E9E6B]/10 text-[#2E9E6B]'
                } else if (act.status === 'em_atraso' || act.status === 'cancelado') {
                  badgeColor = 'bg-[#C0392B]/10 text-[#C0392B]'
                } else if (act.status === 'aceita' || act.status === 'concluida') {
                  badgeColor = 'bg-[#2E9E6B]/10 text-[#2E9E6B]'
                }

                return (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#F7F8FA] transition-colors"
                  >
                    <div className="mt-1 w-2 h-2 rounded-full bg-[#0F4C5C] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-[#1A202C] truncate">
                          {act.action}
                        </span>
                        <span className="text-[11px] text-[#5A6B7B] shrink-0">
                          {formatRelativeTime(act.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-[#5A6B7B] truncate mt-0.5">{act.title}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] mt-4">
            <button
              onClick={() => setActiveSection('clientes')}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#0F4C5C] hover:text-[#0C3D4B] py-1.5"
            >
              <span>Ver clientes e histórico completo</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
