// pages-reports.jsx — Hub + Income/Expense + Expense Log with interactive
// preview before export.

function ReportsPage({ ctx }) {
  return (
    <>
      <PageHeader
        title="Reports"
        meta="Generate annual reports and export to PDF or Excel"
      />

      <div style={{ padding: "24px 40px 18px" }}>
        <SectionLabel>Generate a report</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 10 }}>
          <ReportCard
            title="Income & Expense"
            subtitle="Monthly revenue vs. expenses, by property and owner."
            icon="pieChart"
            color="var(--rc-success)"
            stats={[
              { label: "Year-to-date revenue", value: "166,500₪" },
              { label: "Year-to-date expenses", value: "12,440₪" },
              { label: "Net profit",            value: "154,060₪" },
            ]}
            onGenerate={() => ctx.navigate("reportIncomeExpense")}
          />
          <ReportCard
            title="Expense Log"
            subtitle="Detailed list of all expenses, grouped by category."
            icon="barChart"
            color="var(--rc-error)"
            stats={[
              { label: "Expenses this year", value: "12,440₪" },
              { label: "Transactions",       value: "11" },
              { label: "Top category",       value: "Repairs" },
            ]}
            onGenerate={() => ctx.navigate("reportExpenseLog")}
          />
        </div>
      </div>

      <div style={{ padding: "12px 40px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <SectionLabel>Recent reports</SectionLabel>
          <span style={{ font: "500 12px " + RC_FONT, color: "var(--rc-fg2)" }}>{REPORT_HISTORY.length} saved</span>
        </div>
        <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, overflow: "hidden" }}>
          {REPORT_HISTORY.map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i === REPORT_HISTORY.length - 1 ? 0 : "1px solid var(--rc-outline)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: r.format === "PDF" ? "var(--rc-expense-bg)" : "var(--rc-revenue-bg)", color: r.format === "PDF" ? "var(--rc-expense-fg)" : "var(--rc-revenue-fg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={r.format === "PDF" ? "filePdf" : "fileExcel"} size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ font: "600 13.5px " + RC_FONT, color: "var(--rc-fg1)" }}>{r.type} · {r.period}</div>
                <div style={{ font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)" }}>Generated {fmtDate(r.generated)} · {r.format}</div>
              </div>
              <Btn kind="ghost" size="sm" icon="share">Share</Btn>
              <Btn kind="ghost" size="sm" icon="download">Re-export</Btn>
              <Btn kind="ghost" size="sm" icon="trash" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ReportCard({ title, subtitle, icon, color, stats, onGenerate }) {
  return (
    <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 14, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: "700 17px " + RC_FONT, color: "var(--rc-fg1)", letterSpacing: -0.3 }}>{title}</div>
          <div style={{ font: "400 13px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 3, lineHeight: 1.5 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, paddingTop: 14, borderTop: "1px solid var(--rc-outline)" }}>
        {stats.map(s => (
          <div key={s.label}>
            <div style={{ font: "500 10.5px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.4, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ font: "700 14px " + RC_FONT, color: "var(--rc-fg1)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
          </div>
        ))}
      </div>
      <Btn kind="primary" size="md" iconRight="arrowRight" onClick={onGenerate}>Open report</Btn>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Income & Expense report
// ─────────────────────────────────────────────────────────────────────────────
function IncomeExpenseReport({ ctx }) {
  const [year, setYear] = React.useState("2026");
  const [groupBy, setGroupBy] = React.useState("property"); // property | owner

  // Build per-property monthly buckets
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const rows = PROPERTIES.map(p => {
    const monthly = months.map((_, idx) => {
      const key = `${year}-${String(idx + 1).padStart(2, "0")}`;
      const tx = TRANSACTIONS.filter(t => t.propertyId === p.id && t.date.startsWith(key));
      const rev = tx.filter(t => t.type === "revenue").reduce((s, t) => s + t.amount, 0);
      const exp = tx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      return { rev, exp };
    });
    const totalRev = monthly.reduce((s, m) => s + m.rev, 0);
    const totalExp = monthly.reduce((s, m) => s + m.exp, 0);
    return { p, monthly, totalRev, totalExp };
  });

  const grand = rows.reduce((acc, r) => ({ rev: acc.rev + r.totalRev, exp: acc.exp + r.totalExp }), { rev: 0, exp: 0 });

  return (
    <>
      <PageHeader
        title="Income & Expense report"
        back="Reports"
        onBack={() => ctx.navigate("reports")}
        meta={`Calendar year ${year}`}
        actions={
          <>
            <Btn kind="outline" size="md" icon="filePdf">Export PDF</Btn>
            <Btn kind="primary" size="md" icon="fileExcel">Export Excel</Btn>
          </>
        }
      />

      {/* Controls */}
      <div style={{ padding: "16px 40px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--rc-outline)" }}>
        <span style={{ font: "500 12px " + RC_FONT, color: "var(--rc-fg2)" }}>Year</span>
        <SegToggle options={[{ key: "2024", label: "2024" }, { key: "2025", label: "2025" }, { key: "2026", label: "2026" }]} value={year} onChange={setYear} />
        <span style={{ marginLeft: 24, font: "500 12px " + RC_FONT, color: "var(--rc-fg2)" }}>Group by</span>
        <SegToggle options={[{ key: "property", label: "Property" }, { key: "owner", label: "Owner" }]} value={groupBy} onChange={setGroupBy} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
          <KpiInline label="Revenue" value={fmtIls(grand.rev)} tone="success" />
          <KpiInline label="Expenses" value={fmtIls(grand.exp)} tone="danger" />
          <KpiInline label="Net" value={fmtIls(grand.rev - grand.exp)} />
        </div>
      </div>

      {/* Report content */}
      <div style={{ padding: "24px 40px 40px" }}>
        <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, overflow: "hidden" }}>
          {/* Header row */}
          <div style={{ display: "flex", padding: "12px 16px", background: "var(--rc-brand-navy)", color: "#fff", font: "600 11px " + RC_FONT, letterSpacing: 0.5, textTransform: "uppercase", borderBottom: "1px solid var(--rc-outline)", gap: 4 }}>
            <div style={{ flex: 2.4, minWidth: 0 }}>Property</div>
            {months.map(m => (
              <div key={m} style={{ width: 48, textAlign: "right", color: "rgba(255,255,255,0.7)" }}>{m}</div>
            ))}
            <div style={{ width: 80, textAlign: "right" }}>Total</div>
          </div>

          {/* Revenue group */}
          <SectionDivider label="Revenue" tone="success" />
          {rows.map((r, i) => (
            <div key={"rev-" + r.p.id} style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: i === rows.length - 1 ? "1px solid var(--rc-outline)" : "1px solid var(--rc-outline-subtle, var(--rc-outline))", gap: 4 }}>
              <div style={{ flex: 2.4, minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <PropTile property={r.p} size={28} />
                <div>
                  <div style={{ font: "600 12.5px " + RC_FONT, color: "var(--rc-fg1)" }}>{r.p.addr}</div>
                  <div style={{ font: "400 10.5px " + RC_FONT, color: "var(--rc-fg2)" }}>{r.p.owner}</div>
                </div>
              </div>
              {r.monthly.map((m, idx) => (
                <div key={idx} style={{ width: 48, textAlign: "right", font: "500 11.5px " + RC_FONT, color: m.rev ? "var(--rc-fg1)" : "var(--rc-placeholder)", fontVariantNumeric: "tabular-nums" }}>
                  {m.rev ? Math.round(m.rev / 1000) + "k" : "—"}
                </div>
              ))}
              <div style={{ width: 80, textAlign: "right", font: "700 13px " + RC_FONT, color: "var(--rc-revenue-fg)", fontVariantNumeric: "tabular-nums" }}>{r.totalRev > 0 ? fmtIls(r.totalRev) : "—"}</div>
            </div>
          ))}

          {/* Expenses group */}
          <SectionDivider label="Expenses" tone="danger" />
          {rows.map((r, i) => (
            <div key={"exp-" + r.p.id} style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: i === rows.length - 1 ? 0 : "1px solid var(--rc-outline)", gap: 4 }}>
              <div style={{ flex: 2.4, minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <PropTile property={r.p} size={28} />
                <div>
                  <div style={{ font: "600 12.5px " + RC_FONT, color: "var(--rc-fg1)" }}>{r.p.addr}</div>
                  <div style={{ font: "400 10.5px " + RC_FONT, color: "var(--rc-fg2)" }}>{r.p.owner}</div>
                </div>
              </div>
              {r.monthly.map((m, idx) => (
                <div key={idx} style={{ width: 48, textAlign: "right", font: "500 11.5px " + RC_FONT, color: m.exp ? "var(--rc-fg1)" : "var(--rc-placeholder)", fontVariantNumeric: "tabular-nums" }}>
                  {m.exp ? Math.round(m.exp / 1000 * 10) / 10 + "k" : "—"}
                </div>
              ))}
              <div style={{ width: 80, textAlign: "right", font: "700 13px " + RC_FONT, color: "var(--rc-expense-fg)", fontVariantNumeric: "tabular-nums" }}>{r.totalExp > 0 ? fmtIls(r.totalExp) : "—"}</div>
            </div>
          ))}

          {/* Totals row */}
          <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", background: "var(--rc-bg)", borderTop: "1px solid var(--rc-outline)", gap: 4 }}>
            <div style={{ flex: 2.4, font: "700 13.5px " + RC_FONT, color: "var(--rc-fg1)" }}>Net total</div>
            {months.map((m, idx) => {
              const monthTotal = rows.reduce((s, r) => s + r.monthly[idx].rev - r.monthly[idx].exp, 0);
              return (
                <div key={m} style={{ width: 48, textAlign: "right", font: "700 11.5px " + RC_FONT, color: monthTotal === 0 ? "var(--rc-placeholder)" : monthTotal > 0 ? "var(--rc-success)" : "var(--rc-error)", fontVariantNumeric: "tabular-nums" }}>
                  {monthTotal === 0 ? "—" : Math.round(monthTotal / 1000) + "k"}
                </div>
              );
            })}
            <div style={{ width: 80, textAlign: "right", font: "700 14px " + RC_FONT, color: grand.rev - grand.exp >= 0 ? "var(--rc-success)" : "var(--rc-error)", fontVariantNumeric: "tabular-nums" }}>{fmtIls(grand.rev - grand.exp)}</div>
          </div>
        </div>

        {/* Per-property summary cards */}
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {rows.map(r => (
            <div key={r.p.id} style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <PropTile property={r.p} size={32} />
                <div>
                  <div style={{ font: "600 13px " + RC_FONT, color: "var(--rc-fg1)" }}>{r.p.addr}</div>
                  <div style={{ font: "400 11px " + RC_FONT, color: "var(--rc-fg2)" }}>{r.p.owner}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--rc-outline)" }}>
                <div>
                  <div style={{ font: "500 10px " + RC_FONT, color: "var(--rc-fg2)", textTransform: "uppercase", letterSpacing: 0.4 }}>Rev</div>
                  <div style={{ font: "700 13px " + RC_FONT, color: "var(--rc-revenue-fg)", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{fmtIls(r.totalRev)}</div>
                </div>
                <div>
                  <div style={{ font: "500 10px " + RC_FONT, color: "var(--rc-fg2)", textTransform: "uppercase", letterSpacing: 0.4 }}>Exp</div>
                  <div style={{ font: "700 13px " + RC_FONT, color: "var(--rc-expense-fg)", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{fmtIls(r.totalExp)}</div>
                </div>
                <div>
                  <div style={{ font: "500 10px " + RC_FONT, color: "var(--rc-fg2)", textTransform: "uppercase", letterSpacing: 0.4 }}>Net</div>
                  <div style={{ font: "700 13px " + RC_FONT, color: "var(--rc-fg1)", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{fmtIls(r.totalRev - r.totalExp)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function KpiInline({ label, value, tone }) {
  const c = tone === "success" ? "var(--rc-success)" : tone === "danger" ? "var(--rc-error)" : "var(--rc-fg1)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <span style={{ font: "500 10px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</span>
      <span style={{ font: "700 14px " + RC_FONT, color: c, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{value}</span>
    </div>
  );
}

function SectionDivider({ label, tone }) {
  const c = tone === "success" ? "var(--rc-revenue-fg)" : "var(--rc-expense-fg)";
  const bg = tone === "success" ? "var(--rc-revenue-bg)" : "var(--rc-expense-bg)";
  return (
    <div style={{ padding: "8px 16px", background: bg, color: c, font: "700 11px " + RC_FONT, letterSpacing: 0.6, textTransform: "uppercase", borderBottom: "1px solid var(--rc-outline)" }}>{label}</div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Expense Log report
// ─────────────────────────────────────────────────────────────────────────────
function ExpenseLogReport({ ctx }) {
  const [year, setYear] = React.useState("2026");
  const expenses = TRANSACTIONS.filter(t => t.type === "expense").sort((a, b) => a.date.localeCompare(b.date));

  // Group by category
  const grouped = {};
  expenses.forEach(t => {
    (grouped[t.categoryKey] = grouped[t.categoryKey] || []).push(t);
  });
  const categories = Object.keys(grouped);
  const total = expenses.reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <PageHeader
        title="Expense Log report"
        back="Reports"
        onBack={() => ctx.navigate("reports")}
        meta={`${expenses.length} expenses · ${fmtIls(total)} total`}
        actions={
          <>
            <Btn kind="outline" size="md" icon="filePdf">Export PDF</Btn>
            <Btn kind="primary" size="md" icon="fileExcel">Export Excel</Btn>
          </>
        }
      />

      <div style={{ padding: "16px 40px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--rc-outline)" }}>
        <span style={{ font: "500 12px " + RC_FONT, color: "var(--rc-fg2)" }}>Year</span>
        <SegToggle options={[{ key: "2024", label: "2024" }, { key: "2025", label: "2025" }, { key: "2026", label: "2026" }]} value={year} onChange={setYear} />
        <span style={{ marginLeft: 24, font: "500 12px " + RC_FONT, color: "var(--rc-fg2)" }}>Or pick a range</span>
        <Btn kind="outline" size="sm" icon="calendar">Custom range</Btn>
      </div>

      <div style={{ padding: "24px 40px 40px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "flex-start" }}>
        {/* Main table */}
        <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", padding: "12px 16px", background: "var(--rc-brand-navy)", color: "#fff", font: "600 11px " + RC_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
            <div style={{ width: 90 }}>Date</div>
            <div style={{ flex: 1.5 }}>Supplier / category</div>
            <div style={{ flex: 1 }}>Property</div>
            <div style={{ width: 90, textAlign: "right" }}>Amount</div>
          </div>

          {categories.map(cKey => {
            const cat = CAT_BY_KEY[cKey];
            const catTotal = grouped[cKey].reduce((s, t) => s + t.amount, 0);
            return (
              <React.Fragment key={cKey}>
                <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", background: "var(--rc-bg)", borderTop: "1px solid var(--rc-outline)", borderBottom: "1px solid var(--rc-outline)" }}>
                  <Icon name={cat?.icon || "more"} size={14} color="var(--rc-fg2)" style={{ marginRight: 8 }} />
                  <div style={{ flex: 1, font: "700 12.5px " + RC_FONT, color: "var(--rc-fg1)" }}>{cat?.label || cKey}</div>
                  <div style={{ font: "700 12.5px " + RC_FONT, color: "var(--rc-expense-fg)", fontVariantNumeric: "tabular-nums" }}>{fmtIls(catTotal)}</div>
                </div>
                {grouped[cKey].map((t, i) => {
                  const p = propertyById(t.propertyId);
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: i === grouped[cKey].length - 1 ? 0 : "1px solid var(--rc-outline)" }}>
                      <div style={{ width: 90, font: "400 12px " + RC_FONT, color: "var(--rc-fg2)" }}>{fmtDateShort(t.date)}</div>
                      <div style={{ flex: 1.5 }}>
                        <div style={{ font: "600 12.5px " + RC_FONT, color: "var(--rc-fg1)" }}>{t.party}</div>
                        {t.notes && <div style={{ font: "400 11px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 1 }}>{t.notes}</div>}
                      </div>
                      <div style={{ flex: 1, font: "400 12px " + RC_FONT, color: "var(--rc-fg2)" }}>{p?.addr}</div>
                      <div style={{ width: 90, textAlign: "right", font: "600 13px " + RC_FONT, color: "var(--rc-expense-fg)", fontVariantNumeric: "tabular-nums" }}>{fmtIls(t.amount)}</div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* Grand total */}
          <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "var(--rc-bg)", borderTop: "1px solid var(--rc-outline)" }}>
            <div style={{ flex: 1, font: "700 13px " + RC_FONT, color: "var(--rc-fg1)" }}>Grand total</div>
            <div style={{ font: "700 16px " + RC_FONT, color: "var(--rc-expense-fg)", fontVariantNumeric: "tabular-nums" }}>{fmtIls(total)}</div>
          </div>
        </div>

        {/* Right sidebar: breakdown chart */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ font: "700 13px " + RC_FONT, color: "var(--rc-fg1)", marginBottom: 12 }}>By category</div>
            {categories.map(cKey => {
              const cat = CAT_BY_KEY[cKey];
              const catTotal = grouped[cKey].reduce((s, t) => s + t.amount, 0);
              const pct = (catTotal / total) * 100;
              return (
                <div key={cKey} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ font: "500 12px " + RC_FONT, color: "var(--rc-fg1)" }}>{cat?.label}</span>
                    <span style={{ font: "600 11.5px " + RC_FONT, color: "var(--rc-fg2)", fontVariantNumeric: "tabular-nums" }}>{Math.round(pct)}%</span>
                  </div>
                  <div style={{ height: 8, background: "var(--rc-bg)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--rc-expense-fg)", borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: "var(--rc-brand-navy)", color: "#fff", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ font: "500 10.5px " + RC_FONT, opacity: 0.65, letterSpacing: 0.4, textTransform: "uppercase" }}>This year so far</div>
            <Currency value={total} size={28} color="#fff" />
            <div style={{ font: "400 12px " + RC_FONT, opacity: 0.7, marginTop: 4 }}>across {expenses.length} expenses, {categories.length} categories</div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ReportsPage, IncomeExpenseReport, ExpenseLogReport });
