import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CRMProvider } from './context/CRMContext'
import { Layout } from './components/Layout'
import Index from './pages/Index'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <CRMProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </CRMProvider>
  </BrowserRouter>
)

export default App
