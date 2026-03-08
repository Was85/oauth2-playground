import { useState, useMemo } from 'react'
import { decodeToken, analyzeToken, verifyToken, fetchJWKS } from '../services/token-service'
import { CLAIM_DESCRIPTIONS } from '../config/defaults'
import { Button, Tag, StatusBadge, CodeBlock } from '../components/ui'

export default function DecoderPage() {
  const [input, setInput] = useState('')
  const [jwksUri, setJwksUri] = useState('')
  const [verification, setVerification] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [jwksData, setJwksData] = useState(null)

  const decoded = useMemo(() => {
    if (!input.trim()) return null
    return decodeToken(input.trim())
  }, [input])

  const analysis = useMemo(() => {
    if (!input.trim()) return null
    return analyzeToken(input.trim())
  }, [input])

  const handleVerify = async () => {
    if (!jwksUri.trim() || !input.trim()) return
    setVerifying(true)
    setVerification(null)

    try {
      const result = await verifyToken(input.trim(), jwksUri.trim())
      setVerification(result)

      // Also fetch JWKS for display
      try {
        const jwks = await fetchJWKS(jwksUri.trim())
        setJwksData(jwks)
      } catch { /* ignore */ }
    } catch (err) {
      setVerification({ valid: false, error: err.message })
    } finally {
      setVerifying(false)
    }
  }

  // Color the JWT parts
  const coloredToken = useMemo(() => {
    if (!input.trim()) return null
    const parts = input.trim().split('.')
    if (parts.length !== 3) return null
    return { header: parts[0], payload: parts[1], signature: parts[2] }
  }, [input])

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left: Input */}
      <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
        <div className="border-b border-border bg-surface px-4 py-2.5 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold">JWT Decoder</h1>
            <p className="text-[10px] text-muted mt-0.5">Paste a JWT to decode, inspect claims, and verify signatures</p>
          </div>
          {input.trim() && (
            <Button onClick={() => { setInput(''); setVerification(null); setJwksData(null) }} variant="ghost" size="sm">
              Clear
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Token input */}
          <div>
            <label className="text-[10px] text-muted uppercase tracking-widest block mb-1.5">
              Encoded Token
            </label>
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); setVerification(null) }}
              placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIi..."
              className="w-full h-32 px-3 py-2 text-xs font-mono rounded-md bg-panel border border-border text-text placeholder:text-muted/40 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 resize-none"
            />
          </div>

          {/* Colored token display */}
          {coloredToken && (
            <div className="p-3 bg-bg rounded-md border border-border overflow-x-auto">
              <div className="text-[11px] font-mono break-all leading-relaxed">
                <span className="text-danger">{coloredToken.header}</span>
                <span className="text-muted">.</span>
                <span className="text-accent2">{coloredToken.payload}</span>
                <span className="text-muted">.</span>
                <span className="text-accent">{coloredToken.signature}</span>
              </div>
              <div className="flex gap-4 mt-2 text-[9px]">
                <span className="text-danger">&#9632; Header</span>
                <span className="text-accent2">&#9632; Payload</span>
                <span className="text-accent">&#9632; Signature</span>
              </div>
            </div>
          )}

          {/* Status bar */}
          {analysis && (
            <div className="flex flex-wrap gap-2 items-center">
              <Tag color={decoded ? 'success' : 'danger'}>
                {decoded ? 'Valid JWT' : 'Invalid'}
              </Tag>
              {analysis.algorithm && (
                <Tag color="muted">{analysis.algorithm}</Tag>
              )}
              {analysis.keyId && (
                <Tag color="muted">kid: {analysis.keyId}</Tag>
              )}
              {analysis.isExpired === true && (
                <StatusBadge status="error" label="Expired" />
              )}
              {analysis.isExpired === false && analysis.expiresIn !== null && (
                <StatusBadge
                  status={analysis.expiresIn < 300 ? 'active' : 'done'}
                  label={`Expires in ${formatDuration(analysis.expiresIn)}`}
                />
              )}
            </div>
          )}

          {/* JWKS Verification */}
          {decoded && (
            <div className="p-3 bg-panel rounded-md border border-border space-y-2">
              <div className="text-[10px] text-muted uppercase tracking-widest font-semibold">
                Signature Verification
              </div>
              <div className="flex gap-1.5">
                <input
                  value={jwksUri}
                  onChange={e => { setJwksUri(e.target.value); setVerification(null) }}
                  placeholder="https://example.com/.well-known/jwks.json"
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono rounded-md bg-bg border border-border text-text placeholder:text-muted/40 outline-none focus:border-accent/50"
                />
                <Button
                  onClick={handleVerify}
                  disabled={!jwksUri.trim() || verifying}
                  size="sm"
                >
                  {verifying ? 'Verifying...' : 'Verify'}
                </Button>
              </div>

              {verification && (
                <div className={`p-2.5 rounded-md border ${
                  verification.valid
                    ? 'bg-success/10 border-success/30'
                    : 'bg-danger/10 border-danger/30'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${verification.valid ? 'text-success' : 'text-danger'}`}>
                      {verification.valid ? '&#10003;' : '&#10007;'}
                    </span>
                    <span className={`text-xs font-semibold ${verification.valid ? 'text-success' : 'text-danger'}`}>
                      {verification.valid ? 'Signature Valid' : 'Signature Invalid'}
                    </span>
                  </div>
                  {verification.error && (
                    <div className="text-[11px] text-muted mt-1">{verification.error}</div>
                  )}
                </div>
              )}

              {jwksData && (
                <details className="text-[11px]">
                  <summary className="text-muted cursor-pointer hover:text-text transition-colors">
                    View JWKS ({jwksData.keys?.length || 0} keys)
                  </summary>
                  <CodeBlock copyable className="mt-1.5">
                    {JSON.stringify(jwksData, null, 2)}
                  </CodeBlock>
                </details>
              )}
            </div>
          )}

          {/* Not a valid JWT message */}
          {input.trim() && !decoded && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-md">
              <div className="text-xs font-semibold text-danger">Not a valid JWT</div>
              <div className="text-[11px] text-muted mt-1">
                A JWT must have 3 base64url-encoded parts separated by dots (header.payload.signature).
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Decoded output */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface">
        <div className="border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-bold">Decoded</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!decoded ? (
            <div className="text-center py-16 text-muted text-xs">
              Paste a JWT on the left to decode it.
            </div>
          ) : (
            <>
              {/* Header */}
              <div>
                <div className="text-[10px] text-danger uppercase tracking-widest font-semibold mb-1.5">
                  Header
                </div>
                <CodeBlock copyable>
                  {JSON.stringify(decoded.header, null, 2)}
                </CodeBlock>
              </div>

              {/* Payload - claim by claim */}
              <div>
                <div className="text-[10px] text-accent2 uppercase tracking-widest font-semibold mb-1.5">
                  Payload ({Object.keys(decoded.payload).length} claims)
                </div>
                <div className="bg-bg border border-border rounded-md divide-y divide-border">
                  {Object.entries(decoded.payload).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 px-3 py-2">
                      <div className="flex-shrink-0 w-32">
                        <span className="text-[11px] font-mono font-semibold text-accent2">{key}</span>
                        {CLAIM_DESCRIPTIONS[key] && (
                          <div className="text-[9px] text-muted leading-tight mt-0.5">
                            {CLAIM_DESCRIPTIONS[key]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-[11px] font-mono text-code break-all">
                        {formatClaimValue(key, value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw payload JSON */}
              <details className="text-[11px]">
                <summary className="text-muted cursor-pointer hover:text-text transition-colors">
                  View raw payload JSON
                </summary>
                <CodeBlock copyable className="mt-1.5">
                  {JSON.stringify(decoded.payload, null, 2)}
                </CodeBlock>
              </details>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function formatClaimValue(key, value) {
  if ((key === 'exp' || key === 'iat' || key === 'nbf' || key === 'auth_time') && typeof value === 'number') {
    const date = new Date(value * 1000)
    const now = Math.floor(Date.now() / 1000)
    const diff = value - now
    let relative = ''
    if (key === 'exp') {
      relative = diff > 0 ? ` (in ${formatDuration(diff)})` : ` (${formatDuration(Math.abs(diff))} ago)`
    }
    return `${value} → ${date.toLocaleString()}${relative}`
  }
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  }
  if (typeof value === 'boolean') {
    return value ? 'true \u2713' : 'false \u2715'
  }
  return String(value)
}

function formatDuration(seconds) {
  if (seconds < 0) return 'expired'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}
