// pages-home.jsx — editorial dashboard.

function HomePage({ ctx }) {
  // Month-to-date totals
  const mtd = TRANSACTIONS.filter(t => t.date.startsWith("2026-05"));
  const mtdRev = mtd.filter(t => t.type === "revenue").reduce((s, t) => s + t.amount, 0);
  const mtdExp = mtd.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const mtdNet = mtdRev - mtdExp;
  const expected = RENTERS.reduce((s, r) => s + r.rent, 0);

  // Needs attention
  const overdue = RENTERS.filter(r => r.status === "overdue");
  const expiring = RENTERS.filter(r => r.status === "expiring");
  const vacant = PROPERTIES.filter(p => p.status === "vacant");

  return (
    <>
      {/* Top context strip */}
      <div style={{ padding: "20px 40px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, font: "500 12px " + RC_FONT, color: "var(--rc-fg2)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--rc-success)" }} />
            Good afternoon, Eyal
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>Friday, 15 May 2026 · half way through the month</span>
        </div>
      </div>

      {/* Editorial hero */}
      <section style={{ padding: "20px 40px 28px", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 28, alignItems: "stretch" }}>
        <div>
          <SectionLabel>Net profit · month-to-date</SectionLabel>
          <h1 style={{ font: "700 84px " + RC_FONT, letterSpacing: -2.8, lineHeight: "0.95", margin: "10px 0 0", color: "var(--rc-fg1)", display: "flex", alignItems: "flex-end", gap: 4 }}>
            {mtdNet.toLocaleString()}<span style={{ font: "700 32px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: -0.6, paddingBottom: 14 }}>₪</span>
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, font: "500 13px " + RC_FONT, color: "var(--rc-fg2)" }}>
            <Pill tone="success" size="lg" icon="trendUp">+4.2% vs Apr-MTD</Pill>
            <span>5 of 6 properties collected</span>
          </div>

          {/* Split tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, marginTop: 24, paddingTop: 22, borderTop: "1px solid var(--rc-outline)" }}>
            <SplitStat label="Collected" value={mtdRev} sub="5 of 6 paid" tone="success" />
            <SplitStat label="Spent" value={mtdExp} sub={`${mtd.filter(t => t.type === "expense").length} expense`} tone="danger" />
            <SplitStat label="Expected by EOM" value={expected} sub={`${(expected - mtdRev).toLocaleString()}₪ pending`} />
          </div>
        </div>

        {/* Cash flow chart */}
        <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 16, padding: "18px 20px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ font: "700 14px " + RC_FONT, color: "var(--rc-fg1)" }}>Cash flow</div>
              <div style={{ font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 2 }}>Last 12 months</div>
            </div>
            <SegToggle options={[{ key: "12m", label: "12m" }, { key: "6m", label: "6m" }, { key: "3m", label: "3m" }]} value="12m" size="sm" />
          </div>
          <div style={{ flex: 1, marginTop: 12, minHeight: 200 }}>
            <CashFlowChart />
          </div>
          <div style={{ display: "flex", gap: 18, paddingTop: 10, borderTop: "1px solid var(--rc-outline)", marginTop: 8, font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 2, background: "var(--rc-success)" }} /> Revenue</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "var(--rc-expense-bg)", borderRadius: 2 }} /> Expense</span>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section style={{ padding: "0 40px 24px" }}>
        <SectionLabel style={{ marginBottom: 10 }}>Quick actions</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <ActionCard icon="trendUp"   label="Record revenue" tone="success" hint="R" onClick={() => ctx.openDrawer("transaction", { type: "revenue" })} />
          <ActionCard icon="trendDown" label="Record expense" tone="danger"  hint="E" onClick={() => ctx.openDrawer("transaction", { type: "expense" })} />
          <ActionCard icon="users"     label="Add renter"     hint="T" onClick={() => ctx.openDrawer("renter")} />
          <ActionCard icon="building2" label="Add property"   hint="P" onClick={() => ctx.openDrawer("property")} />
        </div>
      </section>

      {/* Two column: Needs attention + Portfolio */}
      <section style={{ padding: "0 40px 24px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18 }}>
        {/* Needs attention */}
        <Panel
          title="Needs attention"
          right={`${overdue.length + expiring.length + vacant.length} items`}
        >
          {overdue.map(r => {
            const p = propertyById(r.propertyId);
            return (
              <AttentionRow
                key={"o-" + r.id}
                tone="danger"
                primary={`${r.name} · ${p.addr}`}
                secondary={`Rent ${Math.abs(daysUntil(r.leaseEnd) - 30)} days overdue · ${r.payType}`}
                amount={fmtSigned(r.balance)}
                onClick={() => ctx.navigate("renterDetail", { id: r.id })}
              />
            );
          })}
          {expiring.map(r => {
            const p = propertyById(r.propertyId);
            const d = daysUntil(r.leaseEnd);
            return (
              <AttentionRow
                key={"e-" + r.id}
                tone="warning"
                primary={`${r.name} · ${p.addr}`}
                secondary={`Lease expires in ${d} days · ${fmtDate(r.leaseEnd)}`}
                amount="Renew"
                onClick={() => ctx.navigate("renterDetail", { id: r.id })}
              />
            );
          })}
          {vacant.map(p => (
            <AttentionRow
              key={"v-" + p.id}
              tone="info"
              primary={p.addr}
              secondary={`Vacant · est. ${fmtIls(p.rent)}/mo lost`}
              amount="List"
              onClick={() => ctx.navigate("propertyDetail", { id: p.id })}
            />
          ))}
        </Panel>

        {/* Portfolio occupancy card */}
        <div style={{ background: "var(--rc-brand-navy)", borderRadius: 16, padding: "20px 22px", color: "#fff", display: "flex", flexDirection: "column" }}>
          <div style={{ font: "500 11px " + RC_FONT, color: "rgba(255,255,255,0.55)", letterSpacing: 0.6, textTransform: "uppercase" }}>Portfolio occupancy</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
            <span style={{ font: "700 44px " + RC_FONT, letterSpacing: -1.2 }}>{Math.round((PROPERTIES.filter(p => p.status === "occupied").length / PROPERTIES.length) * 100)}%</span>
            <span style={{ font: "500 13.5px " + RC_FONT, opacity: 0.65 }}>{PROPERTIES.filter(p => p.status === "occupied").length} of {PROPERTIES.length} properties</span>
          </div>
          {/* Property strip */}
          <div style={{ display: "flex", gap: 5, marginTop: 18, flex: 1, alignItems: "center" }}>
            {PROPERTIES.map(p => (
              <button key={p.id} onClick={() => ctx.navigate("propertyDetail", { id: p.id })} title={p.addr} style={{ flex: 1, height: 44, borderRadius: 6, background: p.status === "occupied" ? "var(--rc-section-accent)" : "rgba(255,255,255,0.18)", border: 0, cursor: "pointer", display: "flex", alignItems: "flex-end", padding: 6 }}>
                <span style={{ font: "500 9px " + RC_FONT, color: "#fff", opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.addr.split(" ")[0]}</span>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, font: "400 11.5px " + RC_FONT, opacity: 0.55 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, background: "var(--rc-section-accent)", borderRadius: 2 }} /> Occupied</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, background: "rgba(255,255,255,0.18)", borderRadius: 2 }} /> Vacant: {vacant.map(v => v.addr.split(" ").slice(0, 2).join(" ")).join(", ")}</span>
          </div>
        </div>
      </section>

      {/* Recent activity */}
      <section style={{ padding: "0 40px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <SectionLabel>Recent transactions</SectionLabel>
          <button onClick={() => ctx.navigate("transactions")} style={{ background: "transparent", border: 0, color: "var(--rc-fg2)", font: "500 12px " + RC_FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
            View all <Icon name="arrowRight" size={12} />
          </button>
        </div>
        <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, overflow: "hidden" }}>
          {TRANSACTIONS.slice(0, 5).map((t, i, arr) => (
            <ActivityRow key={t.id} t={t} ctx={ctx} last={i === arr.length - 1} />
          ))}
        </div>
      </section>
    </>
  );
}

function SplitStat({ label, value, sub, tone }) {
  const c = tone === "success" ? "var(--rc-success)" : tone === "danger" ? "var(--rc-error)" : "var(--rc-fg1)";
  return (
    <div>
      <div style={{ font: "500 11px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ font: "700 22px " + RC_FONT, color: c, letterSpacing: -0.4, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{value.toLocaleString()}<span style={{ font: "700 14px " + RC_FONT, color: "var(--rc-fg2)", marginLeft: 2 }}>₪</span></div>
      <div style={{ font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function ActionCard({ icon, label, tone, hint, onClick }) {
  const iconBg = tone === "success" ? "var(--rc-revenue-bg)" : tone === "danger" ? "var(--rc-expense-bg)" : "var(--rc-primary-container)";
  const iconFg = tone === "success" ? "var(--rc-revenue-fg)" : tone === "danger" ? "var(--rc-expense-fg)" : "var(--rc-on-primary-ctr)";
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--rc-fg2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rc-outline)"; }}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "border-color .12s" }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 9, background: iconBg, color: iconFg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} />
      </div>
      <div style={{ flex: 1, font: "600 13.5px " + RC_FONT, color: "var(--rc-fg1)" }}>{label}</div>
      {hint && <kbd style={{ font: "500 10px " + RC_FONT, color: "var(--rc-fg2)", border: "1px solid var(--rc-outline)", borderRadius: 4, padding: "2px 6px", background: "var(--rc-bg)" }}>{hint}</kbd>}
    </button>
  );
}

function Panel({ title, right, children }) {
  return (
    <section style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 14 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 10px" }}>
        <div style={{ font: "700 14px " + RC_FONT, color: "var(--rc-fg1)" }}>{title}</div>
        {right && <span style={{ font: "500 11.5px " + RC_FONT, color: "var(--rc-fg2)" }}>{right}</span>}
      </header>
      <div style={{ padding: "0 6px 8px" }}>{children}</div>
    </section>
  );
}

function AttentionRow({ tone, primary, secondary, amount, onClick }) {
  const dot = tone === "danger" ? "var(--rc-error)" : tone === "warning" ? "var(--rc-warning)" : "var(--rc-primary)";
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--rc-bg)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 9, cursor: "pointer", width: "100%", background: "transparent", border: 0, textAlign: "left" }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: dot, flexShrink: 0, boxShadow: `0 0 0 4px ${dot}1f` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: "600 13.5px " + RC_FONT, color: "var(--rc-fg1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{primary}</div>
        <div style={{ font: "400 12px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{secondary}</div>
      </div>
      <div style={{ font: "600 13px " + RC_FONT, color: tone === "danger" ? "var(--rc-expense-fg)" : "var(--rc-fg1)" }}>{amount}</div>
      <Icon name="chevron" size={14} color="var(--rc-placeholder)" />
    </button>
  );
}

function ActivityRow({ t, ctx, last }) {
  const isRev = t.type === "revenue";
  const p = propertyById(t.propertyId);
  return (
    <button
      onClick={() => ctx.navigate("transactionDetail", { id: t.id })}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--rc-bg)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: last ? 0 : "1px solid var(--rc-outline)", cursor: "pointer", width: "100%", background: "transparent", border: 0, borderBottomWidth: last ? 0 : 1, borderBottomStyle: "solid", borderBottomColor: "var(--rc-outline)", textAlign: "left" }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 8, background: isRev ? "var(--rc-revenue-bg)" : "var(--rc-expense-bg)", color: isRev ? "var(--rc-revenue-fg)" : "var(--rc-expense-fg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={isRev ? "trendUp" : "trendDown"} size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: "600 13px " + RC_FONT, color: "var(--rc-fg1)" }}>{t.party}</div>
        <div style={{ font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 1 }}>
          {isRev ? "Rent" : (t.categoryKey ? CAT_BY_KEY[t.categoryKey]?.label : "Expense")} · {p?.addr}
        </div>
      </div>
      <div style={{ font: "400 12px " + RC_FONT, color: "var(--rc-fg2)", whiteSpace: "nowrap" }}>{fmtDateShort(t.date)}</div>
      <div style={{ width: 110, textAlign: "right", font: "600 13.5px " + RC_FONT, color: isRev ? "var(--rc-revenue-fg)" : "var(--rc-expense-fg)", fontVariantNumeric: "tabular-nums" }}>
        {isRev ? "+" : "−"}{t.amount.toLocaleString()}₪
      </div>
    </button>
  );
}

// Stacked-area chart with bars for expenses.
function CashFlowChart() {
  const w = 520, h = 200, pad = { l: 22, r: 8, t: 10, b: 26 };
  const inner = { w: w - pad.l - pad.r, h: h - pad.t - pad.b };
  const maxRev = Math.max(...CASH_FLOW.map(d => d.rev));
  const barW = inner.w / CASH_FLOW.length * 0.45;
  const step = inner.w / (CASH_FLOW.length - 1);

  const linePts = CASH_FLOW.map((d, i) => {
    const x = pad.l + i * step;
    const y = pad.t + inner.h - (d.rev / maxRev) * inner.h;
    return [x, y];
  });
  const linePath = linePts.map((p, i) => (i === 0 ? "M" : "L") + p[0] + " " + p[1]).join(" ");
  const areaPath = linePath + ` L${pad.l + inner.w} ${pad.t + inner.h} L${pad.l} ${pad.t + inner.h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "100%", display: "block" }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="cf-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--rc-success)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--rc-success)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={pad.l} x2={pad.l + inner.w} y1={pad.t + inner.h * f} y2={pad.t + inner.h * f} stroke="var(--rc-outline)" strokeDasharray="2 4" />
      ))}
      {CASH_FLOW.map((d, i) => {
        const x = pad.l + i * step - barW / 2;
        const bh = (d.exp / maxRev) * inner.h * 1.5;
        return <rect key={d.m} x={x} y={pad.t + inner.h - bh} width={barW} height={bh} rx="2" fill="var(--rc-expense-bg)" />;
      })}
      <path d={areaPath} fill="url(#cf-grad)" />
      <path d={linePath} fill="none" stroke="var(--rc-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {linePts.map((p, i) => (
        i === linePts.length - 1
          ? <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="var(--rc-surface)" stroke="var(--rc-success)" strokeWidth="2" />
          : null
      ))}
      {CASH_FLOW.map((d, i) => (
        i % 2 === 0 && <text key={d.m} x={pad.l + i * step} y={h - 8} fill="var(--rc-fg2)" fontSize="10" textAnchor="middle" fontFamily={RC_FONT}>{d.m}</text>
      ))}
    </svg>
  );
}

Object.assign(window, { HomePage });
