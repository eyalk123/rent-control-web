// pages-settings.jsx — Settings + Delete account.

function SettingsPage({ ctx }) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [signOutOpen, setSignOutOpen] = React.useState(false);

  return (
    <>
      <PageHeader title="Settings" meta="Theme, language, account" />

      <div style={{ padding: "24px 40px 40px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 40, maxWidth: 1100 }}>
        {/* Side nav */}
        <nav style={{ position: "sticky", top: 0, alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { k: "account", label: "Account", icon: "user" },
            { k: "appearance", label: "Appearance", icon: "sun" },
            { k: "language", label: "Language", icon: "globe" },
            { k: "data", label: "Data & privacy", icon: "shield" },
            { k: "about", label: "About", icon: "alert" },
          ].map((s, i) => (
            <a key={s.k} href={`#${s.k}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, font: "500 13px " + RC_FONT, color: "var(--rc-fg1)", textDecoration: "none" }}>
              <Icon name={s.icon} size={15} color="var(--rc-fg2)" />
              {s.label}
            </a>
          ))}
        </nav>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Account */}
          <Section id="account" title="Account">
            <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, padding: "20px 22px", display: "flex", alignItems: "center", gap: 18 }}>
              <Avatar name="Eyal Kook" size={64} />
              <div style={{ flex: 1 }}>
                <div style={{ font: "700 17px " + RC_FONT, color: "var(--rc-fg1)" }}>Eyal Kook</div>
                <div style={{ font: "400 13px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 2 }}>eyalkook@gmail.com</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, font: "500 11.5px " + RC_FONT, color: "var(--rc-success)" }}>
                  <Icon name="google" size={12} /> Signed in with Google
                </div>
              </div>
              <Btn kind="outline" size="md" icon="pencil">Edit profile</Btn>
            </div>
          </Section>

          {/* Appearance */}
          <Section id="appearance" title="Appearance" subtitle="Light, dark, or follow your system.">
            <SettingRow
              label="Theme"
              hint="Changes immediately."
              control={
                <SegToggle
                  options={[
                    { key: "light",  label: "Light",  icon: "sun" },
                    { key: "dark",   label: "Dark",   icon: "moon" },
                    { key: "system", label: "System", icon: "monitor" },
                  ]}
                  value={ctx.theme === "dark" ? "dark" : "light"}
                  onChange={(v) => ctx.setTheme(v === "dark" ? "dark" : "light")}
                />
              }
            />
            <SettingRow
              label="Density"
              hint="Adjust padding and row heights across the app."
              control={
                <SegToggle
                  options={[
                    { key: "compact",     label: "Compact" },
                    { key: "comfortable", label: "Comfortable" },
                    { key: "cozy",        label: "Cozy" },
                  ]}
                  value={ctx.density}
                  onChange={ctx.setDensity}
                />
              }
            />
            <SettingRow
              label="Sidebar"
              hint="Wide shows labels and a profit pill. Pill is dense. Icon hides labels."
              control={
                <SegToggle
                  options={[
                    { key: "wide", label: "Wide" },
                    { key: "pill", label: "Pill" },
                    { key: "icon", label: "Icon" },
                  ]}
                  value={ctx.sidebar}
                  onChange={ctx.setSidebar}
                />
              }
              last
            />
          </Section>

          {/* Language */}
          <Section id="language" title="Language" subtitle="Switch app language. Hebrew triggers RTL layout — app restarts.">
            <SettingRow
              label="App language"
              control={
                <SegToggle
                  options={[
                    { key: "en", label: "English" },
                    { key: "he", label: "עברית" },
                  ]}
                  value="en"
                />
              }
              last
            />
          </Section>

          {/* Data */}
          <Section id="data" title="Data & privacy">
            <SettingRow
              label="Export all data"
              hint="Download a ZIP of properties, renters, transactions, and uploaded files."
              control={<Btn kind="outline" size="md" icon="download">Export</Btn>}
            />
            <SettingRow
              label="Backup to email"
              hint="Send a snapshot to your email weekly."
              control={
                <Toggle value={false} />
              }
            />
            <SettingRow
              label="Currency"
              control={
                <SegToggle
                  options={[
                    { key: "ils", label: "₪ ILS" },
                    { key: "usd", label: "$ USD" },
                    { key: "eur", label: "€ EUR" },
                  ]}
                  value="ils"
                />
              }
              last
            />
          </Section>

          {/* About */}
          <Section id="about" title="About">
            <SettingRow label="Version" control={<span style={{ font: "500 13px " + RC_FONT, color: "var(--rc-fg2)" }}>1.0.0</span>} />
            <SettingRow label="Terms of service" control={<Btn kind="ghost" size="sm" iconRight="arrowRight">View</Btn>} />
            <SettingRow label="Privacy policy" control={<Btn kind="ghost" size="sm" iconRight="arrowRight">View</Btn>} />
            <SettingRow label="Contact support" control={<Btn kind="ghost" size="sm" iconRight="arrowRight">Email us</Btn>} last />
          </Section>

          {/* Danger zone */}
          <Section title="Danger zone" tone="danger">
            <SettingRow
              label="Sign out"
              hint="You'll need to sign in again to access your data."
              control={<Btn kind="outline" size="md" icon="logout" onClick={() => setSignOutOpen(true)}>Sign out</Btn>}
            />
            <SettingRow
              label="Delete account"
              hint="Permanently remove your account and all data."
              control={<Btn kind="danger" size="md" icon="trash" onClick={() => setDeleteOpen(true)}>Delete account</Btn>}
              last
            />
          </Section>
        </div>
      </div>

      <Modal
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        title="Sign out?"
        footer={
          <>
            <Btn kind="outline" size="md" onClick={() => setSignOutOpen(false)}>Cancel</Btn>
            <Btn kind="primary" size="md" onClick={() => ctx.navigate("auth")}>Sign out</Btn>
          </>
        }
      >
        <p style={{ font: "400 13.5px " + RC_FONT, color: "var(--rc-fg2)", margin: 0, lineHeight: 1.55 }}>
          You'll be returned to the sign-in screen. Your data stays in the cloud — you can sign back in any time.
        </p>
      </Modal>

      {deleteOpen && <DeleteAccountModal ctx={ctx} onClose={() => setDeleteOpen(false)} />}
    </>
  );
}

function Section({ id, title, subtitle, tone, children }) {
  const titleColor = tone === "danger" ? "var(--rc-error)" : "var(--rc-fg1)";
  return (
    <section id={id} style={{ scrollMarginTop: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ font: "900 16px " + RC_FONT, color: titleColor, margin: 0, letterSpacing: -0.2 }}>{title}</h2>
        {subtitle && <div style={{ font: "400 13px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 3 }}>{subtitle}</div>}
      </div>
      <div style={{ background: "var(--rc-surface)", border: `1px solid ${tone === "danger" ? "var(--rc-error)" : "var(--rc-outline)"}`, borderRadius: 12, overflow: "hidden" }}>
        {children}
      </div>
    </section>
  );
}

function SettingRow({ label, hint, control, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 20px", borderBottom: last ? 0 : "1px solid var(--rc-outline)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: "600 13.5px " + RC_FONT, color: "var(--rc-fg1)" }}>{label}</div>
        {hint && <div style={{ font: "400 12px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 2, lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  const [v, setV] = React.useState(!!value);
  return (
    <button type="button" onClick={() => { setV(!v); onChange?.(!v); }} style={{ width: 40, height: 24, borderRadius: 999, border: 0, background: v ? "var(--rc-success)" : "var(--rc-outline)", position: "relative", cursor: "pointer" }}>
      <span style={{ position: "absolute", top: 3, left: v ? 19 : 3, width: 18, height: 18, borderRadius: 999, background: "#fff", transition: "left .15s" }} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete account flow
// ─────────────────────────────────────────────────────────────────────────────
function DeleteAccountModal({ ctx, onClose }) {
  const [step, setStep] = React.useState(1);
  const [confirm, setConfirm] = React.useState("");
  const canDelete = confirm === "DELETE";

  return (
    <Modal open onClose={onClose} title={null} width={500}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "8px 0 0" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--rc-expense-bg)", color: "var(--rc-error)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="alert" size={28} stroke={1.6} />
        </div>
        <h3 style={{ font: "700 20px " + RC_FONT, color: "var(--rc-fg1)", margin: "16px 0 6px", letterSpacing: -0.3 }}>Delete your account?</h3>
        <p style={{ font: "400 13.5px " + RC_FONT, color: "var(--rc-fg2)", margin: 0, lineHeight: 1.6, maxWidth: 380 }}>
          This permanently removes your account and everything in it. There is no undo.
        </p>
      </div>

      <div style={{ background: "var(--rc-bg)", borderRadius: 10, padding: "14px 16px", marginTop: 20, font: "400 12.5px " + RC_FONT, color: "var(--rc-fg2)", lineHeight: 1.7 }}>
        <div style={{ font: "600 12px " + RC_FONT, color: "var(--rc-fg1)", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 6 }}>What will be deleted</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="check" size={12} color="var(--rc-error)" /> {PROPERTIES.length} properties and all their documents</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="check" size={12} color="var(--rc-error)" /> {RENTERS.length} renters and lease history</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="check" size={12} color="var(--rc-error)" /> {TRANSACTIONS.length} transactions and receipts</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="check" size={12} color="var(--rc-error)" /> Your Firebase account and login</div>
      </div>

      <div style={{ marginTop: 18 }}>
        <Field label={<>Type <span style={{ fontFamily: "ui-monospace, Menlo, monospace", color: "var(--rc-error)" }}>DELETE</span> to confirm</>}>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" autoFocus />
        </Field>
      </div>

      <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn kind="outline" size="md" onClick={onClose}>Cancel</Btn>
        <Btn kind="danger" size="md" icon="trash" disabled={!canDelete} onClick={() => ctx.navigate("auth")}>Delete forever</Btn>
      </div>
    </Modal>
  );
}

Object.assign(window, { SettingsPage, DeleteAccountModal });
