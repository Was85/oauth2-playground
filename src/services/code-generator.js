/**
 * Code Generator
 * Generates OAuth configuration code for various platforms.
 */

/**
 * @param {object} params
 * @param {string} params.stack - 'dotnet' | 'node-express' | 'react'
 * @param {string} params.flow - 'authorization_code_pkce' | 'client_credentials'
 * @param {string} params.issuerUrl
 * @param {string} params.clientId
 * @param {string} params.scope
 * @param {string} params.redirectUri
 * @param {object} [params.discovery] - Discovery document summary
 * @returns {{ language: string, filename: string, code: string, description: string }}
 */
export function generateCode(params) {
  const generators = {
    'dotnet': generateDotNet,
    'node-express': generateNodeExpress,
    'react': generateReact,
  }

  const generator = generators[params.stack]
  if (!generator) return { language: 'text', filename: '', code: '// Unknown stack', description: '' }
  return generator(params)
}

function generateDotNet({ flow, issuerUrl, clientId, scope, redirectUri }) {
  if (flow === 'client_credentials') {
    return {
      language: 'csharp',
      filename: 'Program.cs',
      description: '.NET — Client Credentials flow with HttpClient',
      code: `// Program.cs — .NET Client Credentials OAuth
// Install: dotnet add package Microsoft.Extensions.Http

using System.Net.Http.Headers;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Register a named HttpClient for the token endpoint
builder.Services.AddHttpClient("OAuth", client =>
{
    client.BaseAddress = new Uri("${issuerUrl}");
});

var app = builder.Build();

app.MapGet("/api/data", async (IHttpClientFactory httpClientFactory) =>
{
    var client = httpClientFactory.CreateClient("OAuth");

    // Request token
    var tokenRequest = new FormUrlEncodedContent(new Dictionary<string, string>
    {
        ["grant_type"] = "client_credentials",
        ["client_id"] = "${clientId}",
        ["client_secret"] = "YOUR_CLIENT_SECRET",  // Use user-secrets in production!
        ["scope"] = "${scope}",
    });

    var tokenResponse = await client.PostAsync("/token", tokenRequest);
    tokenResponse.EnsureSuccessStatusCode();

    var tokenJson = await tokenResponse.Content.ReadFromJsonAsync<JsonElement>();
    var accessToken = tokenJson.GetProperty("access_token").GetString();

    // Use the token to call a protected API
    var apiClient = httpClientFactory.CreateClient();
    apiClient.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", accessToken);

    var apiResponse = await apiClient.GetAsync("https://api.example.com/data");
    var data = await apiResponse.Content.ReadAsStringAsync();

    return Results.Ok(new { data });
});

app.Run();`,
    }
  }

  return {
    language: 'csharp',
    filename: 'Program.cs',
    description: '.NET — OpenID Connect authentication with PKCE',
    code: `// Program.cs — .NET OIDC Authentication
// Install: dotnet add package Microsoft.AspNetCore.Authentication.OpenIdConnect

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = "Cookies";
    options.DefaultChallengeScheme = "OpenIdConnect";
})
.AddCookie("Cookies")
.AddOpenIdConnect("OpenIdConnect", options =>
{
    options.Authority = "${issuerUrl}";
    options.ClientId = "${clientId}";
    options.ResponseType = "code";
    options.UsePkce = true;
    options.SaveTokens = true;

    options.Scope.Clear();
${scope.split(' ').map(s => `    options.Scope.Add("${s}");`).join('\n')}

    options.CallbackPath = "/callback";

    // Map claims from the token
    options.GetClaimsFromUserInfoEndpoint = true;
    options.MapInboundClaims = false;
});

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => "Hello! Go to /login to authenticate.");

app.MapGet("/login", () => Results.Challenge(
    new AuthenticationProperties { RedirectUri = "/" },
    ["OpenIdConnect"]
)).AllowAnonymous();

app.MapGet("/me", (HttpContext ctx) =>
{
    var claims = ctx.User.Claims.Select(c => new { c.Type, c.Value });
    return Results.Ok(claims);
}).RequireAuthorization();

app.Run();`,
  }
}

