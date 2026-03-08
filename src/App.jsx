import { Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'
import FlowPage from './pages/FlowPage'
import CallbackPage from './pages/CallbackPage'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<FlowPage />} />
        <Route path="/callback" element={<CallbackPage />} />
      </Routes>
    </AppShell>
  )
}
