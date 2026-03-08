import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useOAuthFlow from '../hooks/useOAuthFlow'

export default function CallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('Processing OAuth callback...')
  const processedRef = useRef(false)

  const { handleCallback } = useOAuthFlow()

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const code = searchParams.get('code')
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

    // Process the callback
    async function process() {
      try {
        const result = await handleCallback(window.location.href)
        if (result) {
          setStatus('success')
          setMessage('Tokens received! Redirecting to flow page...')
          // Store tokens in sessionStorage for the flow page to pick up
          sessionStorage.setItem('oauth-devtools:callback-tokens', JSON.stringify(result))
          setTimeout(() => navigate('/?from=callback'), 1500)
        } else {
          setStatus('error')
          setMessage('Token exchange failed. Check the flow page for details.')
        }
      } catch (err) {
        setStatus('error')
        setMessage(`Callback processing failed: ${err.message}`)
      }
    }

    process()
  }, [])

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
