import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Flows' },
  { to: '/decoder', label: 'JWT Decoder' },
  { to: '/compliance', label: 'Compliance' },
  { to: '/export', label: 'Export' },
]

export default function AppShell({ children }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-bg text-text font-mono flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent2 rounded-lg flex items-center justify-center text-base">
            ⚡
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide">OAuth DevTools</div>
            <div className="text-[10px] text-muted tracking-widest uppercase">Test Real OAuth Flows</div>
          </div>
        </div>
        <nav className="ml-auto flex gap-1">
          {NAV_ITEMS.map(({ to, label }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  isActive
                    ? 'text-accent bg-accent/10'
                    : 'text-muted hover:text-accent'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
    </div>
  )
}
