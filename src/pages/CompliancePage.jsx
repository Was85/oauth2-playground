import { useState } from 'react'
import { Button, Input, Tag, StatusBadge, CodeBlock } from '../components/ui'
import { fetchDiscoveryDocument } from '../services/oidc-discovery'
import { decodeToken } from '../services/token-service'
import { checkDiscoveryCompliance, checkTokenCompliance, summarizeResults } from '../services/compliance-checker'

export default function CompliancePage() {
  const [issuerUrl, setIssuerUrl] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [discoveryResults, setDiscoveryResults] = useState(null)
  const [tokenResults, setTokenResults] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('discovery')

  const handleCheckDiscovery = async () => {
    if (!issuerUrl.trim()) return
    setLoading(true)
    setError(null)
    setDiscoveryResults(null)

    try {
      const doc = await fetchDiscoveryDocument(issuerUrl.trim())
      const results = checkDiscoveryCompliance(doc)
      setDiscoveryResults(results)
      setActiveTab('discovery')
    } catch (err) {
      setError(`Discovery failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckToken = () => {
    if (!token.trim()) return
    setError(null)
    const decoded = decodeToken(token.trim())
    if (!decoded) {
      setError('Not a valid JWT token.')
      return
    }
    const results = checkTokenCompliance(decoded)
    setTokenResults(results)
    setActiveTab('token')
  }

  const activeResults = activeTab === 'discovery' ? discoveryResults : tokenResults
  const summary = activeResults ? summarizeResults(activeResults) : null

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-border bg-surface px-6 py-3">
        <h1 className="text-sm font-bold">OAuth Compliance Checker</h1>
        <p className="text-[10px] text-muted mt-0.5">
          Validate your IDP configuration and tokens against OAuth 2.0/2.1 best practices
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto w-full">
        {/* Discovery check */}
        <div className="bg-panel border border-border rounded-lg p-4 space-y-3">
          <div className="text-[10px] text-muted uppercase tracking-widest font-semibold">
            Check IDP Configuration
          </div>
          <div className="flex gap-2">
            <input
              value={issuerUrl}
              onChange={e => setIssuerUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCheckDiscovery()}
              placeholder="https://accounts.google.com"
              className="flex-1 px-2.5 py-1.5 text-xs font-mono rounded-md bg-bg border border-border text-text placeholder:text-muted/40 outline-none focus:border-accent/50"
            />
            <Button onClick={handleCheckDiscovery} disabled={!issuerUrl.trim() || loading} size="sm">
              {loading ? 'Checking...' : 'Check'}
            </Button>
          </div>
        </div>

        {/* Token check */}
        <div className="bg-panel border border-border rounded-lg p-4 space-y-3">
          <div className="text-[10px] text-muted uppercase tracking-widest font-semibold">
            Check Token Compliance
          </div>
          <textarea
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Paste a JWT token to check..."
            className="w-full h-20 px-2.5 py-1.5 text-xs font-mono rounded-md bg-bg border border-border text-text placeholder:text-muted/40 outline-none focus:border-accent/50 resize-none"
          />
          <Button onClick={handleCheckToken} disabled={!token.trim()} size="sm">
            Check Token
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-danger/10 border border-danger/30 rounded-lg text-xs text-danger">
            {error}
          </div>
        )}

        {/* Results */}
        {activeResults && (
          <>
            {/* Tabs */}
            <div className="flex gap-2 border-b border-border pb-2">
              {discoveryResults && (
                <button
                  onClick={() => setActiveTab('discovery')}
                  className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                    activeTab === 'discovery' ? 'text-accent bg-accent/10' : 'text-muted hover:text-text'
                  }`}
                >
                  IDP Config
                </button>
              )}
              {tokenResults && (
                <button
                  onClick={() => setActiveTab('token')}
                  className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                    activeTab === 'token' ? 'text-accent bg-accent/10' : 'text-muted hover:text-text'
                  }`}
                >
                  Token
                </button>
              )}
            </div>

            {/* Score */}
            {summary && (
              <div className="flex items-center gap-4 p-4 bg-panel border border-border rounded-lg">
                <div className={`text-3xl font-bold ${
                  summary.score >= 80 ? 'text-success' :
                  summary.score >= 50 ? 'text-warning' : 'text-danger'
                }`}>
                  {summary.score}%
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold">Compliance Score</div>
                  <div className="flex gap-3 mt-1.5 text-[11px]">
                    <span className="text-success">{summary.pass} passed</span>
                    <span className="text-danger">{summary.fail} failed</span>
                    <span className="text-warning">{summary.warn} warnings</span>
                    <span className="text-muted">{summary.info} info</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-32 h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      summary.score >= 80 ? 'bg-success' :
                      summary.score >= 50 ? 'bg-warning' : 'bg-danger'
                    }`}
                    style={{ width: `${summary.score}%` }}
                  />
                </div>
              </div>
            )}

            {/* Check results by category */}
            {['security', 'configuration', 'best-practice'].map(category => {
              const categoryResults = activeResults.filter(r => r.category === category)
              if (categoryResults.length === 0) return null

              return (
                <div key={category} className="space-y-2">
                  <div className="text-[10px] text-muted uppercase tracking-widest font-semibold">
                    {category === 'best-practice' ? 'Best Practices' : category}
                  </div>
                  {categoryResults.map(result => (
                    <CheckResultCard key={result.id} result={result} />
                  ))}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

function CheckResultCard({ result }) {
  const icons = { pass: '\u2713', fail: '\u2715', warn: '\u26A0', info: '\u2139' }
  const colors = {
    pass: 'border-success/30 bg-success/5',
    fail: 'border-danger/30 bg-danger/5',
    warn: 'border-warning/30 bg-warning/5',
    info: 'border-border bg-panel',
  }
  const textColors = { pass: 'text-success', fail: 'text-danger', warn: 'text-warning', info: 'text-muted' }

  return (
    <div className={`px-3.5 py-2.5 rounded-lg border ${colors[result.status]}`}>
      <div className="flex items-start gap-2.5">
        <span className={`text-sm ${textColors[result.status]} mt-0.5`}>
          {icons[result.status]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold">{result.title}</div>
          <div className="text-[11px] text-muted mt-0.5 leading-relaxed">{result.description}</div>
          {result.recommendation && (
            <div className="text-[11px] text-accent mt-1">
              &rarr; {result.recommendation}
            </div>
          )}
          {result.reference && (
            <div className="text-[9px] text-muted/60 mt-1">{result.reference}</div>
          )}
        </div>
      </div>
    </div>
  )
}
