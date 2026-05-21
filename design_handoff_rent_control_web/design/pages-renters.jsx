// pages-renters.jsx — list, detail (3 tabs with lease info), add/edit form.

function RentersPage({ ctx }) {
  const [q, setQ] = React.useState("");
  const [view, setView] = React.useState("card");
  const [statusFilter, setStatusFilter] = React.useState(null);

  const filtered = RENTERS.filter(r => {
    if (q) {
      const ql = q.toLowerCase();
      if (!r.name.toLowerCase().includes(ql) && !r.phone.includes(q) && !r.email.toLowerCase().includes(ql)) return false;
    }
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  const counts = {
    all: RENTERS.length,
    active: RENTERS.filter(r => r.status === "active").length,
    expiring: RENTERS.filter(r => r.status === "expiring").length,
    overdue: RENTERS.filter(r => r.status === "overdue").length,
  };

  return (
    <>
      <PageHeader
        title="Renters"
        meta={`${RENTERS.length} renters · ${counts.expiring} expiring soon · ${counts.overdue} overdue`}
        actions={
          <>
            <Btn kind="outline" size="md" icon="contacts">Import contacts</Btn>
            <Btn kind="primary" size="md" icon="plus" onClick={() => ctx.openDrawer("renter")}>Add renter</Btn>
          </>
        }
      />

      {/* Status tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 40px 0", borderBottom: "1px solid var(--rc-outline)" }}>
        {[
          { k: null,       label: "All",      n: counts.all,       tone: "neutral" },
          { k: "active",   label: "Active",   n: counts.active,    tone: "success" },
          { k: "expiring", label: "Expiring", n: counts.expiring,  tone: "warning" },
          { k: "overdue",  label: "Overdue",  n: counts.overdue,   tone: "danger" },
        ].map(t => (
          <button key={t.k || "all"} onClick={() => setStatusFilter(t.k)} style={{ padding: "10px 4px", background: "transparent", border: 0, borderBottom: statusFilter === t.k ? "2px solid var(--rc-brand-navy)" : "2px solid transparent", color: statusFilter === t.k ? "var(--rc-brand-navy)" : "var(--rc-fg2)", font: (statusFilter === t.k ? "700 " : "500 ") + "13px " + RC_FONT, cursor: "pointer", marginBottom: -1, display: "inline-flex", alignItems: "center", gap: 7 }}>
            {t.label}
            <span style={{ font: "600 11px " + RC_FONT, color: statusFilter === t.k ? "var(--rc-brand-navy)" : "var(--rc-fg2)", background: statusFilter === t.k ? "var(--rc-primary-container)" : "var(--rc-bg)", padding: "1px 7px", borderRadius: 999 }}>{t.n}</span>
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, paddingBottom: 8 }}>
          <SearchInput placeholder="Search renters…" value={q} onChange={setQ} width={260} hint={null} />
          <SegToggle options={[{ key: "card", label: "Cards", icon: "grid" }, { key: "table", label: "Table", icon: "list" }]} value={view} onChange={setView} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty icon="users" title="No renters match" />
      ) : view === "card" ? (
        <div style={{ padding: "20px 40px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14 }}>
          {filtered.map(r => <RenterCard key={r.id} r={r} ctx={ctx} />)}
        </div>
      ) : (
        <RenterTable rows={filtered} ctx={ctx} />
      )}
    </>
  );
}

function RenterCard({ r, ctx }) {
  const p = propertyById(r.propertyId);
  const d = daysUntil(r.leaseEnd);
  const expRingPct = Math.max(0, Math.min(100, ((24 - Math.min(24, d / 30)) / 24) * 100));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => ctx.navigate("renterDetail", { id: r.id })}
      onKeyDown={(e) => { if (e.key === "Enter") ctx.navigate("renterDetail", { id: r.id }); }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--rc-fg2)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rc-outline)"; e.currentTarget.style.transform = "none"; }}
      style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 14, padding: "16px 18px", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 12, transition: "border-color .15s, transform .15s" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative" }}>
          <Avatar name={r.name} size={48} color={r.avatarColor} />
          <span style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: 999, background: r.status === "overdue" ? "var(--rc-error)" : r.status === "expiring" ? "var(--rc-warning)" : "var(--rc-success)", border: "2px solid var(--rc-surface)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "700 15px " + RC_FONT, color: "var(--rc-fg1)" }}>{r.name}</div>
          <div style={{ font: "400 12px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 2 }}>{p?.addr}</div>
        </div>
        <Pill tone={r.status === "overdue" ? "danger" : r.status === "expiring" ? "warning" : "success"}>
          {r.status === "active" ? "Active" : r.status === "overdue" ? "Overdue" : "Expiring"}
        </Pill>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", paddingTop: 12, borderTop: "1px solid var(--rc-outline)" }}>
        <div>
          <div style={{ font: "500 10px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.4, textTransform: "uppercase" }}>Rent</div>
          <div style={{ font: "700 15px " + RC_FONT, color: "var(--rc-fg1)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{fmtIls(r.rent)}</div>
        </div>
        <div>
          <div style={{ font: "500 10px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.4, textTransform: "uppercase" }}>Lease ends</div>
          <div style={{ font: "700 13.5px " + RC_FONT, color: "var(--rc-fg1)", marginTop: 3 }}>{fmtDateShort(r.leaseEnd)}</div>
        </div>
        <div>
          <div style={{ font: "500 10px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.4, textTransform: "uppercase" }}>Pay day</div>
          <div style={{ font: "700 13.5px " + RC_FONT, color: "var(--rc-fg1)", marginTop: 3 }}>Day {r.payDay}</div>
        </div>
      </div>

      {r.balance < 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "var(--rc-expense-bg)", color: "var(--rc-expense-fg)", borderRadius: 8, font: "500 12px " + RC_FONT }}>
          <Icon name="alert" size={13} /> Balance owed: {fmtIls(Math.abs(r.balance))}
        </div>
      )}

      {/* contact strip */}
      <div style={{ display: "flex", gap: 8, marginTop: -4 }}>
        <button onClick={(e) => e.stopPropagation()} title={r.phone} style={{ flex: 1, height: 32, borderRadius: 8, border: "1px solid var(--rc-outline)", background: "var(--rc-surface)", color: "var(--rc-fg1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, font: "500 12px " + RC_FONT }}>
          <Icon name="phone" size={13} /> Call
        </button>
        <button onClick={(e) => e.stopPropagation()} style={{ flex: 1, height: 32, borderRadius: 8, border: "1px solid var(--rc-outline)", background: "var(--rc-surface)", color: "var(--rc-fg1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, font: "500 12px " + RC_FONT }}>
          <Icon name="sms" size={13} /> SMS
        </button>
        <button onClick={(e) => e.stopPropagation()} style={{ flex: 1, height: 32, borderRadius: 8, border: "1px solid var(--rc-outline)", background: "var(--rc-surface)", color: "var(--rc-fg1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, font: "500 12px " + RC_FONT }}>
          <Icon name="mail" size={13} /> Email
        </button>
      </div>
    </div>
  );
}

function RenterTable({ rows, ctx }) {
  return (
    <div style={{ padding: "20px 40px 40px" }}>
      <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", padding: "10px 16px", background: "var(--rc-bg)", borderBottom: "1px solid var(--rc-outline)", font: "600 11px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.5, textTransform: "uppercase" }}>
          <div style={{ flex: 2 }}>Renter</div>
          <div style={{ flex: 1.5 }}>Property</div>
          <div style={{ width: 130 }}>Phone</div>
          <div style={{ width: 110, textAlign: "right" }}>Rent</div>
          <div style={{ width: 130 }}>Lease ends</div>
          <div style={{ width: 110 }}>Status</div>
          <div style={{ width: 36 }} />
        </div>
        {rows.map((r, i) => {
          const p = propertyById(r.propertyId);
          return (
            <button
              key={r.id}
              onClick={() => ctx.navigate("renterDetail", { id: r.id })}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--rc-bg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--rc-surface)"; }}
              style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: i === rows.length - 1 ? 0 : "1px solid var(--rc-outline)", background: "var(--rc-surface)", border: 0, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomStyle: "solid", borderBottomColor: "var(--rc-outline)", cursor: "pointer", textAlign: "left", width: "100%", font: "400 13px " + RC_FONT, color: "var(--rc-fg1)" }}
            >
              <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={r.name} size={32} color={r.avatarColor} />
                <div>
                  <div style={{ font: "600 13.5px " + RC_FONT, color: "var(--rc-fg1)" }}>{r.name}</div>
                  <div style={{ font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)" }}>{r.email}</div>
                </div>
              </div>
              <div style={{ flex: 1.5 }}>{p?.addr}</div>
              <div style={{ width: 130, color: "var(--rc-fg2)", fontVariantNumeric: "tabular-nums" }}>{r.phone}</div>
              <div style={{ width: 110, textAlign: "right", font: "600 13px " + RC_FONT, fontVariantNumeric: "tabular-nums" }}>{fmtIls(r.rent)}</div>
              <div style={{ width: 130, color: "var(--rc-fg2)" }}>{fmtDateShort(r.leaseEnd)}</div>
              <div style={{ width: 110 }}>
                <Pill tone={r.status === "overdue" ? "danger" : r.status === "expiring" ? "warning" : "success"}>
                  {r.status === "active" ? "Active" : r.status === "overdue" ? "Overdue" : "Expiring"}
                </Pill>
              </div>
              <div style={{ width: 36, display: "flex", justifyContent: "flex-end" }}>
                <Icon name="chevron" size={15} color="var(--rc-placeholder)" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Renter detail
// ─────────────────────────────────────────────────────────────────────────────
function RenterDetailPage({ ctx }) {
  const id = ctx.route.params?.id;
  const r = renterById(id);
  const [tab, setTab] = React.useState("info");
  if (!r) return <Empty title="Renter not found" />;

  const p = propertyById(r.propertyId);
  const txs = txOfRenter(r.id);
  const totalPaid = txs.filter(t => t.type === "revenue").reduce((s, t) => s + t.amount, 0);

  return (
    <>
      {/* Hero */}
      <div style={{ background: r.avatarColor + "33", borderBottom: "1px solid var(--rc-outline)", padding: "24px 40px 0" }}>
        <button onClick={() => ctx.navigate("renters")} style={{ display: "inline-flex", alignItems: "center", gap: 5, font: "500 12px " + RC_FONT, color: "var(--rc-fg2)", background: "transparent", border: 0, cursor: "pointer", padding: 0, marginBottom: 14 }}>
          <Icon name="chevronLeft" size={14} /> All renters
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <Avatar name={r.name} size={84} color={r.avatarColor} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <Pill tone={r.status === "overdue" ? "danger" : r.status === "expiring" ? "warning" : "success"} size="lg">
                  {r.status === "active" ? "Active" : r.status === "overdue" ? "Overdue" : "Expiring"}
                </Pill>
                <Pill tone="neutral" size="lg" icon="calendar">Since {fmtDate(r.leaseStart)}</Pill>
              </div>
              <h1 style={{ font: "700 32px " + RC_FONT, letterSpacing: -0.7, margin: 0, color: "var(--rc-fg1)" }}>{r.name}</h1>
              <div style={{ font: "400 14px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 4, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="building2" size={13} /> {p?.addr}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="phone" size={13} /> {r.phone}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="mail" size={13} /> {r.email}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="outline" size="md" icon="phone">Call</Btn>
            <Btn kind="outline" size="md" icon="sms">SMS</Btn>
            <Btn kind="outline" size="md" icon="pencil" onClick={() => ctx.openDrawer("renter", { id: r.id })}>Edit</Btn>
            <Btn kind="primary" size="md" icon="plus" onClick={() => ctx.openDrawer("transaction", { type: "revenue", renterId: r.id })}>Record payment</Btn>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, marginTop: 28, paddingTop: 18, paddingBottom: 18, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <HeroStatRenter label="Monthly rent" value={fmtIls(r.rent)} />
          <HeroStatRenter label="Lease ends in" value={`${daysUntil(r.leaseEnd)} days`} sub={fmtDate(r.leaseEnd)} tone={daysUntil(r.leaseEnd) < 90 ? "warning" : null} />
          <HeroStatRenter label="Total paid" value={fmtIls(totalPaid)} sub={`${txs.filter(t => t.type === "revenue").length} payments`} tone="success" />
          <HeroStatRenter label="Balance" value={r.balance === 0 ? "Settled" : fmtSigned(r.balance)} tone={r.balance < 0 ? "danger" : "success"} />
        </div>

        <div style={{ display: "flex", gap: 0 }}>
          {[{ k: "info", l: "Lease info" }, { k: "property", l: "Property" }, { k: "transactions", l: `Transactions (${txs.length})` }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: "12px 18px", background: "transparent", border: 0, borderBottom: tab === t.k ? "2px solid var(--rc-brand-navy)" : "2px solid transparent", color: tab === t.k ? "var(--rc-brand-navy)" : "var(--rc-fg2)", font: (tab === t.k ? "700 " : "500 ") + "13px " + RC_FONT, cursor: "pointer", marginBottom: -1 }}>{t.l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "28px 40px 40px" }}>
        {tab === "info" && <RenterInfo r={r} />}
        {tab === "property" && p && <RenterPropertyView p={p} ctx={ctx} />}
        {tab === "transactions" && <RenterTxList txs={txs} ctx={ctx} />}
      </div>
    </>
  );
}

function HeroStatRenter({ label, value, sub, tone }) {
  const c = tone === "success" ? "var(--rc-success)" : tone === "danger" ? "var(--rc-error)" : tone === "warning" ? "var(--rc-warning)" : "var(--rc-fg1)";
  return (
    <div>
      <div style={{ font: "500 10.5px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ font: "700 22px " + RC_FONT, color: c, letterSpacing: -0.4, marginTop: 5, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function RenterInfo({ r }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <DetailPanel title="Lease timeline">
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ font: "500 12px " + RC_FONT, color: "var(--rc-fg2)" }}>{fmtDate(r.leaseStart)} → {fmtDate(r.leaseEnd)}</div>
              <div style={{ font: "500 12px " + RC_FONT, color: "var(--rc-fg2)" }}>{r.leaseYears.length} year{r.leaseYears.length === 1 ? "" : "s"}</div>
            </div>

            {/* Lease year strip */}
            <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid var(--rc-outline)" }}>
              {r.leaseYears.map((y, i) => {
                const cur = y.current;
                const opt = y.kind === "Option";
                return (
                  <div key={i} style={{ flex: 1, padding: "12px 10px", background: cur ? "var(--rc-revenue-bg)" : opt ? "var(--rc-bg)" : "var(--rc-surface)", borderRight: i === r.leaseYears.length - 1 ? 0 : "1px solid var(--rc-outline)", position: "relative" }}>
                    {cur && <div style={{ position: "absolute", top: 6, right: 8, font: "600 9px " + RC_FONT, color: "var(--rc-revenue-fg)", letterSpacing: 0.5, textTransform: "uppercase" }}>Current</div>}
                    <div style={{ font: "600 12px " + RC_FONT, color: "var(--rc-fg2)" }}>{y.range}</div>
                    <div style={{ font: "700 16px " + RC_FONT, color: "var(--rc-fg1)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{fmtIls(y.amount)}</div>
                    <div style={{ font: "500 10px " + RC_FONT, color: opt ? "var(--rc-warning)" : "var(--rc-fg2)", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.4 }}>{y.kind}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 16, marginTop: 18, font: "400 12px " + RC_FONT, color: "var(--rc-fg2)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--rc-revenue-bg)", borderRadius: 2 }} /> Current year</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 2 }} /> Contract</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--rc-bg)", borderRadius: 2 }} /> Option year</span>
            </div>
          </div>
        </DetailPanel>

        <DetailPanel title="Insurance">
          {r.insurance ? (
            <div>
              <DetailRow icon="shield" label="Insurer"     value={r.insurance.company} />
              <DetailRow icon="hash"   label="Policy"      value={r.insurance.policy} />
              <DetailRow icon="calendar" label="Expires"   value={fmtDate(r.insurance.expiry)} last />
            </div>
          ) : (
            <div style={{ padding: 18 }}><Empty icon="shield" title="No insurance on file" /></div>
          )}
        </DetailPanel>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <DetailPanel title="Contact">
          <DetailRow icon="phone" label="Phone" value={<a style={{ color: "var(--rc-primary)", textDecoration: "none" }}>{r.phone}</a>} />
          <DetailRow icon="mail"  label="Email" value={<a style={{ color: "var(--rc-primary)", textDecoration: "none" }}>{r.email}</a>} last />
        </DetailPanel>

        <DetailPanel title="Payment">
          <DetailRow icon="bank"     label="Method"     value={r.payType} />
          <DetailRow icon="calendar" label="Pay day"    value={`Day ${r.payDay} of month`} last />
        </DetailPanel>

        <DetailPanel title={`Extra contacts (${r.extras.length})`}>
          {r.extras.length === 0 ? (
            <div style={{ padding: "16px 18px", font: "400 12.5px " + RC_FONT, color: "var(--rc-fg2)" }}>No extra contacts added.</div>
          ) : r.extras.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i === r.extras.length - 1 ? 0 : "1px solid var(--rc-outline)" }}>
              <Avatar name={c.name} size={30} color="#A8B7C9" />
              <div style={{ flex: 1 }}>
                <div style={{ font: "600 13px " + RC_FONT, color: "var(--rc-fg1)" }}>{c.name}</div>
                <div style={{ font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)" }}>{c.phone}</div>
              </div>
              <button style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--rc-outline)", background: "var(--rc-surface)", color: "var(--rc-fg1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="phone" size={14} />
              </button>
            </div>
          ))}
        </DetailPanel>
      </div>
    </div>
  );
}

function RenterPropertyView({ p, ctx }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18 }}>
      <div style={{ background: p.color + "44", border: "1px solid var(--rc-outline)", borderRadius: 14, padding: "24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Pill tone={p.status === "occupied" ? "success" : "warning"} size="lg">{p.status === "occupied" ? "Occupied" : "Vacant"}</Pill>
          <button onClick={() => ctx.navigate("propertyDetail", { id: p.id })} style={{ display: "inline-flex", alignItems: "center", gap: 5, font: "500 12px " + RC_FONT, color: "var(--rc-fg1)", background: "rgba(255,255,255,0.7)", border: 0, cursor: "pointer", padding: "6px 10px", borderRadius: 7 }}>
            Open property <Icon name="arrowRight" size={12} />
          </button>
        </div>
        <PropTile property={p} size={80} />
        <div>
          <div style={{ font: "700 22px " + RC_FONT, color: "var(--rc-fg1)", letterSpacing: -0.4 }}>{p.addr}</div>
          <div style={{ font: "400 13px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 4 }}>{p.city}, {p.zip}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <DetailPanel title="At a glance">
          <DetailRow icon="ruler"   label="Size"   value={`${p.sqFt}m²`} />
          <DetailRow icon="users"   label="Bedrooms" value={p.beds} />
          <DetailRow icon="car"     label="Parking" value={p.parking.join(", ") || "—"} last />
        </DetailPanel>
        <DetailPanel title="Meters">
          <DetailRow icon="bolt"    label="Electric" value={p.elecMeter.join(", ") || "—"} />
          <DetailRow icon="droplet" label="Water"    value={p.waterMeter.join(", ") || "—"} />
          <DetailRow icon="flame"   label="Gas"      value={p.gasMeter.join(", ") || "—"} last />
        </DetailPanel>
      </div>
    </div>
  );
}

function RenterTxList({ txs, ctx }) {
  if (txs.length === 0) return <Empty icon="wallet" title="No transactions yet" />;
  return (
    <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, overflow: "hidden" }}>
      {txs.map((t, i) => <TxRow key={t.id} t={t} ctx={ctx} last={i === txs.length - 1} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Renter form (add/edit)
// ─────────────────────────────────────────────────────────────────────────────
function RenterForm({ ctx, drawerProps, onClose }) {
  const editing = drawerProps?.id ? renterById(drawerProps.id) : null;
  const [form, setForm] = React.useState(editing || { propertyId: drawerProps?.propertyId || "", payType: "Bank transfer", payDay: 1 });
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [leaseYears, setLeaseYears] = React.useState(editing?.leaseYears || [{ range: "26-27", amount: "", kind: "Contract" }]);
  const [extras, setExtras] = React.useState(editing?.extras || []);

  return (
    <Drawer
      open
      onClose={onClose}
      title={editing ? "Edit renter" : "Add renter"}
      subtitle={editing ? `Updating ${editing.name}` : "Add a new tenant, lease and contact details."}
      width={680}
      footer={
        <>
          <Btn kind="outline" size="md" onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" size="md" icon="check" onClick={onClose}>{editing ? "Save changes" : "Create renter"}</Btn>
        </>
      }
    >
      <FormSection title="Basic information">
        <div style={{ gridColumn: "1 / -1" }}>
          <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "1px dashed var(--rc-outline)", borderRadius: 9, background: "transparent", color: "var(--rc-primary)", font: "500 13px " + RC_FONT, cursor: "pointer", width: "100%", justifyContent: "center" }}>
            <Icon name="contacts" size={15} /> Pick from device contacts
          </button>
        </div>
        <Field label="First name" required><Input value={form.firstName || ""} onChange={(e) => upd("firstName", e.target.value)} placeholder="Maya" /></Field>
        <Field label="Last name" required><Input value={form.lastName || ""} onChange={(e) => upd("lastName", e.target.value)} placeholder="Thornton" /></Field>
        <Field label="Phone number">
          <Input value={form.phone || ""} onChange={(e) => upd("phone", e.target.value)} placeholder="+972 50 000 0000" />
        </Field>
        <Field label="Email address">
          <Input type="email" value={form.email || ""} onChange={(e) => upd("email", e.target.value)} placeholder="name@example.com" />
        </Field>
      </FormSection>

      <FormSection title="Property" cols={1}>
        <Field label="Linked property" required>
          <Select value={form.propertyId} onChange={(v) => upd("propertyId", v)} placeholder="Select a property…" options={PROPERTIES.map(p => ({ value: p.id, label: `${p.addr}, ${p.city}` }))} />
        </Field>
      </FormSection>

      <FormSection title="Lease information">
        <Field label="Lease start" required>
          <Input type="date" value={form.leaseStart || ""} onChange={(e) => upd("leaseStart", e.target.value)} />
        </Field>
        <Field label="Payment type">
          <Select value={form.payType} onChange={(v) => upd("payType", v)} options={[
            { value: "Bank transfer", label: "Bank transfer" },
            { value: "Cash", label: "Cash" },
            { value: "Bit", label: "Bit" },
            { value: "Check", label: "Check" },
            { value: "Standing order", label: "Standing order" },
            { value: "Wire", label: "Wire" },
          ]} />
        </Field>
        <Field label="Pay day (1-31)">
          <Input type="number" min="1" max="31" value={form.payDay || ""} onChange={(e) => upd("payDay", e.target.value)} />
        </Field>

        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ font: "500 12px " + RC_FONT, color: "var(--rc-fg1)" }}>Lease years</span>
            <button onClick={() => setLeaseYears([...leaseYears, { range: "", amount: "", kind: "Option" }])} style={{ background: "transparent", border: 0, color: "var(--rc-primary)", font: "500 12px " + RC_FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="plus" size={13} /> Add year
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {leaseYears.map((y, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr 130px 36px", gap: 8, alignItems: "center" }}>
                <Input value={y.range} onChange={(e) => { const nl = [...leaseYears]; nl[i].range = e.target.value; setLeaseYears(nl); }} placeholder="25-26" />
                <Input type="number" value={y.amount} onChange={(e) => { const nl = [...leaseYears]; nl[i].amount = e.target.value; setLeaseYears(nl); }} placeholder="Rent / month" />
                <Select value={y.kind} onChange={(v) => { const nl = [...leaseYears]; nl[i].kind = v; setLeaseYears(nl); }} options={[
                  { value: "Contract", label: "Contract" },
                  { value: "Option", label: "Option" },
                ]} />
                <button onClick={() => setLeaseYears(leaseYears.filter((_, j) => j !== i))} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--rc-outline)", background: "var(--rc-surface)", color: "var(--rc-fg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </FormSection>

      <FormSection title="Insurance">
        <Field label="Insurance company"><Input value={form.insCompany || ""} onChange={(e) => upd("insCompany", e.target.value)} placeholder="Migdal, Harel, …" /></Field>
        <Field label="Policy number"><Input value={form.insPolicy || ""} onChange={(e) => upd("insPolicy", e.target.value)} /></Field>
        <Field label="Expiry date"><Input type="date" value={form.insExpiry || ""} onChange={(e) => upd("insExpiry", e.target.value)} /></Field>
      </FormSection>

      <FormSection title="Extra contacts" cols={1}>
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button onClick={() => setExtras([...extras, { name: "", phone: "" }])} style={{ background: "transparent", border: 0, color: "var(--rc-primary)", font: "500 12px " + RC_FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="plus" size={13} /> Add contact
            </button>
          </div>
          {extras.length === 0 ? (
            <div style={{ padding: "12px", textAlign: "center", font: "400 12px " + RC_FONT, color: "var(--rc-fg2)" }}>No extra contacts.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {extras.map((c, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 36px", gap: 8, alignItems: "center" }}>
                  <Input value={c.name} onChange={(e) => { const ne = [...extras]; ne[i].name = e.target.value; setExtras(ne); }} placeholder="Name" />
                  <Input value={c.phone} onChange={(e) => { const ne = [...extras]; ne[i].phone = e.target.value; setExtras(ne); }} placeholder="Phone" />
                  <button onClick={() => setExtras(extras.filter((_, j) => j !== i))} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--rc-outline)", background: "var(--rc-surface)", color: "var(--rc-fg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormSection>
    </Drawer>
  );
}

Object.assign(window, { RentersPage, RenterDetailPage, RenterForm });
