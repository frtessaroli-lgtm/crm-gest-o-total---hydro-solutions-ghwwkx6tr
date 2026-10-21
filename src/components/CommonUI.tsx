import React from 'react'
import { FolderOpen, Plus, Sparkles } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
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
      case 'em_aberto':
        label = 'Em aberto'
        bg = 'bg-[#E0A100]/15'
        text = 'text-[#B88300]'
        dot = 'bg-[#E0A100]'
        break
      case 'pago':
        label = 'Pago'
        bg = 'bg-[#2E9E6B]/10'
        text = 'text-[#2E9E6B]'
        dot = 'bg-[#2E9E6B]'
        break
      case 'em_atraso':
        label = 'Em atraso'
        bg = 'bg-[#C0392B]/15'
        text = 'text-[#C0392B]'
        dot = 'bg-[#C0392B]'
        break
      case 'cancelado':
        label = 'Cancelado'
        bg = 'bg-[#E2E8F0]'
        text = 'text-[#5A6B7B]'
        dot = 'bg-[#5A6B7B]'
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
