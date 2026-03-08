/**
 * Default configuration values
 */

export const DEFAULT_REDIRECT_URI = `${window.location.origin}/callback`

export const FLOWS = [
  {
    id: 'authorization_code_pkce',
    name: 'Authorization Code + PKCE',
    shortName: 'PKCE',
    description: 'Best for SPAs, mobile apps, and any public client. Uses code_verifier/code_challenge for security.',
    recommended: true,
    steps: [
      { id: 'discover', label: 'Discover IDP Endpoints', description: 'Fetch .well-known/openid-configuration', action: 'manual' },
      { id: 'pkce', label: 'Authenticate with IDP', description: 'Generate PKCE, redirect to IDP login, handle callback, exchange code for tokens', action: 'manual' },
      { id: 'inspect', label: 'Inspect Tokens', description: 'Decode and verify the received JWTs', action: 'auto' },
    ],
  },
  {
    id: 'client_credentials',
    name: 'Client Credentials',
    shortName: 'M2M',
    description: 'Machine-to-machine. No user involved. Client authenticates with its own credentials.',
    recommended: false,
    steps: [
      { id: 'discover', label: 'Discover IDP Endpoints', description: 'Fetch .well-known/openid-configuration' },
      { id: 'token', label: 'Request Access Token', description: 'POST client_id + client_secret to /token endpoint' },
      { id: 'inspect', label: 'Inspect Token', description: 'Decode and verify the received JWT' },
    ],
  },
]

/**
 * Default config template for a new session.
 */
export function createDefaultConfig(providerId = 'custom') {
  return {
    providerId,
    fields: {},
    flow: 'authorization_code_pkce',
    scope: 'openid profile email',
    redirectUri: DEFAULT_REDIRECT_URI,
    extraParams: {},
  }
}

/**
 * Sensitive claim names that should be highlighted or masked.
 */
export const SENSITIVE_CLAIMS = ['email', 'phone_number', 'address', 'birthdate']

/**
 * Well-known JWT claim descriptions for the token inspector.
 */
export const CLAIM_DESCRIPTIONS = {
  iss: 'Issuer — who issued this token',
  sub: 'Subject — unique user identifier',
  aud: 'Audience — intended recipient(s)',
  exp: 'Expiration Time — token expires after this',
  nbf: 'Not Before — token not valid before this',
  iat: 'Issued At — when the token was created',
  jti: 'JWT ID — unique token identifier',
  scope: 'Scopes — permissions granted',
  scp: 'Scopes (Microsoft format)',
  azp: 'Authorized Party — client that requested the token',
  nonce: 'Nonce — replay attack prevention',
  at_hash: 'Access Token Hash — binds id_token to access_token',
  c_hash: 'Code Hash — binds id_token to authorization code',
  auth_time: 'Authentication Time — when user last authenticated',
  acr: 'Authentication Context Class Reference',
  amr: 'Authentication Methods References',
  name: 'Full Name',
  given_name: 'First Name',
  family_name: 'Last Name',
  email: 'Email Address',
  email_verified: 'Email Verified',
  picture: 'Profile Picture URL',
  locale: 'Locale',
  zoneinfo: 'Time Zone',
  roles: 'Roles (custom claim)',
  groups: 'Groups (custom claim)',
  permissions: 'Permissions (custom claim)',
  tid: 'Tenant ID (Microsoft)',
  oid: 'Object ID (Microsoft)',
  preferred_username: 'Preferred Username',
}
