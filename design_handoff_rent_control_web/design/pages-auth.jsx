// pages-auth.jsx — sign-in / register screen. Standalone (no app chrome).

function AuthPage({ ctx }) {
  const [mode, setMode] = React.useState("signin"); // signin | register | forgot
  const [email, setEmail] = React.useState("eyalkook@gmail.com");
  const [password, setPassword] = React.useState("••••••••••");
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [resetSent, setResetSent] = React.useState(false);

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", background: "var(--rc-bg)", fontFamily: RC_FONT, color: "var(--rc-fg1)", overflow: "hidden" }}>
      {/* Left — brand panel */}
      <div style={{ flex: 1, minWidth: 0, background: "var(--rc-brand-navy)", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "40px 56px", position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="building2" size={18} color="var(--rc-brand-navy)" />
          </div>
          <span style={{ font: "700 16px " + RC_FONT, letterSpacing: -0.3 }}>Rent Control</span>
        </div>

        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ font: "500 13px " + RC_FONT, opacity: 0.65, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 18 }}>One ledger. Every property.</div>
          <h1 style={{ font: "700 56px " + RC_FONT, letterSpacing: -1.4, lineHeight: "1.05", margin: 0, maxWidth: 520 }}>
            Track rent, expenses & leases without spreadsheets.
          </h1>
          <p style={{ font: "400 16px " + RC_FONT, opacity: 0.78, marginTop: 22, maxWidth: 460, lineHeight: 1.6 }}>
            Built for small landlords. Multi-year leases with automatic escalation, supplier-linked expenses, and annual reports in one tap.
          </p>
        </div>

        {/* Decorative grid of property tiles */}
        <div style={{ position: "absolute", right: -120, top: -80, opacity: 0.18, transform: "rotate(-8deg)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 100px)", gap: 14 }}>
            {PROPERTIES.map(p => (
              <div key={p.id} style={{ width: 100, height: 130, borderRadius: 10, background: p.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
                  <path d="M3 11l9-8 9 8v10H3z" fill="rgba(255,255,255,0.6)" />
                </svg>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, font: "400 12.5px " + RC_FONT, opacity: 0.62 }}>
          <span>v1.0.0</span>
          <span>·</span>
          <span>iOS · Android · Web</span>
          <span>·</span>
          <span>EN · עברית</span>
        </div>
      </div>

      {/* Right — auth card */}
      <div style={{ width: 480, background: "var(--rc-surface)", display: "flex", alignItems: "center", justifyContent: "center", padding: 40, borderLeft: "1px solid var(--rc-outline)" }}>
        <div style={{ width: "100%", maxWidth: 340 }}>
          {mode !== "forgot" && (
            <>
              <h2 style={{ font: "700 24px " + RC_FONT, letterSpacing: -0.5, margin: 0, color: "var(--rc-fg1)" }}>
                {mode === "signin" ? "Sign in to your account" : "Create a new account"}
              </h2>
              <p style={{ font: "400 13px " + RC_FONT, color: "var(--rc-fg2)", margin: "6px 0 26px" }}>
                {mode === "signin" ? "Welcome back. Pick up where you left off." : "Free for personal use. Cancel anytime."}
              </p>

              <button onClick={() => ctx.navigate("home")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", height: 44, borderRadius: 10, border: "1px solid var(--rc-outline)", background: "var(--rc-surface)", color: "var(--rc-fg1)", cursor: "pointer", font: "600 13.5px " + RC_FONT, marginBottom: 18 }}>
                <Icon name="google" size={17} />
                Continue with Google
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10, font: "400 11px " + RC_FONT, color: "var(--rc-fg2)", margin: "8px 0 18px" }}>
                <span style={{ flex: 1, height: 1, background: "var(--rc-outline)" }} />
                <span>OR CONTINUE WITH EMAIL</span>
                <span style={{ flex: 1, height: 1, background: "var(--rc-outline)" }} />
              </div>

              {mode === "register" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <Field label="First name"><Input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Eyal" /></Field>
                  <Field label="Last name"><Input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Kook" /></Field>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
                <Field label="Password">
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </Field>
                {mode === "register" && (
                  <Field label="Confirm password"><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" /></Field>
                )}
              </div>

              {mode === "signin" && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button onClick={() => setMode("forgot")} style={{ background: "transparent", border: 0, color: "var(--rc-primary)", font: "500 12px " + RC_FONT, cursor: "pointer", padding: 0 }}>Forgot password?</button>
                </div>
              )}

              <Btn kind="primary" size="lg" onClick={() => ctx.navigate("home")} style={{ width: "100%", height: 44, marginTop: 18 }}>
                {mode === "signin" ? "Sign in" : "Create account"}
              </Btn>

              <div style={{ marginTop: 20, font: "400 12.5px " + RC_FONT, color: "var(--rc-fg2)", textAlign: "center" }}>
                {mode === "signin" ? "New here? " : "Already have an account? "}
                <button onClick={() => setMode(mode === "signin" ? "register" : "signin")} style={{ background: "transparent", border: 0, color: "var(--rc-primary)", font: "600 12.5px " + RC_FONT, cursor: "pointer" }}>
                  {mode === "signin" ? "Create account" : "Sign in"}
                </button>
              </div>
            </>
          )}

          {mode === "forgot" && (
            <>
              <h2 style={{ font: "700 24px " + RC_FONT, letterSpacing: -0.5, margin: 0, color: "var(--rc-fg1)" }}>Reset password</h2>
              <p style={{ font: "400 13px " + RC_FONT, color: "var(--rc-fg2)", margin: "6px 0 26px" }}>Enter your email — we'll send a reset link.</p>
              <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              {resetSent ? (
                <div style={{ marginTop: 18, padding: "12px 14px", borderRadius: 9, background: "var(--rc-revenue-bg)", color: "var(--rc-revenue-fg)", font: "500 13px " + RC_FONT, display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="check" size={15} /> Check your inbox — reset link sent.
                </div>
              ) : (
                <Btn kind="primary" size="lg" style={{ width: "100%", height: 44, marginTop: 18 }} onClick={() => setResetSent(true)}>Send reset link</Btn>
              )}
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <button onClick={() => { setMode("signin"); setResetSent(false); }} style={{ background: "transparent", border: 0, color: "var(--rc-primary)", font: "600 12.5px " + RC_FONT, cursor: "pointer" }}>Back to sign in</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AuthPage });
