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

/**
 * Aplica máscara progressiva de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
 */
export const maskDocument = (value: string, type: 'PF' | 'PJ'): string => {
  const digits = value.replace(/\D/g, '')
  if (type === 'PF') {
    const limited = digits.slice(0, 11)
    if (limited.length <= 3) return limited
    if (limited.length <= 6) return `${limited.slice(0, 3)}.${limited.slice(3)}`
    if (limited.length <= 9)
      return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`
  } else {
    const limited = digits.slice(0, 14)
    if (limited.length <= 2) return limited
    if (limited.length <= 5) return `${limited.slice(0, 2)}.${limited.slice(2)}`
    if (limited.length <= 8)
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`
    if (limited.length <= 12) {
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`
    }
    return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12)}`
  }
}

/**
 * Validação com Dígito Verificador de CPF pelo algoritmo módulo 11
 */
export const isValidCPF = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return false
  // Rejeita sequências repetidas (111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(clean)) return false

  // 1º dígito
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i)
  }
  let rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(clean.charAt(9), 10)) return false

  // 2º dígito
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i)
  }
  rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(clean.charAt(10), 10)) return false

  return true
}

/**
 * Validação com Dígito Verificador de CNPJ pelo algoritmo módulo 11
 */
export const isValidCNPJ = (cnpj: string): boolean => {
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return false
  if (/^(\d)\1{13}$/.test(clean)) return false

  // 1º dígito
  let length = clean.length - 2
  let numbers = clean.substring(0, length)
  const digits = clean.substring(length)
  let sum = 0
  let pos = length - 7
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i), 10) * pos--
    if (pos < 2) pos = 9
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0), 10)) return false

  // 2º dígito
  length = length + 1
  numbers = clean.substring(0, length)
  sum = 0
  pos = length - 7
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i), 10) * pos--
    if (pos < 2) pos = 9
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1), 10)) return false

  return true
}

/**
 * Calcula a próxima data de cobrança mensal baseada no dia de vencimento (1 a 31).
 * Retorna a próxima ocorrência futura daquele dia.
 */
export const calculateNextChargeDate = (dueDay?: number, fromDate: Date = new Date()): Date => {
  const validDay = Math.min(31, Math.max(1, dueDay || 10))
  const today = new Date(fromDate)
  today.setHours(0, 0, 0, 0)

  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  // Quantos dias tem o mês atual?
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const clampedDayThisMonth = Math.min(validDay, daysInCurrentMonth)
  const candidateThisMonth = new Date(currentYear, currentMonth, clampedDayThisMonth, 0, 0, 0, 0)

  if (candidateThisMonth.getTime() >= today.getTime()) {
    return candidateThisMonth
  }

  // Mês seguinte
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
  const daysInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate()
  const clampedDayNextMonth = Math.min(validDay, daysInNextMonth)
  return new Date(nextMonthYear, nextMonth, clampedDayNextMonth, 0, 0, 0, 0)
}

/**
 * Formata a próxima cobrança como DD/MM/AAAA a partir do dia de vencimento
 */
export const formatNextChargeDate = (dueDay?: number): string => {
  const nextDate = calculateNextChargeDate(dueDay)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(nextDate)
}
