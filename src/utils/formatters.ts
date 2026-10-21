export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value || 0)
}

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—'
  // Pode vir YYYY-MM-DD ou ISO
  const clean = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`
  const d = new Date(clean)
  if (isNaN(d.getTime())) return dateStr
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export const formatRelativeTime = (isoString: string): string => {
  if (!isoString) return ''
  const now = Date.now()
  const past = new Date(isoString).getTime()
  const diffSec = Math.floor((now - past) / 1000)

  if (diffSec < 60) return 'agora mesmo'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `há ${diffMin} min`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `há ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `há ${diffDays}d`
  const diffMonths = Math.floor(diffDays / 30)
  return `há ${diffMonths}m`
}

export const calculateDaysOverdue = (dueDateStr: string): number => {
  const [y, m, d] = dueDateStr.split('-').map(Number)
  if (!y || !m || !d) return 0
  const dueDate = new Date(y, m - 1, d, 23, 59, 59)
  const now = new Date()
  const diffTime = now.getTime() - dueDate.getTime()
  if (diffTime <= 0) return 0
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

export const formatDocument = (doc: string): string => {
  const cleaned = doc.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return doc
}
