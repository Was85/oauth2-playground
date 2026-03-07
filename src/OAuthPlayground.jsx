import { useState, useCallback } from "react";
// ── PKCE Helpers ──────────────────────────────────────────────────────────────
function base64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
async function generateCodeVerifier() {
  const arr = crypto.getRandomValues(new Uint8Array(32));
  return base64url(arr);
}
async function generateCodeChallenge(verifier) {
  const enc = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return base64url(hash);
}
function generateToken(len = 16) {
  return base64url(crypto.getRandomValues(new Uint8Array(len)));
}
// ── Mock JWT Builder ─────────────────────────────────────────────────────────
function buildJWT(payload) {
  const header = { alg: "RS256", typ: "JWT", kid: "mock-key-1" };
  const enc = (o) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const sig = base64url(crypto.getRandomValues(new Uint8Array(32)));
  return `${enc(header)}.${enc(payload)}.${sig}`;
}
function decodeJWT(token) {
  try {
    const [h, p] = token.split(".");
    const decode = (s) => JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/")));
    return { header: decode(h), payload: decode(p) };
  } catch { return null; }
}
// ── Mock IDP ─────────────────────────────────────────────────────────────────
const MOCK_USERS = [
  { sub: "user_001", name: "Alice Dev", email: "alice@example.com", roles: ["user", "admin"] },
  { sub: "user_002", name: "Bob Builder", email: "bob@example.com", roles: ["user"] },
];
const CODE_STORE = new Map();
function mockIDP_authorize({ client_id, redirect_uri, scope, state, code_challenge, code_challenge_method, user_idx = 0 }) {
  const code = generateToken(12);
  const user = MOCK_USERS[user_idx];
  CODE_STORE.set(code, { client_id, redirect_uri, scope, code_challenge, code_challenge_method, user, used: false });
  return { code, state };
}
async function mockIDP_token(params) {
  const { grant_type, code, code_verifier, client_id, client_secret, scope } = params;
  if (grant_type === "authorization_code") {
    const stored = CODE_STORE.get(code);
    if (!stored) return { error: "invalid_grant", error_description: "Authorization code not found or expired." };
    if (stored.used) return { error: "invalid_grant", error_description: "Authorization code already used." };
    if (stored.client_id !== client_id) return { error: "invalid_client", error_description: "client_id mismatch." };
    if (stored.code_challenge) {
      const challenge = await generateCodeChallenge(code_verifier || "");
      if (challenge !== stored.code_challenge) return { error: "invalid_grant", error_description: "PKCE code_verifier mismatch." };
    }
    stored.used = true;
    const now = Math.floor(Date.now() / 1000);
    const scopes = (stored.scope || "openid profile email").split(" ");
    const accessPayload = { iss: "https://mock-idp.oauth2.dev", sub: stored.user.sub, aud: client_id, exp: now + 3600, iat: now, scope: stored.scope };
    const idPayload = { iss: "https://mock-idp.oauth2.dev", sub: stored.user.sub, aud: client_id, exp: now + 3600, iat: now, name: stored.user.name, email: stored.user.email, roles: stored.user.roles };
    return {
      access_token: buildJWT(accessPayload),
      id_token: scopes.includes("openid") ? buildJWT(idPayload) : undefined,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: generateToken(20),
      scope: stored.scope,
    };
  }
  if (grant_type === "client_credentials") {
    if (!client_secret || client_secret.length < 4) return { error: "invalid_client", error_description: "Invalid client credentials." };
    const now = Math.floor(Date.now() / 1000);
    const payload = { iss: "https://mock-idp.oauth2.dev", sub: client_id, aud: "https://api.example.com", exp: now + 3600, iat: now, scope: scope || "read write", client_id };
    return { access_token: buildJWT(payload), token_type: "Bearer", expires_in: 3600, scope: scope || "read write" };
  }
  return { error: "unsupported_grant_type" };
}
// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0e1a",
  surface: "#111827",
  panel: "#161d2e",
  border: "#1e2d45",
  accent: "#00d4ff",
  accent2: "#7c3aed",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  text: "#e2e8f0",
  muted: "#64748b",
  code: "#94a3b8",
};
// ── Tiny styled helpers ───────────────────────────────────────────────────────
const Tag = ({ children, color = C.accent }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 4, padding: "1px 7px", fontSize: 11, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 }}>
    {children}
  </span>
);
const Pill = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .15s",
    background: active ? C.accent : "transparent",
    color: active ? C.bg : C.muted,
    border: `1px solid ${active ? C.accent : C.border}`,
    letterSpacing: .5,
  }}>{label}</button>
);
const Input = ({ label, value, onChange, mono, placeholder, hint, readOnly }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
      <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
      {hint && <span style={{ fontSize: 10, color: C.accent2 }}>{hint}</span>}
    </div>
    <input
      readOnly={readOnly}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", boxSizing: "border-box", padding: "7px 10px",
        background: readOnly ? C.bg : C.panel, border: `1px solid ${C.border}`,
        color: readOnly ? C.muted : C.text,
        borderRadius: 6, fontSize: 12, outline: "none",
        fontFamily: mono ? "monospace" : "inherit",
      }}
    />
  </div>
);
const Btn = ({ children, onClick, disabled, variant = "primary", small }) => {
  const bg = variant === "primary" ? C.accent : variant === "danger" ? C.red : C.border;
  const fg = variant === "ghost" ? C.text : C.bg;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? "5px 14px" : "8px 20px",
      background: disabled ? C.border : bg,
      color: disabled ? C.muted : fg,
      border: "none", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
      fontSize: small ? 11 : 13, fontWeight: 700, letterSpacing: .5, transition: "opacity .15s",
      opacity: disabled ? .5 : 1,
    }}>{children}</button>
  );
};
// ── Flow Step Indicator ───────────────────────────────────────────────────────
function FlowStep({ num, label, status, children }) {
  const colors = { idle: C.muted, active: C.amber, done: C.green, error: C.red };
  const color = colors[status] || C.muted;
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 12, opacity: status === "idle" ? .45 : 1, transition: "opacity .3s" }}>
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          background: color + "20", border: `2px solid ${color}`, fontSize: 11, fontWeight: 800, color, transition: "all .3s",
        }}>{status === "done" ? "\u2713" : num}</div>
        {num < 5 && <div style={{ width: 2, height: 24, background: color + "30", marginTop: 4, transition: "background .3s" }} />}
      </div>
      <div style={{ paddingTop: 4, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: children ? 6 : 0 }}>{label}</div>
        {children && <div style={{ fontSize: 11, lineHeight: 1.6 }}>{children}</div>}
      </div>
    </div>
  );
}
// ── HTTP Request/Response Card ────────────────────────────────────────────────
function HttpCard({ entry, index }) {
  const [open, setOpen] = useState(index === 0);
  const isErr = entry.response?.error;
  return (
    <div style={{ border: `1px solid ${isErr ? C.red + "44" : C.border}`, borderRadius: 8, marginBottom: 8, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
        background: C.panel, cursor: "pointer", userSelect: "none",
      }}>
        <Tag color={entry.type === "request" ? C.accent : isErr ? C.red : C.green}>
          {entry.method || (entry.type === "response" ? "RESP" : "\u2192")}
        </Tag>
        <span style={{ fontFamily: "monospace", fontSize: 12, color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.url || entry.label}</span>
        {entry.statusCode && <Tag color={entry.statusCode < 400 ? C.green : C.red}>{entry.statusCode}</Tag>}
        <span style={{ color: C.muted, fontSize: 12 }}>{open ? "\u25B2" : "\u25BC"}</span>
      </div>
      {open && (
        <div style={{ padding: 12, background: C.bg, borderTop: `1px solid ${C.border}` }}>
          {entry.description && <p style={{ color: C.muted, fontSize: 11, marginBottom: 8, lineHeight: 1.6 }}>{entry.description}</p>}
          <pre style={{ margin: 0, fontSize: 11, color: C.code, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {JSON.stringify(entry.body || entry.response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
// ── JWT Decoder Panel ─────────────────────────────────────────────────────────
function JWTDecoder({ tokens }) {
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState(null);
  const src = selected || input;
  const decoded = src ? decodeJWT(src) : null;
  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Paste a JWT or pick from flow</div>
      {tokens.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {tokens.map((t, i) => (
            <button key={i} onClick={() => { setSelected(t.value); setInput(""); }} style={{
              padding: "4px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer",
              background: selected === t.value ? C.accent + "22" : C.panel,
              border: `1px solid ${selected === t.value ? C.accent : C.border}`,
              color: selected === t.value ? C.accent : C.text,
            }}>{t.label}</button>
          ))}
        </div>
      )}
      <textarea
        value={selected ? selected : input}
        onChange={e => { setInput(e.target.value); setSelected(null); }}
        placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
        style={{
          width: "100%", boxSizing: "border-box", height: 80, padding: 10,
          background: C.panel, border: `1px solid ${C.border}`, color: C.code,
          borderRadius: 6, fontSize: 11, fontFamily: "monospace", resize: "none", outline: "none",
        }}
      />
      {decoded && (
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {["header", "payload"].map(k => (
            <div key={k} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{k}</div>
              <pre style={{ margin: 0, fontSize: 11, color: C.code, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(decoded[k], null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
      {!decoded && src && (
        <div style={{ marginTop: 8, color: C.red, fontSize: 11 }}>Could not decode — not a valid JWT</div>
      )}
    </div>
  );
}
// ── Main App ──────────────────────────────────────────────────────────────────
const FLOWS = ["Authorization Code + PKCE", "Client Credentials", "Implicit (Legacy)"];
const SCOPES_OPTS = ["openid", "profile", "email", "read", "write", "admin"];
export default function OAuthPlayground() {
  const [flow, setFlow] = useState(0);
  const [tab, setTab] = useState("flow");
  const [cfg, setCfg] = useState({
    client_id: "my-spa-client",
    client_secret: "super-secret-value",
    redirect_uri: "https://myapp.example.com/callback",
    scope: "openid profile email",
    issuer: "https://mock-idp.oauth2.dev",
    user_idx: 0,
  });
  const [state, setState] = useState({ step: 0, stepStatus: {} });
  const [log, setLog] = useState([]);
  const [tokens, setTokens] = useState({});
  const [pkce, setPkce] = useState(null);
  const [authCode, setAuthCode] = useState(null);
  const setCfgField = (k) => (v) => setCfg(c => ({ ...c, [k]: v }));
  const addLog = useCallback((entry) => setLog(l => [entry, ...l]), []);
  const updateStep = (s, status) => setState(st => ({ ...st, step: s, stepStatus: { ...st.stepStatus, [s]: status } }));
  function reset() {
    setState({ step: 0, stepStatus: {} });
    setLog([]);
    setTokens({});
    setPkce(null);
    setAuthCode(null);
  }
  // ── PKCE Flow ───────────────────────────────────────────────────────────────
  async function step1_PKCE_Generate() {
    const verifier = await generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const nonce = generateToken(8);
    const stateParam = generateToken(8);
    setPkce({ verifier, challenge, nonce, stateParam });
    const params = new URLSearchParams({
      response_type: "code",
      client_id: cfg.client_id,
      redirect_uri: cfg.redirect_uri,
      scope: cfg.scope,
      state: stateParam,
      nonce,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    const authUrl = `${cfg.issuer}/authorize?${params}`;
    addLog({
      type: "request", method: "GET", url: authUrl,
      label: "1 \u2192 Authorization Request (Browser Redirect)",
      description: "User's browser is redirected to the IDP's /authorize endpoint. PKCE code_challenge prevents code interception attacks.",
      body: Object.fromEntries(params),
    });
    updateStep(1, "done");
    updateStep(2, "active");
  }
  async function step2_PKCE_UserLogin() {
    if (!pkce) return;
    const result = mockIDP_authorize({
      client_id: cfg.client_id, redirect_uri: cfg.redirect_uri,
      scope: cfg.scope, state: pkce.stateParam,
      code_challenge: pkce.challenge, code_challenge_method: "S256",
      user_idx: cfg.user_idx,
    });
    setAuthCode(result.code);
    const callbackUrl = `${cfg.redirect_uri}?code=${result.code}&state=${result.state}`;
    addLog({
      type: "response", statusCode: 302,
      label: "2 \u2190 IDP Redirects Back (with auth code)",
      url: callbackUrl,
      description: "After user authenticates & consents, IDP redirects to redirect_uri with a short-lived authorization code.",
      body: { code: result.code, state: result.state, redirect_to: callbackUrl },
    });
    updateStep(2, "done");
    updateStep(3, "active");
  }
  async function step3_PKCE_Exchange() {
    if (!authCode || !pkce) return;
    const reqBody = {
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: cfg.redirect_uri,
      client_id: cfg.client_id,
      code_verifier: pkce.verifier,
    };
    addLog({
      type: "request", method: "POST", url: `${cfg.issuer}/token`,
      label: "3 \u2192 Token Request (Server \u2192 IDP)",
      description: "App backend POSTs the code + code_verifier to the token endpoint. code_verifier proves the original requester.",
      body: reqBody,
    });
    const result = await mockIDP_token({ ...reqBody });
    setTokens(result);
    addLog({
      type: "response", statusCode: result.error ? 400 : 200,
      label: result.error ? "3 \u2190 Token Error" : "3 \u2190 Token Response",
      description: result.error ? "IDP rejected the request." : "IDP returns access_token, id_token (if openid scope), and refresh_token.",
      response: result,
    });
    updateStep(3, result.error ? "error" : "done");
    if (!result.error) updateStep(4, "active");
  }
  async function step4_UseToken() {
    if (!tokens.access_token) return;
    addLog({
      type: "request", method: "GET", url: "https://api.example.com/me",
      label: "4 \u2192 API Call with Bearer Token",
      description: "Access token sent in Authorization header. Resource server validates it.",
      body: { "Authorization": `Bearer ${tokens.access_token.slice(0, 40)}...`, "Accept": "application/json" },
    });
    const dec = decodeJWT(tokens.access_token);
    addLog({
      type: "response", statusCode: 200,
      label: "4 \u2190 API Response (Protected Resource)",
      description: "Resource server validated the JWT and returned user data.",
      response: { sub: dec?.payload?.sub, name: MOCK_USERS[cfg.user_idx]?.name, email: MOCK_USERS[cfg.user_idx]?.email, scope: tokens.scope },
    });
    updateStep(4, "done");
    updateStep(5, "done");
  }
  // ── Client Credentials Flow ─────────────────────────────────────────────────
  async function cc_Step1() {
    const reqBody = {
      grant_type: "client_credentials",
      client_id: cfg.client_id,
      client_secret: cfg.client_secret,
      scope: cfg.scope.replace("openid", "").replace("profile", "").replace("email", "").trim() || "read write",
    };
    addLog({
      type: "request", method: "POST", url: `${cfg.issuer}/token`,
      label: "1 \u2192 Client Credentials Token Request",
      description: "Machine-to-machine: no user involved. Client authenticates with its own credentials.",
      body: reqBody,
    });
    updateStep(1, "active");
    const result = await mockIDP_token(reqBody);
    setTokens(result);
    addLog({
      type: "response", statusCode: result.error ? 401 : 200,
      label: result.error ? "1 \u2190 Error" : "1 \u2190 Access Token Issued",
      description: result.error ? "Auth failed." : "No id_token or refresh_token \u2014 this is a service-level token.",
      response: result,
    });
    updateStep(1, result.error ? "error" : "done");
    if (!result.error) updateStep(2, "active");
  }
  async function cc_Step2() {
    addLog({
      type: "request", method: "GET", url: "https://api.example.com/data",
      label: "2 \u2192 API Call (Machine-to-Machine)",
      description: "Service uses token to call downstream API.",
      body: { Authorization: `Bearer ${tokens.access_token?.slice(0, 40)}...` },
    });
    addLog({
      type: "response", statusCode: 200,
      label: "2 \u2190 API Response",
      description: "Resource server validated the client token.",
      response: { data: "protected resource data", client: cfg.client_id, scope: tokens.scope },
    });
    updateStep(2, "done");
    updateStep(3, "done");
  }
  // ── Implicit Flow ───────────────────────────────────────────────────────────
  async function impl_Step1() {
    const stateParam = generateToken(8);
    const params = new URLSearchParams({
      response_type: "token id_token",
      client_id: cfg.client_id,
      redirect_uri: cfg.redirect_uri,
      scope: cfg.scope,
      state: stateParam,
      nonce: generateToken(8),
    });
    addLog({
      type: "request", method: "GET", url: `${cfg.issuer}/authorize?${params}`,
      label: "1 \u2192 Authorization Request (response_type=token)",
      description: "LEGACY: Tokens returned directly in URL fragment. No code exchange. Vulnerable to token leakage.",
      body: Object.fromEntries(params),
    });
    updateStep(1, "active");
    const user = MOCK_USERS[cfg.user_idx];
    const now = Math.floor(Date.now() / 1000);
    const accessToken = buildJWT({ iss: cfg.issuer, sub: user.sub, aud: cfg.client_id, exp: now + 3600, iat: now, scope: cfg.scope });
    const idToken = buildJWT({ iss: cfg.issuer, sub: user.sub, aud: cfg.client_id, exp: now + 3600, iat: now, name: user.name, email: user.email, nonce: stateParam });
    setTokens({ access_token: accessToken, id_token: idToken, token_type: "Bearer" });
    const fragment = `#access_token=${accessToken.slice(0, 20)}...&token_type=Bearer&expires_in=3600`;
    addLog({
      type: "response", statusCode: 302,
      label: "1 \u2190 Token in URL Fragment (INSECURE)",
      url: `${cfg.redirect_uri}${fragment}`,
      description: "Tokens exposed in browser history, referrer headers, and server logs. Use PKCE instead!",
      response: { access_token: accessToken, id_token: idToken, token_type: "Bearer", expires_in: 3600 },
    });
    updateStep(1, "done");
    updateStep(2, "done");
  }
  // ── Render steps config per flow ────────────────────────────────────────────
  const flowSteps = [
    [
      { label: "Generate PKCE & Build Auth URL", action: step1_PKCE_Generate, needs: 0 },
      { label: "User Authenticates (Mock Login)", action: step2_PKCE_UserLogin, needs: 1 },
      { label: "Exchange Code for Tokens", action: step3_PKCE_Exchange, needs: 2 },
      { label: "Call Protected API", action: step4_UseToken, needs: 3 },
    ],
    [
      { label: "Request Access Token", action: cc_Step1, needs: 0 },
      { label: "Call Protected API", action: cc_Step2, needs: 1 },
    ],
    [
      { label: "Authorization Request (Implicit)", action: impl_Step1, needs: 0 },
    ],
  ][flow];
  const jwtTokens = [
    tokens.access_token && { label: "access_token", value: tokens.access_token },
    tokens.id_token && { label: "id_token", value: tokens.id_token },
  ].filter(Boolean);
  const completedSteps = Object.values(state.stepStatus).filter(s => s === "done" || s === "error").length;
  const hasError = Object.values(state.stepStatus).some(s => s === "error");
  const allDone = completedSteps >= flowSteps.length;
  return (
    <div style={{ fontFamily: "'IBM Plex Mono', 'Fira Code', 'Courier New', monospace", background: C.bg, color: C.text, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, background: C.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            <span role="img" aria-label="lightning">&#9889;</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1, color: C.text }}>OAuth 2.0 Playground</div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5 }}>INTERACTIVE LEARNING ENVIRONMENT</div>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {FLOWS.map((f, i) => (
            <Pill key={i} label={i === 2 ? "\u26A0 " + f : f} active={flow === i} onClick={() => { setFlow(i); reset(); }} />
          ))}
        </div>
      </div>
      {/* Main */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 320px", flex: 1, overflow: "hidden" }}>
        {/* LEFT: Config */}
        <div style={{ borderRight: `1px solid ${C.border}`, padding: 16, overflowY: "auto", background: C.surface }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>Client Configuration</div>
          <Input label="client_id" value={cfg.client_id} onChange={setCfgField("client_id")} mono />
          {(flow === 1) && <Input label="client_secret" value={cfg.client_secret} onChange={setCfgField("client_secret")} mono hint="M2M only" />}
          <Input label="redirect_uri" value={cfg.redirect_uri} onChange={setCfgField("redirect_uri")} mono />
          <Input label="scope" value={cfg.scope} onChange={setCfgField("scope")} placeholder="openid profile email" mono />
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Quick Scopes</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {SCOPES_OPTS.map(s => {
                const active = cfg.scope.includes(s);
                return (
                  <button key={s} onClick={() => {
                    const arr = cfg.scope.split(" ").filter(Boolean);
                    setCfgField("scope")(active ? arr.filter(x => x !== s).join(" ") : [...arr, s].join(" "));
                  }} style={{
                    padding: "3px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer",
                    background: active ? C.accent2 + "33" : C.panel,
                    border: `1px solid ${active ? C.accent2 : C.border}`,
                    color: active ? C.accent2 : C.muted,
                  }}>{s}</button>
                );
              })}
            </div>
          </div>
          <Input label="issuer (IDP URL)" value={cfg.issuer} onChange={setCfgField("issuer")} mono />
          {flow !== 1 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Test User</div>
              {MOCK_USERS.map((u, i) => (
                <div key={i} onClick={() => setCfgField("user_idx")(i)} style={{
                  padding: "7px 10px", borderRadius: 6, marginBottom: 5, cursor: "pointer",
                  background: cfg.user_idx === i ? C.accent + "15" : C.panel,
                  border: `1px solid ${cfg.user_idx === i ? C.accent : C.border}`,
                }}>
                  <div style={{ fontSize: 12, color: C.text }}>{u.name}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{u.email}</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                    {u.roles.map(r => <Tag key={r} color={r === "admin" ? C.amber : C.green}>{r}</Tag>)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {pkce && (
            <div style={{ marginTop: 12, padding: 10, background: C.panel, borderRadius: 6, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>PKCE Values</div>
              {[["code_verifier", pkce.verifier], ["code_challenge", pkce.challenge]].map(([k, v]) => (
                <div key={k} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: C.muted }}>{k}</div>
                  <div style={{ fontSize: 10, color: C.code, wordBreak: "break-all" }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* CENTER: Flow + Tabs */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Tab bar */}
          <div style={{ borderBottom: `1px solid ${C.border}`, display: "flex", padding: "0 16px", background: C.surface, gap: 4 }}>
            {[["flow", "Flow"], ["log", `Log ${log.length > 0 ? `(${log.length})` : ""}`], ["jwt", "JWT Decoder"], ["about", "Learn"]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: "10px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: "none", border: "none", letterSpacing: .5,
                color: tab === id ? C.accent : C.muted,
                borderBottom: tab === id ? `2px solid ${C.accent}` : "2px solid transparent",
              }}>{label}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {tab === "flow" && (
              <>
                {flow === 2 && (
                  <div style={{ marginBottom: 16, padding: 12, background: C.red + "15", border: `1px solid ${C.red}44`, borderRadius: 8 }}>
                    <div style={{ color: C.red, fontWeight: 700, fontSize: 13 }}>Deprecated Flow</div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 4, lineHeight: 1.6 }}>The Implicit flow is deprecated in OAuth 2.1. It returns tokens in URL fragments — visible in browser history and logs. Use Authorization Code + PKCE for SPAs instead.</div>
                  </div>
                )}
                {/* Flow diagram */}
                <div style={{ marginBottom: 20, padding: 16, background: C.panel, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>
                    {flow === 0 ? "Authorization Code + PKCE Flow" : flow === 1 ? "Client Credentials Flow" : "Implicit Flow (Legacy)"}
                  </div>
                  {flow === 0 && (
                    <div>
                      <FlowStep num={1} label="Generate PKCE & Redirect to IDP" status={state.stepStatus[1] || (state.step >= 1 ? "done" : "idle")}>
                        <span style={{ color: C.muted }}>Create <Tag color={C.amber}>code_verifier</Tag> {"\u2192"} hash to <Tag color={C.amber}>code_challenge</Tag> {"\u2192"} redirect browser to <Tag>/authorize</Tag></span>
                      </FlowStep>
                      <FlowStep num={2} label="User Authenticates & Consents" status={state.stepStatus[2] || "idle"}>
                        <span style={{ color: C.muted }}>IDP shows login screen {"\u2192"} user logs in {"\u2192"} IDP redirects back with <Tag color={C.green}>auth code</Tag></span>
                      </FlowStep>
                      <FlowStep num={3} label="Exchange Code for Tokens" status={state.stepStatus[3] || "idle"}>
                        <span style={{ color: C.muted }}>POST <Tag>/token</Tag> with code + <Tag color={C.amber}>code_verifier</Tag> {"\u2192"} receive <Tag color={C.green}>access_token</Tag> + <Tag color={C.green}>id_token</Tag></span>
                      </FlowStep>
                      <FlowStep num={4} label="Call Protected API" status={state.stepStatus[4] || "idle"}>
                        <span style={{ color: C.muted }}><Tag>Authorization: Bearer &lt;token&gt;</Tag> {"\u2192"} API validates JWT {"\u2192"} returns data</span>
                      </FlowStep>
                      <FlowStep num={5} label="Done" status={state.stepStatus[5] || "idle"} />
                    </div>
                  )}
                  {flow === 1 && (
                    <div>
                      <FlowStep num={1} label="POST /token with client credentials" status={state.stepStatus[1] || "idle"}>
                        <span style={{ color: C.muted }}>No user. Service authenticates with <Tag color={C.amber}>client_id</Tag> + <Tag color={C.amber}>client_secret</Tag> to get <Tag color={C.green}>access_token</Tag></span>
                      </FlowStep>
                      <FlowStep num={2} label="Call API with Bearer Token" status={state.stepStatus[2] || "idle"}>
                        <span style={{ color: C.muted }}>Token used to call downstream APIs. No id_token or refresh_token.</span>
                      </FlowStep>
                      <FlowStep num={3} label="Done" status={state.stepStatus[3] || "idle"} />
                    </div>
                  )}
                  {flow === 2 && (
                    <div>
                      <FlowStep num={1} label="Redirect to /authorize (response_type=token)" status={state.stepStatus[1] || "idle"}>
                        <span style={{ color: C.red }}>Tokens returned in URL fragment — no code exchange step!</span>
                      </FlowStep>
                      <FlowStep num={2} label="Done (with exposed tokens)" status={state.stepStatus[2] || "idle"} />
                    </div>
                  )}
                </div>
                {/* Step buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {flowSteps.map((s, i) => {
                    const canRun = completedSteps >= s.needs && !allDone;
                    const done = state.stepStatus[i + 1] === "done";
                    const err = state.stepStatus[i + 1] === "error";
                    const active = state.stepStatus[i + 1] === "active";
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: done ? C.green + "10" : err ? C.red + "10" : C.panel, border: `1px solid ${done ? C.green + "40" : err ? C.red + "40" : C.border}` }}>
                        <span style={{ fontSize: 18 }}>{done ? "\u2705" : err ? "\u274C" : active ? "\u23F3" : "\u2B1C"}</span>
                        <span style={{ flex: 1, fontSize: 13 }}>Step {i + 1}: {s.label}</span>
                        {!done && !err && <Btn onClick={() => { setTab("flow"); s.action(); }} disabled={!canRun} small>Run {"\u2192"}</Btn>}
                        {done && <Tag color={C.green}>DONE</Tag>}
                        {err && <Tag color={C.red}>ERROR</Tag>}
                      </div>
                    );
                  })}
                </div>
                {allDone && !hasError && (
                  <div style={{ marginTop: 16, padding: 14, background: C.green + "15", border: `1px solid ${C.green}44`, borderRadius: 8, textAlign: "center" }}>
                    <div style={{ color: C.green, fontWeight: 700, fontSize: 14, marginTop: 4 }}>Flow Complete!</div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Check the Log tab for the full HTTP exchange, or decode your tokens in JWT Decoder.</div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
                      <Btn onClick={() => setTab("log")} small variant="ghost">View Log</Btn>
                      <Btn onClick={() => setTab("jwt")} small variant="ghost">Decode JWT</Btn>
                      <Btn onClick={reset} small variant="danger">Reset</Btn>
                    </div>
                  </div>
                )}
                {hasError && (
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <Btn onClick={reset} variant="danger" small>Reset & Try Again</Btn>
                  </div>
                )}
              </>
            )}
            {tab === "log" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>HTTP Request / Response Log</div>
                  {log.length > 0 && <Btn onClick={() => setLog([])} small variant="danger">Clear</Btn>}
                </div>
                {log.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>
                    Run the flow steps to see HTTP requests and responses here.
                  </div>
                ) : (
                  log.map((entry, i) => <HttpCard key={i} entry={entry} index={i} />)
                )}
              </div>
            )}
            {tab === "jwt" && <JWTDecoder tokens={jwtTokens} />}
            {tab === "about" && (
              <div style={{ maxWidth: 640, lineHeight: 1.8 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.accent, marginBottom: 16 }}>OAuth 2.0 — Quick Reference</div>
                {[
                  ["Authorization Code + PKCE", C.green, "Best for: SPAs, mobile apps, any public client. PKCE adds a cryptographic proof that prevents code interception. The code_verifier is only sent at token exchange, so even if someone intercepts the auth code, they can't get tokens without the verifier."],
                  ["Client Credentials", C.accent, "Best for: M2M (machine-to-machine), microservices, background jobs. No user involved. Client authenticates with its own ID and secret. Returns only an access_token — no id_token, no refresh_token."],
                  ["Implicit (Legacy)", C.red, "DEPRECATED in OAuth 2.1. Tokens returned directly in URL fragments — visible in browser history, referrer headers, and server logs. Never use for new apps. Migrate to PKCE."],
                  ["Refresh Token", C.amber, "Used to get a new access_token without re-authenticating the user. Should be stored securely (httpOnly cookie or secure storage). Rotate on each use. Not issued in Client Credentials flow."],
                  ["JWT Access Token", C.accent2, "A self-contained token with header.payload.signature. Resource servers validate the signature using the IDP's public key (JWKS endpoint). Contains sub, iss, aud, exp, and custom claims."],
                ].map(([title, color, desc]) => (
                  <div key={title} style={{ marginBottom: 18, padding: 14, background: C.panel, borderRadius: 8, borderLeft: `3px solid ${color}` }}>
                    <div style={{ fontWeight: 700, color, fontSize: 13, marginBottom: 6 }}>{title}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{desc}</div>
                  </div>
                ))}
                <div style={{ marginTop: 20, padding: 14, background: C.panel, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 8 }}>Which flow should I use?</div>
                  <div style={{ fontSize: 12, color: C.muted }}>
                    <div style={{ marginBottom: 5 }}>SPA / Mobile: <Tag color={C.green}>Authorization Code + PKCE</Tag></div>
                    <div style={{ marginBottom: 5 }}>Service / API: <Tag color={C.accent}>Client Credentials</Tag></div>
                    <div style={{ marginBottom: 5 }}>Server-side web app: <Tag color={C.amber}>Authorization Code (with client secret)</Tag></div>
                    <div>Smart TV / CLI: <Tag color={C.accent2}>Device Authorization Grant</Tag></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* RIGHT: Token Inspector */}
        <div style={{ borderLeft: `1px solid ${C.border}`, padding: 16, overflowY: "auto", background: C.surface }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>Token Inspector</div>
          {Object.keys(tokens).length === 0 ? (
            <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: "30px 0", lineHeight: 1.8 }}>
              Run the flow to see<br />your tokens here.
            </div>
          ) : (
            Object.entries(tokens).map(([k, v]) => {
              if (!v) return null;
              const isJWT = typeof v === "string" && v.split(".").length === 3;
              const decoded = isJWT ? decodeJWT(v) : null;
              return (
                <div key={k} style={{ marginBottom: 14, padding: 10, background: C.panel, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <Tag color={k.includes("access") ? C.accent : k.includes("id") ? C.accent2 : k.includes("refresh") ? C.amber : C.green}>{k}</Tag>
                    {isJWT && <Tag color={C.muted}>JWT</Tag>}
                  </div>
                  {typeof v === "string" ? (
                    <div style={{ fontSize: 10, color: C.code, wordBreak: "break-all", lineHeight: 1.6 }}>{v.length > 80 ? v.slice(0, 80) + "\u2026" : v}</div>
                  ) : (
                    <div style={{ fontSize: 11, color: C.text }}>{String(v)}</div>
                  )}
                  {decoded?.payload && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                      {decoded.payload.exp && (
                        <div style={{ fontSize: 10, color: C.amber, marginBottom: 4 }}>
                          Expires: {new Date(decoded.payload.exp * 1000).toLocaleTimeString()}
                        </div>
                      )}
                      {decoded.payload.scope && <div style={{ fontSize: 10, color: C.muted }}>scope: {decoded.payload.scope}</div>}
                      {decoded.payload.name && <div style={{ fontSize: 10, color: C.muted }}>name: {decoded.payload.name}</div>}
                      {decoded.payload.email && <div style={{ fontSize: 10, color: C.muted }}>email: {decoded.payload.email}</div>}
                      {decoded.payload.sub && <div style={{ fontSize: 10, color: C.muted }}>sub: {decoded.payload.sub}</div>}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {Object.keys(tokens).length > 0 && authCode && (
            <div style={{ marginTop: 8, padding: 10, background: C.panel, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <Tag color={C.amber}>auth_code</Tag>
              <div style={{ fontSize: 10, color: C.code, marginTop: 4, wordBreak: "break-all" }}>{authCode}</div>
              {tokens.access_token && <div style={{ fontSize: 10, color: C.green, marginTop: 4 }}>Exchanged & consumed</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
