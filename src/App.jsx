import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import FlowPage from './pages/FlowPage'
import CallbackPage from './pages/CallbackPage'
import DecoderPage from './pages/DecoderPage'
import CompliancePage from './pages/CompliancePage'
import CodeExportPage from './pages/CodeExportPage'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<FlowPage />} />
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="/decoder" element={<DecoderPage />} />
        <Route path="/compliance" element={<CompliancePage />} />
        <Route path="/export" element={<CodeExportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
