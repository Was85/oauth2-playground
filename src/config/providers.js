/**
 * OAuth Provider Presets
 * Pre-configured settings for popular identity providers
 */

export const providers = {
  'entra-id': {
    id: 'entra-id',
    name: 'Microsoft Entra ID',
    logo: '🔷',
    description: 'Azure Active Directory / Microsoft Identity Platform',
    issuerTemplate: 'https://login.microsoftonline.com/{tenantId}/v2.0',
    defaultScopes: 'openid profile email',
    supportedFlows: ['authorization_code_pkce', 'client_credentials'],
    fields: [
      { key: 'tenantId', label: 'Tenant ID', placeholder: 'e.g. your-tenant-id or "common"', required: true },
      { key: 'clientId', label: 'Application (Client) ID', placeholder: 'From App Registration', required: true },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'Only for Client Credentials flow', required: false, sensitive: true },
    ],
    buildIssuerUrl: (fields) => `https://login.microsoftonline.com/${fields.tenantId || ''}/v2.0`,
    setupGuide: {
      title: 'Set up Entra ID App Registration',
      steps: [
        'Go to Azure Portal → Entra ID → App registrations → New registration',
        'Set a name (e.g. "OAuth DevTools")',
        'Under Redirect URIs, add: {redirectUri} (type: SPA)',
        'Copy the Application (Client) ID from the Overview page',
        'Copy the Directory (Tenant) ID from the Overview page',
        'For Client Credentials: Go to Certificates & secrets → New client secret',
      ],
      docUrl: 'https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app',
    },
    notes: 'Use "common" as tenant for multi-tenant apps, or your specific tenant ID for single-tenant.',
  },

  'auth0': {
    id: 'auth0',
    name: 'Auth0',
    logo: '🔐',
    description: 'Auth0 by Okta — Universal Login',
    issuerTemplate: 'https://{domain}/',
    defaultScopes: 'openid profile email',
    supportedFlows: ['authorization_code_pkce', 'client_credentials'],
    fields: [
      { key: 'domain', label: 'Auth0 Domain', placeholder: 'e.g. your-tenant.auth0.com', required: true },
      { key: 'clientId', label: 'Client ID', placeholder: 'From Auth0 Dashboard', required: true },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'Only for Client Credentials flow', required: false, sensitive: true },
      { key: 'audience', label: 'API Audience', placeholder: 'e.g. https://api.example.com', required: false },
    ],
    buildIssuerUrl: (fields) => `https://${fields.domain || ''}/`,
    setupGuide: {
      title: 'Set up Auth0 Application',
      steps: [
        'Go to Auth0 Dashboard → Applications → Create Application',
        'Choose "Single Page Application" type',
        'In Settings, add Allowed Callback URLs: {redirectUri}',
        'Add Allowed Logout URLs and Allowed Web Origins: {origin}',
        'Copy the Domain and Client ID from Settings',
        'For Client Credentials: create a Machine-to-Machine app instead',
      ],
      docUrl: 'https://auth0.com/docs/get-started/auth0-overview/create-applications',
    },
    notes: 'Free tier: 25,000 MAU. For Client Credentials, you also need to create an API in Auth0.',
  },

  'google': {
    id: 'google',
    name: 'Google',
    logo: '🌐',
    description: 'Google Identity Platform / Google OAuth 2.0',
    issuerTemplate: 'https://accounts.google.com',
    defaultScopes: 'openid profile email',
    supportedFlows: ['authorization_code_pkce'],
    fields: [
      { key: 'clientId', label: 'Client ID', placeholder: 'From Google Cloud Console', required: true },
    ],
    buildIssuerUrl: () => 'https://accounts.google.com',
    setupGuide: {
      title: 'Set up Google OAuth Consent Screen',
      steps: [
        'Go to Google Cloud Console → APIs & Services → OAuth consent screen',
        'Configure the consent screen (External for testing)',
        'Go to Credentials → Create Credentials → OAuth client ID',
        'Choose "Web application"',
        'Add Authorized redirect URIs: {redirectUri}',
        'Add Authorized JavaScript origins: {origin}',
        'Copy the Client ID',
      ],
      docUrl: 'https://developers.google.com/identity/protocols/oauth2/web-server',
    },
    notes: 'Google does not support Client Credentials for regular OAuth. Use service accounts instead.',
  },

  'keycloak': {
    id: 'keycloak',
    name: 'Keycloak',
    logo: '🔑',
    description: 'Open-source Identity and Access Management',
    issuerTemplate: '{baseUrl}/realms/{realm}',
    defaultScopes: 'openid profile email',
    supportedFlows: ['authorization_code_pkce', 'client_credentials'],
    fields: [
      { key: 'baseUrl', label: 'Keycloak Base URL', placeholder: 'e.g. http://localhost:8080', required: true },
      { key: 'realm', label: 'Realm', placeholder: 'e.g. master', required: true },
      { key: 'clientId', label: 'Client ID', placeholder: 'From Keycloak admin console', required: true },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'Only for Client Credentials flow', required: false, sensitive: true },
    ],
    buildIssuerUrl: (fields) => `${(fields.baseUrl || '').replace(/\/+$/, '')}/realms/${fields.realm || ''}`,
    setupGuide: {
      title: 'Set up Keycloak Client',
      steps: [
        'Access Keycloak Admin Console (usually at /admin)',
        'Select your realm (or create a new one)',
        'Go to Clients → Create client',
        'Set Client ID and choose OpenID Connect protocol',
        'For SPA: set Client Authentication to OFF, enable Standard flow',
        'Add Valid Redirect URIs: {redirectUri}',
        'Add Web Origins: {origin} (or * for testing)',
        'For Client Credentials: set Client Authentication to ON, enable Service accounts roles',
      ],
      docUrl: 'https://www.keycloak.org/docs/latest/server_admin/',
    },
    notes: 'Self-hosted. Run locally with: docker run -p 8080:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak start-dev',
  },

  'okta': {
    id: 'okta',
    name: 'Okta',
    logo: '🛡️',
    description: 'Okta Identity Platform',
    issuerTemplate: 'https://{domain}/oauth2/default',
    defaultScopes: 'openid profile email',
    supportedFlows: ['authorization_code_pkce', 'client_credentials'],
    fields: [
      { key: 'domain', label: 'Okta Domain', placeholder: 'e.g. dev-123456.okta.com', required: true },
      { key: 'clientId', label: 'Client ID', placeholder: 'From Okta Dashboard', required: true },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'Only for Client Credentials flow', required: false, sensitive: true },
      { key: 'authServerId', label: 'Authorization Server ID', placeholder: 'default', required: false },
    ],
    buildIssuerUrl: (fields) => `https://${fields.domain || ''}/oauth2/${fields.authServerId || 'default'}`,
    setupGuide: {
      title: 'Set up Okta Application',
      steps: [
        'Go to Okta Admin Console → Applications → Create App Integration',
        'Choose OIDC - OpenID Connect, then Single-Page Application',
        'Set Sign-in redirect URIs: {redirectUri}',
        'Set Sign-out redirect URIs: {origin}',
        'Under Assignments, set Controlled access',
        'Copy the Client ID from General tab',
        'Your Okta domain is shown in the top-right of the admin console',
      ],
      docUrl: 'https://developer.okta.com/docs/guides/sign-into-spa-redirect/react/main/',
    },
    notes: 'Free developer account available at developer.okta.com',
  },

  'custom': {
    id: 'custom',
    name: 'Custom OIDC Provider',
    logo: '⚙️',
    description: 'Any OpenID Connect-compliant provider',
    issuerTemplate: '',
    defaultScopes: 'openid profile email',
    supportedFlows: ['authorization_code_pkce', 'client_credentials'],
    fields: [
      { key: 'issuerUrl', label: 'Issuer URL', placeholder: 'e.g. https://idp.example.com', required: true },
      { key: 'clientId', label: 'Client ID', placeholder: 'Your client identifier', required: true },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'Only for confidential clients', required: false, sensitive: true },
    ],
    buildIssuerUrl: (fields) => (fields.issuerUrl || '').replace(/\/+$/, ''),
    setupGuide: {
      title: 'Set up Custom OIDC Provider',
      steps: [
        'Ensure your provider supports OpenID Connect Discovery',
        'The discovery endpoint should be at: {issuerUrl}/.well-known/openid-configuration',
        'Register a client/application in your provider',
        'Set the redirect URI to: {redirectUri}',
        'Copy your Client ID (and secret if using confidential client)',
      ],
      docUrl: null,
    },
    notes: 'Your provider must expose a .well-known/openid-configuration endpoint.',
  },
}

/**
 * Get a flat list of providers for display.
 */
export function getProviderList() {
  return Object.values(providers).map(p => ({
    id: p.id,
    name: p.name,
    logo: p.logo,
    description: p.description,
  }))
}

/**
 * Get provider by ID.
 */
export function getProvider(id) {
  return providers[id] || null
}

/**
 * Get available providers that support a specific flow.
 */
export function getProvidersForFlow(flow) {
  return Object.values(providers).filter(p => p.supportedFlows.includes(flow))
}
