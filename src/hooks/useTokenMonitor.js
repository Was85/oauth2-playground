import { useState, useEffect, useCallback } from 'react'

/**
 * Hook that monitors token expiry with a live countdown.
 * Updates every second when tokens are present.
 *
 * @param {object} tokens - Token object with access_token, id_token, etc.
 * @returns {object} - { expiryInfo, isAnyExpired, isAnyExpiringSoon }
 */
export default function useTokenMonitor(tokens) {
  const [tick, setTick] = useState(0)

  // Tick every second when we have tokens
  useEffect(() => {
    const hasTokens = tokens && Object.values(tokens).some(v => typeof v === 'string' && v.includes('.'))
    if (!hasTokens) return

    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [tokens])

  const expiryInfo = useCallback(() => {
    if (!tokens) return {}

    const info = {}
    const now = Math.floor(Date.now() / 1000)

    for (const [key, value] of Object.entries(tokens)) {
      if (typeof value !== 'string') continue
      const parts = value.split('.')
      if (parts.length !== 3) continue

      try {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        if (!payload.exp) {
          info[key] = { hasExpiry: false }
          continue
        }

        const expiresIn = payload.exp - now
        info[key] = {
          hasExpiry: true,
          exp: payload.exp,
          expiresAt: new Date(payload.exp * 1000).toISOString(),
          expiresIn,
          isExpired: expiresIn <= 0,
          isExpiringSoon: expiresIn > 0 && expiresIn < 300, // 5 min
          percentage: payload.iat
            ? Math.max(0, Math.min(100, ((now - payload.iat) / (payload.exp - payload.iat)) * 100))
            : null,
          formattedCountdown: formatCountdown(expiresIn),
          status: expiresIn <= 0 ? 'expired' : expiresIn < 300 ? 'warning' : 'valid',
        }
      } catch {
        continue
      }
    }

    return info
  }, [tokens, tick])

  const info = expiryInfo()
  const values = Object.values(info).filter(v => v.hasExpiry)

  return {
    expiryInfo: info,
    isAnyExpired: values.some(v => v.isExpired),
    isAnyExpiringSoon: values.some(v => v.isExpiringSoon),
    hasTokens: values.length > 0,
  }
}

function formatCountdown(seconds) {
  if (seconds <= 0) return 'EXPIRED'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
