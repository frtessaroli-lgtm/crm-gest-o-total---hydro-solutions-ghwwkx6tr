import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CRMProvider, useCRM } from './context/CRMContext'
import { Layout } from './components/Layout'
import { LoginScreen } from './components/LoginScreen'
import Index from './pages/Index'
import NotFound from './pages/NotFound'

const AuthenticatedApp: React.FC = () => {
  const { isAuthenticated } = useCRM()

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

const App = () => (
  <BrowserRouter>
    <CRMProvider>
      <AuthenticatedApp />
    </CRMProvider>
  </BrowserRouter>
)

export default App
