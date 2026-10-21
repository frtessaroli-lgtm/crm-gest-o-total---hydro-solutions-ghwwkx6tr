import React, { useState, useEffect, useMemo } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  PlusCircle,
  Briefcase,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  Layers,
  HelpCircle,
  ChevronRight,
  PieChart as PieIcon,
  BarChart3,
} from 'lucide-react'
import { useCRM } from '../../context/CRMContext'
import { formatCurrency, formatDate, calculateDaysOverdue } from '../../utils/formatters'
import { Charge } from '../../types/crm'

export const DashboardSection: React.FC = () => {
  const {
    charges,
    activities,
    setActiveSection,
    setQuickAction,
    checkAndExpireCharges,
    registerPayment,
  } = useCRM()

  // Garante auto-vencimento consistente ao montar
  useEffect(() => {
    checkAndExpireCharges()
  }, [checkAndExpireCharges])

  // Normaliza o status das cobranças considerando que Emitido vencido conta como Vencido
  const normalizedCharges = useMemo(() => {
    return charges.map((c) => {
      let st: 'Emitido' | 'Pago' | 'Vencido' | 'Cancelado' = 'Emitido'
      if (c.status === 'Pago' || c.status === 'pago') {
        st = 'Pago'
      } else if (c.status === 'Cancelado' || c.status === 'cancelado') {
        st = 'Cancelado'
      } else if (c.status === 'Vencido' || c.status === 'em_atraso') {
        st = 'Vencido'
      } else {
        // Emitido ou em_aberto
        if (c.dueDate && calculateDaysOverdue(c.dueDate) > 0) {
          st = 'Vencido'
        } else {
          st = 'Emitido'
        }
      }
      return {
        ...c,
        normalizedStatus: st,
      }
    })
  }, [charges])

  // Identificação do mês atual e mês anterior (YYYY-MM)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonthIndex = now.getMonth() // 0-11
  const currentMonthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`

  const prevMonthDate = new Date(currentYear, currentMonthIndex - 1, 1)
  const prevYear = prevMonthDate.getFullYear()
  const prevMonthIndex = prevMonthDate.getMonth()
  const prevMonthKey = `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}`

  // Função auxiliar para extrair YYYY-MM do pagamento da cobrança (fallback para dueDate ou competence)
  const getChargePaymentMonthKey = (c: Charge): string => {
    if (c.paymentDate) {
      return c.paymentDate.slice(0, 7)
    }
    if (c.competence && c.competence.includes('/')) {
      const [m, y] = c.competence.split('/')
      return `${y}-${m.padStart(2, '0')}`
    }
    if (c.dueDate) {
      return c.dueDate.slice(0, 7)
    }
    return ''
  }

  // -------------------------------------------------------------
  // 1. KPI CARDS
  // -------------------------------------------------------------

  // Total a receber: Emitido + Vencido
  const chargesAReceber = useMemo(() => {
    return normalizedCharges.filter(
      (c) => c.normalizedStatus === 'Emitido' || c.normalizedStatus === 'Vencido',
    )
  }, [normalizedCharges])

  const totalAReceber = useMemo(() => {
    return chargesAReceber.reduce((sum, c) => sum + c.value, 0)
  }, [chargesAReceber])

  const qtdTitulosAReceber = chargesAReceber.length

  // Recebido no mês: Pago cuja data de pagamento/compensação cai no mês corrente
  const chargesRecebidasMesAtual = useMemo(() => {
    return normalizedCharges.filter(
      (c) => c.normalizedStatus === 'Pago' && getChargePaymentMonthKey(c) === currentMonthKey,
    )
  }, [normalizedCharges, currentMonthKey])

  const totalRecebidoMesAtual = useMemo(() => {
    return chargesRecebidasMesAtual.reduce((sum, c) => sum + c.value, 0)
  }, [chargesRecebidasMesAtual])

  // Recebido no mês anterior (para cálculo de variação/tendência)
  const totalRecebidoMesAnterior = useMemo(() => {
    return normalizedCharges
      .filter((c) => c.normalizedStatus === 'Pago' && getChargePaymentMonthKey(c) === prevMonthKey)
      .reduce((sum, c) => sum + c.value, 0)
  }, [normalizedCharges, prevMonthKey])

  const variacaoRecebidoMes = useMemo(() => {
    if (totalRecebidoMesAnterior <= 0) return null
    const diff = totalRecebidoMesAtual - totalRecebidoMesAnterior
    const perc = (diff / totalRecebidoMesAnterior) * 100
    return Math.round(perc * 10) / 10
  }, [totalRecebidoMesAtual, totalRecebidoMesAnterior])

  // Inadimplência (%): valor vencido em aberto / (total a receber + recebido no mês)
  const totalValorVencido = useMemo(() => {
    return normalizedCharges
      .filter((c) => c.normalizedStatus === 'Vencido')
      .reduce((sum, c) => sum + c.value, 0)
  }, [normalizedCharges])

  const taxaInadimplencia = useMemo(() => {
    const baseDenominador = totalAReceber + totalRecebidoMesAtual
    if (baseDenominador <= 0) return 0
    const taxa = (totalValorVencido / baseDenominador) * 100
    return Math.min(100, Math.round(taxa * 10) / 10)
  }, [totalValorVencido, totalAReceber, totalRecebidoMesAtual])

  // Ticket Médio: média do valor das cobranças pagas (ou de todas emitidas/geradas se não houver pagas)
  const ticketMedio = useMemo(() => {
    const pagas = normalizedCharges.filter((c) => c.normalizedStatus === 'Pago')
    if (pagas.length > 0) {
      const soma = pagas.reduce((acc, c) => acc + c.value, 0)
      return soma / pagas.length
    }
    const emitidas = normalizedCharges.filter((c) => c.normalizedStatus !== 'Cancelado')
    if (emitidas.length > 0) {
      const soma = emitidas.reduce((acc, c) => acc + c.value, 0)
      return soma / emitidas.length
    }
    return 0
  }, [normalizedCharges])

  // -------------------------------------------------------------
  // 2. GRÁFICO DE BARRAS: RECEBIDO POR MÊS (ÚLTIMOS 6 MESES) - SVG PURO
  // -------------------------------------------------------------
  const monthNamesAbbr = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ]
  const monthNamesFull = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  const last6MonthsData = useMemo(() => {
    const list = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonthIndex - i, 1)
      const y = d.getFullYear()
      const mIdx = d.getMonth()
      const key = `${y}-${String(mIdx + 1).padStart(2, '0')}`
      const isCurrent = i === 0

      // Soma de cobranças pagas com pagamento neste mês
      const paidInMonth = normalizedCharges.filter(
        (c) => c.normalizedStatus === 'Pago' && getChargePaymentMonthKey(c) === key,
      )
      const total = paidInMonth.reduce((acc, c) => acc + c.value, 0)
      const count = paidInMonth.length

      list.push({
        key,
        year: y,
        label: monthNamesAbbr[mIdx],
        fullMonth: `${monthNamesFull[mIdx]} ${y}${isCurrent ? ' (mês atual)' : ''}`,
        value: total,
        count,
        isCurrent,
      })
    }
    return list
  }, [currentYear, currentMonthIndex, normalizedCharges])

  const maxReceivedValue = useMemo(() => {
    const maxVal = Math.max(...last6MonthsData.map((m) => m.value))
    return maxVal > 0 ? maxVal : 10000
  }, [last6MonthsData])

  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null)

  // -------------------------------------------------------------
  // 3. GRÁFICO DE ROSCA (DONUT): DISTRIBUIÇÃO POR STATUS - SVG PURO
  // -------------------------------------------------------------
  // Status: Emitido #0F4C5C, Pago #2E9E6B, Vencido #C0392B, Cancelado #94A3B8
  const statusDistribution = useMemo(() => {
    const map = {
      Emitido: { count: 0, value: 0, color: '#0F4C5C', label: 'Emitido' },
      Pago: { count: 0, value: 0, color: '#2E9E6B', label: 'Pago' },
      Vencido: { count: 0, value: 0, color: '#C0392B', label: 'Vencido' },
      Cancelado: { count: 0, value: 0, color: '#94A3B8', label: 'Cancelado' },
    }

    normalizedCharges.forEach((c) => {
      const st = c.normalizedStatus
      if (map[st]) {
        map[st].count += 1
        map[st].value += c.value
      }
    })

    const totalValue = Object.values(map).reduce((acc, item) => acc + item.value, 0)
    const totalCount = Object.values(map).reduce((acc, item) => acc + item.count, 0)

    const items = [
      { key: 'Pago', ...map.Pago },
      { key: 'Emitido', ...map.Emitido },
      { key: 'Vencido', ...map.Vencido },
      { key: 'Cancelado', ...map.Cancelado },
    ].map((item) => ({
      ...item,
      percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
    }))

    return {
      items,
      totalValue,
      totalCount,
    }
  }, [normalizedCharges])

  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<string | null>(null)

  // Construção geométrica dos arcos do Donut (raio externo = 80, raio interno = 52, centro = 100,100)
  const donutArcs = useMemo(() => {
    const cx = 100
    const cy = 100
    const rOuter = 80
    const rInner = 52
    let cumulativeAngle = -90 // Inicia no topo (-90 graus)

    return statusDistribution.items.map((item) => {
      const angle = (item.percentage / 100) * 360
      const startAngle = cumulativeAngle
      const endAngle = cumulativeAngle + angle
      cumulativeAngle += angle

      if (angle <= 0) {
        return { ...item, pathData: '', startAngle, endAngle }
      }

      // Se cobre 100% (círculo quase completo)
      const effectiveAngle = Math.min(angle, 359.99)
      const effEndAngle = startAngle + effectiveAngle

      const startRad = (startAngle * Math.PI) / 180
      const endRad = (effEndAngle * Math.PI) / 180

      const x1 = cx + rOuter * Math.cos(startRad)
      const y1 = cy + rOuter * Math.sin(startRad)
      const x2 = cx + rOuter * Math.cos(endRad)
      const y2 = cy + rOuter * Math.sin(endRad)

      const x3 = cx + rInner * Math.cos(endRad)
      const y3 = cy + rInner * Math.sin(endRad)
      const x4 = cx + rInner * Math.cos(startRad)
      const y4 = cy + rInner * Math.sin(startRad)

      const largeArc = effectiveAngle > 180 ? 1 : 0

      const pathData = `
        M ${x1.toFixed(2)} ${y1.toFixed(2)}
        A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}
        L ${x3.toFixed(2)} ${y3.toFixed(2)}
        A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}
        Z
      `.trim()

      return {
        ...item,
        pathData,
        startAngle,
        endAngle,
      }
    })
  }, [statusDistribution])

  // -------------------------------------------------------------
  // 4. LISTA: PRÓXIMOS VENCIMENTOS (PRÓXIMOS 7 DIAS)
  // -------------------------------------------------------------
  const proximosVencimentos = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTime = today.getTime()

    const limit7Days = new Date(today)
    limit7Days.setDate(limit7Days.getDate() + 7)
    limit7Days.setHours(23, 59, 59, 999)
    const limitTime = limit7Days.getTime()

    const list = normalizedCharges.filter((c) => {
      if (c.normalizedStatus !== 'Emitido' || !c.dueDate) return false
      const [y, m, d] = c.dueDate.split('-').map(Number)
      if (!y || !m || !d) return false
      const due = new Date(y, m - 1, d, 12, 0, 0, 0)
      const dueTime = due.getTime()
      return dueTime >= todayTime && dueTime <= limitTime
    })

    // Ordenados por vencimento ascendente
    return list.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
  }, [normalizedCharges])

  const getDueBadge = (dueDateStr: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const [y, m, d] = dueDateStr.split('-').map(Number)
    const due = new Date(y, m - 1, d, 0, 0, 0, 0)
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return {
        text: 'hoje',
        className: 'bg-amber-100 text-amber-800 border-amber-200 font-bold',
      }
    }
    if (diffDays === 1) {
      return {
        text: 'amanhã',
        className: 'bg-blue-100 text-blue-800 border-blue-200 font-semibold',
      }
    }
    return {
      text: `em ${diffDays} dias`,
      className: 'bg-slate-100 text-[#0F4C5C] border-slate-200 font-medium',
    }
  }

  // -------------------------------------------------------------
  // 5. LISTA: EM ATRASO (STATUS VENCIDO)
  // -------------------------------------------------------------
  const cobrancasEmAtrasoList = useMemo(() => {
    const list = normalizedCharges.filter((c) => c.normalizedStatus === 'Vencido')
    // Ordenadas pelas mais atrasadas primeiro (dias de atraso decrescente)
    return list.sort((a, b) => {
      const daysA = calculateDaysOverdue(a.dueDate)
      const daysB = calculateDaysOverdue(b.dueDate)
      return daysB - daysA
    })
  }, [normalizedCharges])

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
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-xs font-semibold transition-all duration-150 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova Proposta</span>
          </button>
          <button
            onClick={() => setQuickAction({ type: 'nova_os' })}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#FFFFFF] hover:bg-[#F7F8FA] text-[#0F4C5C] border border-[#0F4C5C]/30 rounded-lg text-xs font-semibold transition-all duration-150"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova OS</span>
          </button>
        </div>
      </div>

      {/* 1. Quatro Cards de KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total a receber */}
        <div
          onClick={() => setActiveSection('cobrancas')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveSection('cobrancas')
          }}
          className="cursor-pointer group bg-[#FFFFFF] p-6 rounded-[12px] border border-[#E2E8F0] border-t-4 border-t-[#0F4C5C] shadow-sm hover:shadow-md transition-all duration-150"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider">
              Total a receber
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#0F4C5C]/10 text-[#0F4C5C] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-[#1A202C]">{formatCurrency(totalAReceber)}</h3>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#5A6B7B]">
            <span>
              {qtdTitulosAReceber}{' '}
              {qtdTitulosAReceber === 1 ? 'título em aberto' : 'títulos em aberto'}
            </span>
            <span className="text-[#0F4C5C] font-medium group-hover:underline flex items-center gap-0.5">
              <span>Ver</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Recebido no mês */}
        <div
          onClick={() => setActiveSection('cobrancas')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveSection('cobrancas')
          }}
          className="cursor-pointer group bg-[#FFFFFF] p-6 rounded-[12px] border border-[#E2E8F0] border-t-4 border-t-[#2E9E6B] shadow-sm hover:shadow-md transition-all duration-150"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider">
              Recebido no mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#2E9E6B]/10 text-[#2E9E6B] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-[#2E9E6B]">
              {formatCurrency(totalRecebidoMesAtual)}
            </h3>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium">
            {variacaoRecebidoMes !== null ? (
              variacaoRecebidoMes >= 0 ? (
                <div className="flex items-center gap-1 text-[#2E9E6B]">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+{variacaoRecebidoMes}% vs mês anterior</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[#C0392B]">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{variacaoRecebidoMes}% vs mês anterior</span>
                </div>
              )
            ) : (
              <span className="text-[#5A6B7B]">
                {chargesRecebidasMesAtual.length}{' '}
                {chargesRecebidasMesAtual.length === 1 ? 'fatura liquidada' : 'faturas liquidadas'}
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Inadimplência em percentual */}
        <div
          onClick={() => setActiveSection('cobrancas')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveSection('cobrancas')
          }}
          title="Percentual do valor vencido sobre o total faturado (total a receber + recebido no mês)"
          className="cursor-pointer group bg-[#FFFFFF] p-6 rounded-[12px] border border-[#E2E8F0] border-t-4 border-t-[#C0392B] shadow-sm hover:shadow-md transition-all duration-150"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider">
                Inadimplência (%)
              </span>
              <HelpCircle className="w-3 h-3 text-[#5A6B7B]" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#C0392B]/10 text-[#C0392B] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-[#C0392B]">
              {taxaInadimplencia.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              %
            </h3>
            <span className="text-xs font-medium text-[#C0392B]">
              {formatCurrency(totalValorVencido)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-[#5A6B7B] group-hover:text-[#C0392B]">
            <span>Valor vencido sobre faturado</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Card 4: Ticket médio */}
        <div
          onClick={() => setActiveSection('cobrancas')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveSection('cobrancas')
          }}
          className="cursor-pointer group bg-[#FFFFFF] p-6 rounded-[12px] border border-[#E2E8F0] border-t-4 border-t-[#E0A100] shadow-sm hover:shadow-md transition-all duration-150"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#5A6B7B] uppercase tracking-wider">
              Ticket médio
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#E0A100]/15 text-[#B88300] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-[#1A202C]">{formatCurrency(ticketMedio)}</h3>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#5A6B7B]">
            <span>Média por cobrança paga</span>
            <ChevronRight className="w-3 h-3 group-hover:text-[#0F4C5C]" />
          </div>
        </div>
      </div>

      {/* 2 & 3. GRÁFICOS: Barras (2/3) e Rosca (1/3) no desktop, empilhados no mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras: Recebido por mês (últimos 6 meses) em SVG puro */}
        <div className="lg:col-span-2 bg-[#FFFFFF] p-6 rounded-[12px] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#0F4C5C]" />
                  <h3 className="text-base font-semibold text-[#1A202C]">
                    Recebido por mês (últimos 6 meses)
                  </h3>
                </div>
                <p className="text-xs text-[#5A6B7B] mt-0.5">
                  Total de cobranças com pagamento compensado por mês de liquidação
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#5A6B7B]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#2E9E6B]" />
                  <span>Compensado (R$)</span>
                </div>
              </div>
            </div>

            {/* SVG Puro: Gráfico de Barras com viewBox responsivo */}
            <div className="pt-6 pb-2 relative">
              <div className="w-full h-64">
                <svg
                  viewBox="0 0 600 240"
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="barGradientPrimary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2E9E6B" />
                      <stop offset="100%" stopColor="#247C54" />
                    </linearGradient>
                    <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38B97E" />
                      <stop offset="100%" stopColor="#2E9E6B" />
                    </linearGradient>
                  </defs>

                  {/* Linhas de grade horizontais sutis */}
                  {[0.25, 0.5, 0.75, 1].map((ratio) => {
                    const yPos = 200 - ratio * 160
                    return (
                      <g key={ratio}>
                        <line
                          x1="30"
                          y1={yPos}
                          x2="580"
                          y2={yPos}
                          stroke="#E2E8F0"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text
                          x="25"
                          y={yPos + 4}
                          textAnchor="end"
                          fontSize="10"
                          fill="#94A3B8"
                          className="font-mono"
                        >
                          {Math.round((maxReceivedValue * ratio) / 1000)}k
                        </text>
                      </g>
                    )
                  })}

                  {/* Linha base do eixo X */}
                  <line x1="30" y1="200" x2="580" y2="200" stroke="#CBD5E1" strokeWidth="1.5" />

                  {/* Barras em SVG */}
                  {last6MonthsData.map((item, idx) => {
                    const barWidth = 46
                    // Espaçamento calculado para 6 colunas entre x=50 e x=560
                    const slotWidth = 530 / 6
                    const xCenter = 50 + idx * slotWidth + slotWidth / 2
                    const xBar = xCenter - barWidth / 2

                    const barHeight =
                      item.value > 0
                        ? Math.max(6, Math.round((item.value / maxReceivedValue) * 160))
                        : 3
                    const yBar = 200 - barHeight
                    const isHovered = hoveredBarIndex === idx

                    return (
                      <g
                        key={item.key}
                        className="cursor-pointer transition-transform duration-150"
                        onMouseEnter={() => setHoveredBarIndex(idx)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                      >
                        {/* Área de clique/hover ampliada */}
                        <rect
                          x={xCenter - slotWidth / 2}
                          y="20"
                          width={slotWidth}
                          height="180"
                          fill="transparent"
                        />

                        {/* Barra */}
                        <rect
                          x={xBar}
                          y={yBar}
                          width={barWidth}
                          height={barHeight}
                          rx="4"
                          ry="4"
                          fill={isHovered ? 'url(#barGradientHover)' : 'url(#barGradientPrimary)'}
                          className="transition-all duration-150"
                          opacity={isHovered ? 1 : 0.92}
                        />

                        {/* Top highlight na barra */}
                        {barHeight > 6 && (
                          <line
                            x1={xBar + 3}
                            y1={yBar + 1.5}
                            x2={xBar + barWidth - 3}
                            y2={yBar + 1.5}
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            strokeOpacity="0.4"
                            strokeLinecap="round"
                          />
                        )}

                        {/* Rótulo do mês no eixo X */}
                        <text
                          x={xCenter}
                          y="218"
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight={item.isCurrent ? '700' : '500'}
                          fill={item.isCurrent ? '#0F4C5C' : '#5A6B7B'}
                          className="capitalize"
                        >
                          {item.label}
                        </text>
                      </g>
                    )
                  })}
                </svg>

                {/* Tooltip HTML flutuante estilizado para garantir precisão e elegância */}
                {hoveredBarIndex !== null && (
                  <div
                    className="absolute top-0 pointer-events-none transform -translate-x-1/2 z-20 bg-[#1A202C] text-white text-xs py-2 px-3 rounded-lg shadow-xl whitespace-nowrap animate-fade-in"
                    style={{
                      left: `${((hoveredBarIndex + 0.5) / 6) * 90 + 5}%`,
                    }}
                  >
                    <p className="font-bold text-[#2E9E6B]">
                      {formatCurrency(last6MonthsData[hoveredBarIndex].value)}
                    </p>
                    <p className="text-[11px] text-gray-300 font-medium mt-0.5">
                      {last6MonthsData[hoveredBarIndex].fullMonth}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {last6MonthsData[hoveredBarIndex].count}{' '}
                      {last6MonthsData[hoveredBarIndex].count === 1
                        ? 'fatura recebida'
                        : 'faturas recebidas'}
                    </p>
                    <div className="w-2 h-2 bg-[#1A202C] transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between text-xs text-[#5A6B7B] gap-2">
            <span>
              Média mensal (6 meses):{' '}
              <strong className="text-[#1A202C]">
                {formatCurrency(last6MonthsData.reduce((acc, m) => acc + m.value, 0) / 6)}
              </strong>
            </span>
            <button
              onClick={() => setActiveSection('cobrancas')}
              className="text-[#0F4C5C] hover:text-[#0C3D4B] font-semibold inline-flex items-center gap-1"
            >
              <span>Ver todas as cobranças</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Gráfico de Rosca (Donut): Distribuição das cobranças por status em SVG puro */}
        <div className="bg-[#FFFFFF] p-6 rounded-[12px] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-[#0F4C5C]" />
                <h3 className="text-base font-semibold text-[#1A202C]">Cobranças por status</h3>
              </div>
              <span className="text-xs text-[#5A6B7B]">
                {statusDistribution.totalCount} títulos
              </span>
            </div>
            <p className="text-xs text-[#5A6B7B] mb-4">
              Distribuição proporcional do volume financeiro total por status
            </p>

            {statusDistribution.totalCount === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-4">
                <PieIcon className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-[#1A202C]">Nenhuma cobrança registrada</p>
                <p className="text-xs text-[#5A6B7B] mt-1">
                  Gere novos boletos para visualizar a distribuição gráfica.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-6 py-2">
                {/* SVG Donut */}
                <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                  <svg
                    viewBox="0 0 200 200"
                    className="w-full h-full transform transition-all duration-150"
                  >
                    {donutArcs.map((segment) => {
                      if (!segment.pathData) return null
                      const isHovered = hoveredDonutSegment === segment.key

                      return (
                        <path
                          key={segment.key}
                          d={segment.pathData}
                          fill={segment.color}
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                          className="cursor-pointer transition-all duration-150"
                          opacity={hoveredDonutSegment && !isHovered ? 0.5 : 1}
                          transform={isHovered ? 'scale(1.03) translate(-3, -3)' : undefined}
                          onMouseEnter={() => setHoveredDonutSegment(segment.key)}
                          onMouseLeave={() => setHoveredDonutSegment(null)}
                        >
                          <title>
                            {segment.label}: {formatCurrency(segment.value)} (
                            {segment.percentage.toFixed(1)}%)
                          </title>
                        </path>
                      )
                    })}
                  </svg>

                  {/* Texto Central do Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[11px] font-semibold text-[#5A6B7B] uppercase tracking-wider">
                      {hoveredDonutSegment || 'Total'}
                    </span>
                    <span className="text-sm font-bold text-[#1A202C]">
                      {hoveredDonutSegment
                        ? formatCurrency(
                            statusDistribution.items.find((i) => i.key === hoveredDonutSegment)
                              ?.value || 0,
                          )
                        : formatCurrency(statusDistribution.totalValue)}
                    </span>
                  </div>
                </div>

                {/* Legenda Lateral / Abaixo no Mobile */}
                <div className="w-full space-y-2">
                  {statusDistribution.items.map((item) => {
                    const isHovered = hoveredDonutSegment === item.key

                    return (
                      <div
                        key={item.key}
                        onMouseEnter={() => setHoveredDonutSegment(item.key)}
                        onMouseLeave={() => setHoveredDonutSegment(null)}
                        className={`flex items-center justify-between text-xs p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                          isHovered ? 'bg-[#F7F8FA] font-semibold' : 'hover:bg-[#F7F8FA]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-[#1A202C] truncate">{item.label}</span>
                          <span className="text-[#5A6B7B] text-[11px]">({item.count})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium text-[#1A202C]">
                            {formatCurrency(item.value)}
                          </span>
                          <span className="text-[11px] font-mono text-[#5A6B7B] w-10 text-right">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] mt-2">
            <button
              onClick={() => setActiveSection('cobrancas')}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#0F4C5C] hover:text-[#0C3D4B] py-1"
            >
              <span>Gerenciar títulos e conciliação</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 & 5. LISTAS LADO A LADO: Próximos Vencimentos & Em Atraso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista: Próximos vencimentos (próximos 7 dias) */}
        <div className="bg-[#FFFFFF] p-6 rounded-[12px] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0F4C5C]" />
                <h3 className="text-base font-semibold text-[#1A202C]">Próximos vencimentos</h3>
              </div>
              <span className="text-xs font-semibold text-[#0F4C5C] bg-[#0F4C5C]/10 px-2 py-0.5 rounded-full">
                {proximosVencimentos.length} nos próximos 7 dias
              </span>
            </div>
            <p className="text-xs text-[#5A6B7B] mb-4">
              Títulos emitidos com liquidação prevista para a próxima semana
            </p>

            {proximosVencimentos.length === 0 ? (
              <div className="p-8 text-center bg-[#F7F8FA] rounded-[10px] border border-[#E2E8F0] my-2">
                <CheckCircle2 className="w-8 h-8 text-[#2E9E6B] mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-[#1A202C]">
                  Nenhum vencimento nos próximos 7 dias
                </p>
                <p className="text-xs text-[#5A6B7B] mt-1">
                  Não há títulos a vencer para o período imediato.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {proximosVencimentos.map((cob) => {
                  const badge = getDueBadge(cob.dueDate)

                  return (
                    <div
                      key={cob.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-[#F7F8FA] px-2 rounded-[8px] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#1A202C] truncate">
                            {cob.clientName}
                          </span>
                          <span
                            className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.className}`}
                          >
                            {badge.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[#5A6B7B]">
                          <span className="font-mono text-[11px]">{cob.code}</span>
                          <span>•</span>
                          <span className="truncate">{cob.description}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm text-[#1A202C]">
                          {formatCurrency(cob.value)}
                        </div>
                        <div className="text-[11px] text-[#5A6B7B] mt-0.5">
                          Vence: {formatDate(cob.dueDate)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] mt-4 flex items-center justify-between">
            <span className="text-xs text-[#5A6B7B]">
              Total:{' '}
              <strong className="text-[#1A202C]">
                {formatCurrency(proximosVencimentos.reduce((acc, c) => acc + c.value, 0))}
              </strong>
            </span>
            <button
              onClick={() => setActiveSection('cobrancas')}
              className="text-xs font-semibold text-[#0F4C5C] hover:text-[#0C3D4B] inline-flex items-center gap-1"
            >
              <span>Ver no financeiro</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Lista: Em atraso (com dias de atraso e botão de ação direta) */}
        <div className="bg-[#FFFFFF] p-6 rounded-[12px] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C0392B]" />
                <h3 className="text-base font-semibold text-[#1A202C]">Em atraso</h3>
              </div>
              <span className="text-xs font-bold text-[#C0392B] bg-[#C0392B]/10 px-2 py-0.5 rounded-full">
                {cobrancasEmAtrasoList.length} títulos vencidos
              </span>
            </div>
            <p className="text-xs text-[#5A6B7B] mb-4">
              Cobranças não liquidadas ordenadas pelas mais críticas primeiro
            </p>

            {cobrancasEmAtrasoList.length === 0 ? (
              <div className="p-8 text-center bg-[#F7F8FA] rounded-[10px] border border-[#E2E8F0] my-2">
                <CheckCircle2 className="w-8 h-8 text-[#2E9E6B] mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-[#1A202C]">Nenhuma cobrança em atraso</p>
                <p className="text-xs text-[#5A6B7B] mt-1">
                  Parabéns! Todas as faturas estão em dia.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {cobrancasEmAtrasoList.map((cob) => {
                  const daysOverdue = calculateDaysOverdue(cob.dueDate)

                  return (
                    <div
                      key={cob.id}
                      className="py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-[#F7F8FA] px-2 rounded-[8px] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#1A202C] truncate">
                            {cob.clientName}
                          </span>
                          <span className="text-[10px] font-bold text-[#C0392B] bg-red-100 border border-red-200 px-2 py-0.5 rounded-full shrink-0">
                            {daysOverdue > 0 ? `${daysOverdue} dias de atraso` : 'Vencido hoje'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[#5A6B7B]">
                          <span className="font-mono text-[11px]">{cob.code}</span>
                          <span>•</span>
                          <span>Venceu em {formatDate(cob.dueDate)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                        <div className="text-right">
                          <div className="font-bold text-sm text-[#C0392B]">
                            {formatCurrency(cob.value)}
                          </div>
                        </div>

                        {/* Botão de ação direta: Marcar como pago */}
                        <button
                          onClick={() => registerPayment(cob.id)}
                          title="Marcar como pago diretamente"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#2E9E6B] hover:bg-[#258257] text-white rounded-[6px] text-xs font-semibold shadow-sm transition-all duration-150"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Marcar como pago</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] mt-4 flex items-center justify-between">
            <span className="text-xs text-[#5A6B7B]">
              Total em aberto:{' '}
              <strong className="text-[#C0392B]">{formatCurrency(totalValorVencido)}</strong>
            </span>
            <button
              onClick={() => setActiveSection('cobrancas')}
              className="text-xs font-semibold text-[#0F4C5C] hover:text-[#0C3D4B] inline-flex items-center gap-1"
            >
              <span>Ver cobranças em atraso</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Atividade Recente mantida */}
      <div className="bg-[#FFFFFF] p-6 rounded-[12px] border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0F4C5C]" />
            <h3 className="text-base font-semibold text-[#1A202C]">Atividade Recente</h3>
          </div>
          <span className="text-xs text-[#5A6B7B]">Últimos eventos do sistema</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activities.slice(0, 6).map((act) => {
            let dotColor = 'bg-[#0F4C5C]'
            if (act.type === 'cobranca' && (act.status === 'Pago' || act.status === 'pago')) {
              dotColor = 'bg-[#2E9E6B]'
            } else if (
              act.status === 'Vencido' ||
              act.status === 'em_atraso' ||
              act.status === 'Cancelado' ||
              act.status === 'cancelado'
            ) {
              dotColor = 'bg-[#C0392B]'
            } else if (act.status === 'aceita' || act.status === 'concluida') {
              dotColor = 'bg-[#2E9E6B]'
            }

            return (
              <div
                key={act.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-[#E2E8F0]/80 bg-[#F7F8FA]/50 hover:bg-[#F7F8FA] transition-colors"
              >
                <div className={`mt-1.5 w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-[#1A202C] truncate">
                      {act.action}
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6B7B] truncate mt-0.5">{act.title}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
