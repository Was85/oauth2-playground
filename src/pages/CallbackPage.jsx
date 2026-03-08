import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeCodeForTokens } from '../services/crypto'

const FLOW_STATE_KEY = 'oauth-devtools:flow-state'

function loadFlowState() {
  const raw = sessionStorage.getItem(FLOW_STATE_KEY)
  if (!raw) return null
  sessionStorage.removeItem(FLOW_STATE_KEY)
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function CallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('Processing OAuth callback...')
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const code = searchParams.get('code')
    const returnedState = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      setStatus('error')
      setMessage(`Authorization error: ${error}${errorDescription ? ` — ${errorDescription}` : ''}`)
      return
    }

    if (!code) {
      setStatus('error')
      setMessage('No authorization code found in callback URL.')
      return
    }

    const savedState = loadFlowState()
    if (!savedState) {
      setStatus('error')
      setMessage('No flow state found. The flow may have been interrupted.')
      return
    }

    // Validate CSRF state
    if (returnedState !== savedState.state) {
      setStatus('error')
      setMessage(`State mismatch! Expected: ${savedState.state}, got: ${returnedState}. Possible CSRF attack.`)
      return
    }

    async function process() {
      try {
        const result = await exchangeCodeForTokens({
          tokenEndpoint: savedState.discovery.tokenEndpoint,
          code,
          redirectUri: savedState.config.redirectUri,
          clientId: savedState.config.clientId,
          codeVerifier: savedState.codeVerifier,
        })

        if (!result.success) {
          setStatus('error')
          setMessage(`Token exchange failed: ${result.error} — ${result.errorDescription}`)
          return
        }

        const receivedTokens = {
          access_token: result.accessToken,
          id_token: result.idToken,
          refresh_token: result.refreshToken,
          token_type: result.tokenType,
          expires_in: result.expiresIn,
          scope: result.scope,
        }

        setStatus('success')
        setMessage('Tokens received! Redirecting to flow page...')
        sessionStorage.setItem('oauth-devtools:callback-tokens', JSON.stringify(receivedTokens))
        // Also pass discovery so FlowPage can restore it
        sessionStorage.setItem('oauth-devtools:callback-discovery', JSON.stringify(savedState.discovery))
        setTimeout(() => navigate('/?from=callback'), 1500)
      } catch (err) {
        setStatus('error')
        setMessage(`Callback processing failed: ${err.message}`)
      }
    }

    process()
  }, [searchParams, navigate])

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4">
          {status === 'processing' ? '⏳' : status === 'success' ? '✅' : '❌'}
        </div>
        <h1 className="text-lg font-bold mb-2">
          {status === 'processing' ? 'Processing Callback...' :
           status === 'success' ? 'Authentication Successful' :
           'Authentication Failed'}
        </h1>
        <p className="text-xs text-muted leading-relaxed mb-4">{message}</p>

        {status === 'error' && (
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-xs font-semibold text-accent bg-accent/10
              border border-accent/30 rounded-md hover:bg-accent/20
              transition-colors cursor-pointer"
          >
            Back to Flow Page
          </button>
        )}

        {status === 'processing' && (
          <div className="flex justify-center gap-1 mt-4">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-accent animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
