import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'

const FlowPage = lazy(() => import('./pages/FlowPage'))
const CallbackPage = lazy(() => import('./pages/CallbackPage'))
const DecoderPage = lazy(() => import('./pages/DecoderPage'))
const CompliancePage = lazy(() => import('./pages/CompliancePage'))
const CodeExportPage = lazy(() => import('./pages/CodeExportPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-accent animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<FlowPage />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/decoder" element={<DecoderPage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/export" element={<CodeExportPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}
