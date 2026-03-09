# OAuth DevTools

Browser-based developer tool for testing OAuth 2.0 / OpenID Connect flows against real identity providers.

## Features

- Test Authorization Code + PKCE flow (SPAs, mobile)
- Test Client Credentials flow (M2M)
- Built-in presets for: Microsoft Entra ID, Auth0, Google, Keycloak, Okta, Custom OIDC
- JWT Decoder with claim inspection and signature verification
- OAuth Compliance Checker (validates IDP config against OAuth 2.0/2.1 best practices)
- Code Export for .NET, Node.js, and React
- Config Manager: save, share, import/export provider configurations
- Dark theme, keyboard accessible

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run Playwright e2e tests |
| `npm run test:ui` | Run tests with Playwright UI |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Running with Keycloak (for integration tests)

```bash
docker run -d --name keycloak-test \
  -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
```

Then set up a realm "test", client "oauth-devtools" (public, SPA), and test user.

## Docker Deployment

```bash
docker build -t oauth-devtools .
docker run -p 80:80 oauth-devtools
```

## Project Structure

```
src/
  components/     # Reusable UI components
    ui/           # Primitives (Button, Card, Input, etc.)
  config/         # Provider presets, flow definitions, defaults
  hooks/          # Custom React hooks (useOAuthFlow, useTokenMonitor)
  pages/          # Route pages (Flow, Decoder, Compliance, Export, Callback)
  services/       # Business logic (OIDC discovery, crypto, compliance checker, code generator)
tests/            # Playwright e2e tests (12 spec files, 128 tests)
```

## Tech Stack

- React 18 + React Router 7
- Vite 6
- Tailwind CSS 4
- jose (JWT verification)
- Playwright (e2e testing)

## Supported Identity Providers

- **Microsoft Entra ID** -- Azure Active Directory / Microsoft Identity Platform. Supports Authorization Code + PKCE and Client Credentials flows.
- **Auth0** -- Auth0 by Okta, Universal Login. Supports Authorization Code + PKCE and Client Credentials flows.
- **Google** -- Google Identity Platform / Google OAuth 2.0. Supports Authorization Code + PKCE flow only (no Client Credentials for regular OAuth; use service accounts instead).
- **Keycloak** -- Open-source Identity and Access Management. Supports Authorization Code + PKCE and Client Credentials flows. Self-hosted.
- **Okta** -- Okta Identity Platform. Supports Authorization Code + PKCE and Client Credentials flows. Free developer account available.
- **Custom OIDC Provider** -- Any OpenID Connect-compliant provider. Must expose a `.well-known/openid-configuration` endpoint.

## Security

- All OAuth flows run entirely in the browser -- no backend server
- Tokens are stored in memory/sessionStorage only, never persisted
- PKCE with S256 code challenge for authorization code flow
- No secrets are stored or transmitted through the app

## License

TBD
