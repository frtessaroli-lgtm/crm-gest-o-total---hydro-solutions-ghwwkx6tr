import React, { useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { useCRM } from '../context/CRMContext'

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useCRM()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success'
        const isError = toast.type === 'error'

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-200 animate-slide-down ${
              isSuccess
                ? 'bg-[#FFFFFF] border-[#2E9E6B]/30 text-[#1A202C]'
                : isError
                  ? 'bg-[#FFFFFF] border-[#C0392B]/30 text-[#1A202C]'
                  : 'bg-[#FFFFFF] border-[#0F4C5C]/30 text-[#1A202C]'
            }`}
            style={{
              boxShadow:
                '0 8px 24px -4px rgba(15, 76, 92, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-[#2E9E6B]" />}
              {isError && <AlertCircle className="w-5 h-5 text-[#C0392B]" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-[#0F4C5C]" />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h5 className="text-sm font-semibold text-[#1A202C]">{toast.title}</h5>
              )}
              <p className="text-sm text-[#5A6B7B] leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-[#5A6B7B] hover:text-[#1A202C] transition-colors p-1 -mr-1 -mt-1 rounded-md"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
    '3xl': 'max-w-4xl',
  }[maxWidth]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Overlay com blur sutil */}
      <div
        className="fixed inset-0 bg-[#0F4C5C]/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className={`relative w-full ${widthClasses} bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden my-8 z-10 flex flex-col max-h-[90vh] animate-fade-in-up`}
        style={{
          boxShadow: '0 25px 50px -12px rgba(15, 76, 92, 0.25)',
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F7F8FA]/60 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-[#1A202C] leading-snug">{title}</h3>
            {subtitle && <p className="text-xs text-[#5A6B7B] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5A6B7B] hover:text-[#1A202C] hover:bg-[#E2E8F0]/50 transition-colors"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body com scroll suave */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