function generateNodeExpress({ flow, issuerUrl, clientId, scope, redirectUri }) {
  if (flow === 'client_credentials') {
    return {
      language: 'javascript',
      filename: 'server.js',
      description: 'Node.js + Express — Client Credentials flow',
      code: `// server.js — Node.js Client Credentials OAuth
// Install: npm install express

import express from 'express';

const app = express();

const TOKEN_ENDPOINT = '${issuerUrl}/token'; // Adjust based on discovery
const CLIENT_ID = '${clientId}';
const CLIENT_SECRET = process.env.CLIENT_SECRET; // Use environment variable!
const SCOPE = '${scope}';

async function getAccessToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: SCOPE,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(\`Token request failed: \${response.status}\`);
  }

  return response.json();
}

app.get('/api/data', async (req, res) => {
  try {
    const { access_token } = await getAccessToken();

    // Use the token to call a protected API
    const apiResponse = await fetch('https://api.example.com/data', {
      headers: { Authorization: \`Bearer \${access_token}\` },
    });

    const data = await apiResponse.json();
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));`,
    }
  }

  return {
    language: 'javascript',
    filename: 'server.js',
    description: 'Node.js + Express — Authorization Code + PKCE',
    code: `// server.js — Node.js OIDC with PKCE
// Install: npm install express openid-client

import express from 'express';
import { Issuer, generators } from 'openid-client';

const app = express();

const ISSUER_URL = '${issuerUrl}';
const CLIENT_ID = '${clientId}';
const REDIRECT_URI = '${redirectUri}';
const SCOPE = '${scope}';

let client;

async function initClient() {
  const issuer = await Issuer.discover(ISSUER_URL);
  client = new issuer.Client({
    client_id: CLIENT_ID,
    redirect_uris: [REDIRECT_URI],
    response_types: ['code'],
    token_endpoint_auth_method: 'none', // Public client (PKCE)
  });
}

initClient().catch(console.error);

// Store PKCE values per session (use a proper session store in production)
const sessions = new Map();

app.get('/login', (req, res) => {
  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);
  const state = generators.state();

  sessions.set(state, { code_verifier });

  const authUrl = client.authorizationUrl({
    scope: SCOPE,
    state,
    code_challenge,
    code_challenge_method: 'S256',
  });

  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  const session = sessions.get(state);

  if (!session) {
    return res.status(400).json({ error: 'Invalid state' });
  }

  sessions.delete(state);

  try {
    const tokenSet = await client.callback(REDIRECT_URI, { code, state }, {
      code_verifier: session.code_verifier,
      state,
    });

    res.json({
      access_token: tokenSet.access_token,
      id_token: tokenSet.id_token,
      claims: tokenSet.claims(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));`,
  }
}

function generateReact({ flow, issuerUrl, clientId, scope, redirectUri }) {
  return {
    language: 'jsx',
    filename: 'AuthProvider.jsx',
    description: 'React SPA — PKCE flow with react-oidc-context',
    code: `// AuthProvider.jsx — React OIDC Authentication
// Install: npm install react-oidc-context oidc-client-ts

import { AuthProvider, useAuth } from 'react-oidc-context';

const oidcConfig = {
  authority: '${issuerUrl}',
  client_id: '${clientId}',
  redirect_uri: '${redirectUri}',
  scope: '${scope}',
  response_type: 'code',

  // PKCE is enabled by default in oidc-client-ts

  onSigninCallback: () => {
    // Remove the code and state from the URL after sign-in
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

// Wrap your app with AuthProvider
export default function App() {
  return (
    <AuthProvider {...oidcConfig}>
      <MainContent />
    </AuthProvider>
  );
}

function MainContent() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Auth error: {auth.error.message}</div>;
  }

  if (!auth.isAuthenticated) {
    return (
      <div>
        <p>Not authenticated</p>
        <button onClick={() => auth.signinRedirect()}>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div>
      <p>Welcome, {auth.user?.profile?.name || 'User'}!</p>
      <p>Email: {auth.user?.profile?.email}</p>

      {/* Access token for API calls */}
      <p>Token: {auth.user?.access_token?.substring(0, 20)}...</p>

      <button onClick={() => auth.removeUser()}>
        Sign Out
      </button>
    </div>
  );
}

// Using the access token for API calls:
//
// const auth = useAuth();
// const response = await fetch('/api/data', {
//   headers: {
//     Authorization: \`Bearer \${auth.user?.access_token}\`,
//   },
// });`,
  }
}

export const STACKS = [
  { id: 'dotnet', name: '.NET', icon: '🟣', language: 'csharp' },
  { id: 'node-express', name: 'Node.js + Express', icon: '🟢', language: 'javascript' },
  { id: 'react', name: 'React SPA', icon: '🔵', language: 'jsx' },
]
