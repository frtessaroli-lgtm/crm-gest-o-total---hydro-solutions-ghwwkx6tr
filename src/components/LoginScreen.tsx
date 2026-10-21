import React, { useState } from 'react'
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useCRM } from '../context/CRMContext'

export const LoginScreen: React.FC = () => {
  const { addToast } = useCRM()
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [email, setEmail] = useState('fr.tessaroli@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [passwordConfirm, setPasswordConfirm] = useState('Skip@Pass')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password) {
      setErrorMessage('Preencha seu e-mail e senha.')
      return
    }

    if (isRegisterMode) {
      if (password.length < 8) {
        setErrorMessage('A senha deve conter no mínimo 8 caracteres.')
        return
      }
      if (password !== passwordConfirm) {
        setErrorMessage('A confirmação de senha não confere.')
        return
      }
    }

    setIsLoading(true)

    try {
      if (isRegisterMode) {
        // Criar conta
        await pb.collection('users').create({
          email: email.trim(),
          password,
          passwordConfirm,
          name: name.trim() || 'Usuário Nexo',
        })
        // Realizar login automático logo após
        await pb.collection('users').authWithPassword(email.trim(), password)
        addToast('success', 'Conta criada com sucesso! Bem-vindo ao Nexo CRM.')
      } else {
        // Login normal
        await pb.collection('users').authWithPassword(email.trim(), password)
        addToast('success', 'Acesso autorizado. Carregando dados...')
      }
    } catch (err: any) {
      console.error('Auth error:', err)
      const msg =
        err?.response?.message ||
        err?.message ||
        (isRegisterMode
          ? 'Falha ao criar conta. Verifique os dados.'
          : 'E-mail ou senha incorretos.')
      setErrorMessage(msg)
      addToast('error', msg, 'Falha na Autenticação')
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickFillAdmin = () => {
    setEmail('fr.tessaroli@gmail.com')
    setPassword('Skip@Pass')
    setPasswordConfirm('Skip@Pass')
    setIsRegisterMode(false)
    setErrorMessage(null)
  }

  const handleQuickFillDemo = () => {
    setEmail('admin@nexocrm.com.br')
    setPassword('Skip@Pass')
    setPasswordConfirm('Skip@Pass')
    setIsRegisterMode(false)
    setErrorMessage(null)
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center items-center p-4 selection:bg-[#0F4C5C]/20">
      <div className="w-full max-w-md">
        {/* Logo e Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0F4C5C] text-white font-black text-2xl shadow-lg shadow-[#0F4C5C]/20 mb-4">
            N
          </div>
          <h1 className="text-2xl font-bold text-[#1A202C] tracking-tight">Nexo CRM & Gestão</h1>
          <p className="text-sm text-[#5A6B7B] mt-1">
            Plataforma corporativa com banco de dados em nuvem
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-lg font-bold text-[#1A202C]">
                {isRegisterMode ? 'Criar Nova Conta' : 'Acessar Plataforma'}
              </h2>
              <p className="text-xs text-[#5A6B7B] mt-0.5">
                {isRegisterMode
                  ? 'Cadastre-se para gerenciar clientes e cobranças'
                  : 'Entre com suas credenciais do PocketBase'}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#2E9E6B]/10 text-[#2E9E6B] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Skip Cloud
            </span>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#C0392B] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-semibold text-[#1A202C] mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#5A6B7B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#0F4C5C] focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1.5">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5A6B7B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@empresa.com.br"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#0F4C5C] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A202C] mb-1.5">
                Senha (mínimo 8 caracteres)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5A6B7B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#0F4C5C] focus:bg-white transition-all"
                />
              </div>
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-xs font-semibold text-[#1A202C] mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#5A6B7B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#0F4C5C] focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-[#0F4C5C] hover:bg-[#0C3D4B] text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-[#0F4C5C]/20 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <span>{isRegisterMode ? 'Criar Conta' : 'Entrar no Sistema'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Alternar entre login e cadastro */}
          <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#5A6B7B]">
            <span>{isRegisterMode ? 'Já possui cadastro?' : 'Primeiro acesso na plataforma?'}</span>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode)
                setErrorMessage(null)
              }}
              className="text-[#0F4C5C] font-semibold hover:underline"
            >
              {isRegisterMode ? 'Fazer login' : 'Criar nova conta'}
            </button>
          </div>
        </div>

        {/* Dica de Acesso Rápido com Seed */}
        <div className="mt-6 p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm text-xs text-[#5A6B7B] space-y-2">
          <div className="flex items-center gap-2 font-semibold text-[#1A202C]">
            <Sparkles className="w-4 h-4 text-[#E0A100]" />
            <span>Contas pré-configuradas no banco (Seed):</span>
          </div>
          <p className="leading-relaxed">
            O banco PocketBase já possui contas ativas para acesso imediato:
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleQuickFillAdmin}
              className="p-2 rounded-lg bg-[#F7F8FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] text-left transition-colors"
            >
              <span className="font-semibold text-[#1A202C] block">Carlos Tessaroli</span>
              <span className="text-[11px] text-[#5A6B7B] truncate block">
                fr.tessaroli@gmail.com
              </span>
              <span className="text-[10px] text-[#2E9E6B] font-mono">Senha: Skip@Pass</span>
            </button>
            <button
              type="button"
              onClick={handleQuickFillDemo}
              className="p-2 rounded-lg bg-[#F7F8FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] text-left transition-colors"
            >
              <span className="font-semibold text-[#1A202C] block">Admin Nexo CRM</span>
              <span className="text-[11px] text-[#5A6B7B] truncate block">
                admin@nexocrm.com.br
              </span>
              <span className="text-[10px] text-[#2E9E6B] font-mono">Senha: Skip@Pass</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
