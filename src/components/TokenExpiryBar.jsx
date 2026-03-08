import { Tag } from './ui'

export default function TokenExpiryBar({ expiryInfo }) {
  if (!expiryInfo) return null

  const entries = Object.entries(expiryInfo).filter(([, v]) => v.hasExpiry)
  if (entries.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted uppercase tracking-widest font-semibold">
        Token Expiry
      </div>
      {entries.map(([key, info]) => (
        <div key={key} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-text">{key}</span>
            <span className={`text-[11px] font-mono font-bold ${
              info.status === 'expired' ? 'text-danger' :
              info.status === 'warning' ? 'text-warning' :
              'text-success'
            }`}>
              {info.formattedCountdown}
            </span>
          </div>
          {/* Progress bar */}
          {info.percentage !== null && (
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  info.status === 'expired' ? 'bg-danger' :
                  info.status === 'warning' ? 'bg-warning' :
                  'bg-success'
                }`}
                style={{ width: `${Math.min(100, info.percentage)}%` }}
              />
            </div>
          )}
          <div className="text-[9px] text-muted">
            {info.isExpired
              ? `Expired at ${new Date(info.exp * 1000).toLocaleTimeString()}`
              : `Expires at ${new Date(info.exp * 1000).toLocaleTimeString()}`
            }
          </div>
        </div>
      ))}
    </div>
  )
}
