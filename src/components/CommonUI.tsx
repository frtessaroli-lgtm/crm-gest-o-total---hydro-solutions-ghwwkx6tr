import React from 'react'
import { FolderOpen, Plus, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export const ErrorState: React.FC<{
  title?: string
  message: string
  onRetry?: () => void
}> = ({ title = 'Erro ao carregar dados', message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-xl border border-red-200 shadow-sm my-4">
      <div className="w-12 h-12 rounded-full bg-red-50 text-[#C0392B] flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-[#1A202C] mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-[#5A6B7B] max-w-md mb-5 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Tentar Novamente</span>
        </button>
      )}
    </div>
  )
}

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 animate-pulse space-y-4">
      <div className="h-8 bg-slate-100 rounded-lg w-1/3 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 py-3 border-b border-[#E2E8F0] last:border-0"
        >
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-100 rounded w-1/4" />
            <div className="h-3 bg-slate-100/60 rounded w-1/2" />
          </div>
          <div className="h-6 bg-slate-100 rounded-full w-20" />
          <div className="h-4 bg-slate-100 rounded w-24 hidden sm:block" />
        </div>
      ))}
    </div>
  )
}

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm space-y-3"
        >
          <div className="h-4 bg-slate-100 rounded w-1/2" />
          <div className="h-7 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100/60 rounded w-1/3" />
        </div>
      ))}
    </div>
  )
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-[#FFFFFF] rounded-xl border border-dashed border-[#E2E8F0] my-4">
      <div className="w-14 h-14 rounded-full bg-[#0F4C5C]/5 text-[#0F4C5C] flex items-center justify-center mb-4">
        {icon || <FolderOpen className="w-7 h-7 text-[#0F4C5C]" />}
      </div>
      <h3 className="text-base font-semibold text-[#1A202C] mb-1">{title}</h3>
      <p className="text-sm text-[#5A6B7B] max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-[#FFFFFF] rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  )
}

export const StatusBadge: React.FC<{
  status: string
  type: 'client' | 'proposal' | 'os' | 'invoice' | 'charge'
}> = ({ status, type }) => {
  let label = status
  let bg = 'bg-slate-100'
  let text = 'text-slate-700'
  let dot = 'bg-slate-500'

  if (type === 'client') {
    if (status === 'ativo') {
      label = 'Ativo'
      bg = 'bg-[#2E9E6B]/10'
      text = 'text-[#2E9E6B]'
      dot = 'bg-[#2E9E6B]'
    } else {
      label = 'Inativo'
      bg = 'bg-[#E2E8F0]'
      text = 'text-[#5A6B7B]'
      dot = 'bg-[#5A6B7B]'
    }
  } else if (type === 'proposal') {
    switch (status) {
      case 'rascunho':
        label = 'Rascunho'
        bg = 'bg-[#E2E8F0]'
        text = 'text-[#5A6B7B]'
        dot = 'bg-[#5A6B7B]'
        break
      case 'enviada':
        label = 'Enviada'
        bg = 'bg-[#0F4C5C]/10'
        text = 'text-[#0F4C5C]'
        dot = 'bg-[#0F4C5C]'
        break
      case 'aceita':
        label = 'Aceita'
        bg = 'bg-[#2E9E6B]/10'
        text = 'text-[#2E9E6B]'
        dot = 'bg-[#2E9E6B]'
        break
      case 'recusada':
        label = 'Recusada'
        bg = 'bg-[#C0392B]/10'
        text = 'text-[#C0392B]'
        dot = 'bg-[#C0392B]'
        break
    }
  } else if (type === 'os') {
    switch (status) {
      case 'aberta':
        label = 'Aberta'
        bg = 'bg-[#E2E8F0]'
        text = 'text-[#5A6B7B]'
        dot = 'bg-[#5A6B7B]'
        break
      case 'em_andamento':
        label = 'Em andamento'
        bg = 'bg-[#0F4C5C]/10'
        text = 'text-[#0F4C5C]'
        dot = 'bg-[#0F4C5C]'
        break
      case 'concluida':
        label = 'Concluída'
        bg = 'bg-[#2E9E6B]/10'
        text = 'text-[#2E9E6B]'
        dot = 'bg-[#2E9E6B]'
        break
      case 'cancelada':
        label = 'Cancelada'
        bg = 'bg-[#C0392B]/10'
        text = 'text-[#C0392B]'
        dot = 'bg-[#C0392B]'
        break
    }
  } else if (type === 'invoice') {
    switch (status) {
      case 'pendente':
        label = 'Pendente'
        bg = 'bg-[#E0A100]/15'
        text = 'text-[#B88300]'
        dot = 'bg-[#E0A100]'
        break
      case 'emitida':
        label = 'Emitida'
        bg = 'bg-[#0F4C5C]/10'
        text = 'text-[#0F4C5C]'
        dot = 'bg-[#0F4C5C]'
        break
      case 'enviada':
        label = 'Enviada'
        bg = 'bg-[#2E9E6B]/10'
        text = 'text-[#2E9E6B]'
        dot = 'bg-[#2E9E6B]'
        break
      case 'cancelada':
        label = 'Cancelada'
        bg = 'bg-[#C0392B]/10'
        text = 'text-[#C0392B]'
        dot = 'bg-[#C0392B]'
        break
    }
  } else if (type === 'charge') {
    switch (status) {
      case 'Emitido':
      case 'em_aberto':
        label = 'Emitido'
        bg = 'bg-[#0F4C5C]/10'
        text = 'text-[#0F4C5C]'
        dot = 'bg-[#0F4C5C]'
        break
      case 'Pago':
      case 'pago':
        label = 'Pago'
        bg = 'bg-[#2E9E6B]/10'
        text = 'text-[#2E9E6B]'
        dot = 'bg-[#2E9E6B]'
        break
      case 'Vencido':
      case 'em_atraso':
        label = 'Vencido'
        bg = 'bg-[#C0392B]/15'
        text = 'text-[#C0392B]'
        dot = 'bg-[#C0392B]'
        break
      case 'Cancelado':
      case 'cancelado':
        label = 'Cancelado'
        bg = 'bg-[#E2E8F0]'
        text = 'text-[#5A6B7B]'
        dot = 'bg-[#5A6B7B]'
        break
      default:
        label = status
        bg = 'bg-slate-100'
        text = 'text-slate-700'
        dot = 'bg-slate-500'
        break
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${bg} ${text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
    </span>
  )
}
