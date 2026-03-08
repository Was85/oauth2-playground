/**
 * Token Service
 * JWT decoding, JWKS fetching, and signature verification
 */
import * as jose from 'jose'

/**
 * Decode a JWT without verification (for display purposes).
 * @param {string} token - The JWT string
 * @returns {{ header: object, payload: object, signature: string } | null}
 */
export function decodeToken(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const header = JSON.parse(
      new TextDecoder().decode(jose.base64url.decode(parts[0]))
    )
    const payload = JSON.parse(
      new TextDecoder().decode(jose.base64url.decode(parts[1]))
    )

    return { header, payload, signature: parts[2] }
  } catch {
    return null
  }
}

/**
 * Verify a JWT signature against a JWKS endpoint.
 * @param {string} token - The JWT string
 * @param {string} jwksUri - URL to the JWKS endpoint
 * @param {object} [options] - Verification options
 * @param {string} [options.issuer] - Expected issuer
 * @param {string} [options.audience] - Expected audience
 * @returns {Promise<{ valid: boolean, payload?: object, error?: string }>}
 */
export async function verifyToken(token, jwksUri, options = {}) {
  try {
    const jwks = jose.createRemoteJWKSet(new URL(jwksUri))

    const verifyOptions = {}
    if (options.issuer) verifyOptions.issuer = options.issuer
    if (options.audience) verifyOptions.audience = options.audience

    const { payload } = await jose.jwtVerify(token, jwks, verifyOptions)
    return { valid: true, payload }
  } catch (err) {
    return { valid: false, error: err.message }
  }
}

/**
 * Fetch and return the JWKS from a URI.
 * @param {string} jwksUri
 * @returns {Promise<object>}
 */
export async function fetchJWKS(jwksUri) {
  const response = await fetch(jwksUri)
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`)
  }
  return response.json()
}

/**
 * Analyze a token and return useful metadata.
 * @param {string} token
 * @returns {object}
 */
export function analyzeToken(token) {
  const decoded = decodeToken(token)
  if (!decoded) return { valid: false, error: 'Not a valid JWT' }

  const { header, payload } = decoded
  const now = Math.floor(Date.now() / 1000)

  return {
    algorithm: header.alg,
    keyId: header.kid || null,
    type: header.typ || 'JWT',
    issuer: payload.iss || null,
    subject: payload.sub || null,
    audience: payload.aud || null,
    issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
    expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
    notBefore: payload.nbf ? new Date(payload.nbf * 1000).toISOString() : null,
    isExpired: payload.exp ? payload.exp < now : false,
    expiresIn: payload.exp ? payload.exp - now : null,
    scopes: payload.scope ? payload.scope.split(' ') : payload.scp || [],
    claims: payload,
    header,
  }
}
