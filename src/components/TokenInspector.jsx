import { useState, useMemo } from 'react'
import { Tag, CodeBlock, StatusBadge } from './ui'
import { CLAIM_DESCRIPTIONS } from '../config/defaults'

export default function TokenInspector({ tokens = {}, onVerify }) {
  const [activeTab, setActiveTab] = useState(null)

  const tokenEntries = useMemo(() => {
    return Object.entries(tokens)
      .filter(([, v]) => v && typeof v === 'string')
      .map(([key, value]) => {
        const parts = value.split('.')
        if (parts.length !== 3) return { key, value, isJwt: false }

        try {
          const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')))
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
          const now = Math.floor(Date.now() / 1000)

          return {
            key,
            value,
            isJwt: true,
            header,
            payload,
            isExpired: payload.exp ? payload.exp < now : false,
            expiresIn: payload.exp ? payload.exp - now : null,
          }
        } catch {
          return { key, value, isJwt: false }
        }
      })
  }, [tokens])

  if (tokenEntries.length === 0) {
    return (
      <div className="text-center py-12 text-muted text-xs leading-relaxed">
        Run the flow to see<br />your tokens here.
      </div>
    )
  }

  const active = activeTab || tokenEntries[0]?.key
  const activeToken = tokenEntries.find(t => t.key === active)

  return (
    <div className="space-y-3">
      {/* Token tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {tokenEntries.map(t => {
          const color = t.key.includes('access') ? 'accent'
            : t.key.includes('id') ? 'accent2'
            : t.key.includes('refresh') ? 'warning' : 'success'
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`
                px-2.5 py-1 rounded text-[11px] font-mono font-semibold
                border transition-all cursor-pointer
                ${active === t.key
                  ? `bg-${color}/15 text-${color} border-${color}/30`
                  : 'bg-panel text-muted border-border hover:text-text'
                }
              `}
            >
              {t.key}
            </button>
          )
        })}
      </div>

      {activeToken && (
        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center gap-2">
            {activeToken.isJwt && (
              <Tag color="muted">JWT</Tag>
            )}
            {activeToken.isExpired === true && (
              <StatusBadge status="error" label="Expired" />
            )}
            {activeToken.isExpired === false && activeToken.expiresIn !== null && (
              <StatusBadge
                status={activeToken.expiresIn < 300 ? 'active' : 'done'}
                label={`Expires in ${formatDuration(activeToken.expiresIn)}`}
              />
            )}
          </div>

          {/* Raw token */}
          <div>
            <div className="text-[10px] text-muted uppercase tracking-widest mb-1.5">Raw Token</div>
            <CodeBlock copyable>
              {activeToken.value}
            </CodeBlock>
          </div>

          {/* Decoded sections */}
          {activeToken.isJwt && (
            <>
              <div>
                <div className="text-[10px] text-muted uppercase tracking-widest mb-1.5">Header</div>
                <CodeBlock copyable>
                  {JSON.stringify(activeToken.header, null, 2)}
                </CodeBlock>
              </div>

              <div>
                <div className="text-[10px] text-muted uppercase tracking-widest mb-1.5">Payload</div>
                <div className="bg-bg border border-border rounded-md divide-y divide-border">
                  {Object.entries(activeToken.payload).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-3 px-3 py-1.5">
                      <div className="flex-shrink-0 w-28">
                        <span className="text-[11px] font-mono font-semibold text-accent">{k}</span>
                        {CLAIM_DESCRIPTIONS[k] && (
                          <div className="text-[9px] text-muted leading-tight mt-0.5">
                            {CLAIM_DESCRIPTIONS[k]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-[11px] font-mono text-code break-all">
                        {formatClaimValue(k, v)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {onVerify && (
                <button
                  onClick={() => onVerify(activeToken.value)}
                  className="w-full py-2 text-xs font-semibold text-accent
                    bg-accent/10 border border-accent/30 rounded-md
                    hover:bg-accent/20 transition-colors cursor-pointer"
                >
                  Verify Signature (JWKS)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function formatClaimValue(key, value) {
  if ((key === 'exp' || key === 'iat' || key === 'nbf' || key === 'auth_time') && typeof value === 'number') {
    return `${value} (${new Date(value * 1000).toLocaleString()})`
  }
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

function formatDuration(seconds) {
  if (seconds < 0) return 'expired'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}
