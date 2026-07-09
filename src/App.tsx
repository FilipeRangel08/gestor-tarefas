import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './store/useStore'
import { Layout } from './ui/components/Layout'
import { DashboardPage } from './ui/pages/DashboardPage'
import { AtividadeFormPage } from './ui/pages/AtividadeFormPage'
import { DetalheAtividadePage } from './ui/pages/DetalheAtividadePage'
import { HistoricoPage } from './ui/pages/HistoricoPage'
import { DiagnosticoPage } from './ui/pages/DiagnosticoPage'

export default function App() {
  const carregar = useStore((s) => s.carregar)

  useEffect(() => {
    carregar()
  }, [carregar])

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="nova" element={<AtividadeFormPage />} />
        <Route path="atividade/:id" element={<DetalheAtividadePage />} />
        <Route path="atividade/:id/editar" element={<AtividadeFormPage />} />
        <Route path="historico" element={<HistoricoPage />} />
        <Route path="diagnostico" element={<DiagnosticoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
