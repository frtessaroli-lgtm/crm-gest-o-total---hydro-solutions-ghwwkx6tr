import React from 'react'
import { useCRM } from '../context/CRMContext'
import { DashboardSection } from '../components/sections/DashboardSection'
import { ClientesSection } from '../components/sections/ClientesSection'
import { PropostasSection } from '../components/sections/PropostasSection'
import { OrdensServicoSection } from '../components/sections/OrdensServicoSection'
import { NotasFiscaisSection } from '../components/sections/NotasFiscaisSection'
import { CobrancasSection } from '../components/sections/CobrancasSection'
import { ConfiguracoesSection } from '../components/sections/ConfiguracoesSection'

const Index: React.FC = () => {
  const { activeSection } = useCRM()

  return (
    <div className="w-full">
      {activeSection === 'dashboard' && <DashboardSection />}
      {activeSection === 'clientes' && <ClientesSection />}
      {activeSection === 'propostas' && <PropostasSection />}
      {activeSection === 'ordens-servico' && <OrdensServicoSection />}
      {activeSection === 'notas-fiscais' && <NotasFiscaisSection />}
      {activeSection === 'cobrancas' && <CobrancasSection />}
      {activeSection === 'configuracoes' && <ConfiguracoesSection />}
    </div>
  )
}

export default Index
