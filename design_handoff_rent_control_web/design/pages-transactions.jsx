// pages-transactions.jsx — list (KPI chart + grouped ledger), detail, add/edit
// with single + bulk revenue paths.

function TransactionsPage({ ctx }) {
  const [q, setQ] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [propertyFilter, setPropertyFilter] = React.useState(null);

  const filtered = TRANSACTIONS.filter(t => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (propertyFilter && t.propertyId !== propertyFilter) return false;
    if (q) {
      const ql = q.toLowerCase();
      if (!t.party.toLowerCase().includes(ql) && !(t.notes || "").toLowerCase().includes(ql)) return false;
    }
    return true;
  });

  // Group by month
  const grouped = {};
  filtered.forEach(t => {
    const key = t.date.substring(0, 7);
    (grouped[key] = grouped[key] || []).push(t);
  });
  const months = Object.keys(grouped).sort().reverse();

  const revTotal = filtered.filter(t => t.type === "revenue").reduce((s, t) => s + t.amount, 0);
  const expTotal = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <PageHeader
        title="Transactions"
        meta={`${filtered.length} of ${TRANSACTIONS.length} · ${fmtIls(revTotal)} revenue · ${fmtIls(expTotal)} expenses`}
        actions={
          <>
            <Btn kind="outline" size="md" icon="store" onClick={() => ctx.navigate("suppliers")}>Suppliers</Btn>
            <Btn kind="outline" size="md" icon="download">Export</Btn>
            <Btn kind="primary" size="md" icon="plus" onClick={() => ctx.openDrawer("transaction")}>Add transaction</Btn>
          </>
        }
      />

      {/* Hero strip: 6-month bar chart + KPI tiles */}
      <section style={{ padding: "20px 40px 24px", display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
        <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
            <div>
              <div style={{ font: "700 14px " + RC_FONT, color: "var(--rc-fg1)" }}>Revenue vs. expense</div>
              <div style={{ font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 2 }}>Last 6 months</div>
            </div>
            <div style={{ display: "flex", gap: 14, font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "var(--rc-success)", borderRadius: 2 }} /> Revenue</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "var(--rc-error)", borderRadius: 2 }} /> Expense</span>
            </div>
          </div>
          <SixMonthChart />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <KpiTile label="May revenue" value={33500} sub="5 of 6 paid" tone="success" trend="+4.2%" />
          <KpiTile label="May expenses" value={400} sub="1 transaction" tone="danger" trend="−84% vs Apr" trendTone="success" />
          <KpiTile label="May net" value={33100} sub="month-to-date" />
        </div>
      </section>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 40px 12px", flexWrap: "wrap" }}>
        <SegToggle
          options={[
            { key: "all",     label: "All",      icon: "wallet" },
            { key: "revenue", label: "Revenue",  icon: "trendUp" },
            { key: "expense", label: "Expenses", icon: "trendDown" },
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
        />
        <SearchInput placeholder="Search by party or notes…" value={q} onChange={setQ} width={300} hint={null} />
        <FilterChip label="Property" value={propertyFilter ? propertyById(propertyFilter)?.addr : null} active={!!propertyFilter} onClick={() => setPropertyFilter(propertyFilter ? null : PROPERTIES[0].id)} onClear={() => setPropertyFilter(null)} />
        <FilterChip label="Renter" />
        <FilterChip label="Supplier" />
        <FilterChip label="Date" />
        <div style={{ marginLeft: "auto", font: "500 12px " + RC_FONT, color: "var(--rc-fg2)" }}>
          Net <span style={{ font: "700 14px " + RC_FONT, color: revTotal - expTotal >= 0 ? "var(--rc-success)" : "var(--rc-error)" }}>{fmtSigned(revTotal - expTotal)}</span>
        </div>
      </div>

      {/* Grouped ledger */}
      <div style={{ padding: "0 40px 40px", display: "flex", flexDirection: "column", gap: 18 }}>
        {months.length === 0 && <Empty icon="wallet" title="No transactions" />}
        {months.map(m => {
          const items = grouped[m];
          const monthRev = items.filter(t => t.type === "revenue").reduce((s, t) => s + t.amount, 0);
          const monthExp = items.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
          const [y, mm] = m.split("-");
          const monthName = `${MONTHS[parseInt(mm, 10) - 1]} ${y}`;
          return (
            <div key={m}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 6px 10px" }}>
                <div style={{ font: "700 13.5px " + RC_FONT, color: "var(--rc-fg1)" }}>{monthName}</div>
                <div style={{ display: "flex", gap: 16, font: "500 12px " + RC_FONT }}>
                  <span style={{ color: "var(--rc-revenue-fg)", fontVariantNumeric: "tabular-nums" }}>+{monthRev.toLocaleString()}₪</span>
                  <span style={{ color: "var(--rc-expense-fg)", fontVariantNumeric: "tabular-nums" }}>−{monthExp.toLocaleString()}₪</span>
                  <span style={{ color: "var(--rc-fg1)", fontVariantNumeric: "tabular-nums" }}>{fmtSigned(monthRev - monthExp)}</span>
                </div>
              </div>
              <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, overflow: "hidden" }}>
                {items.map((t, i) => <TxRow key={t.id} t={t} ctx={ctx} last={i === items.length - 1} />)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function KpiTile({ label, value, sub, tone, trend, trendTone }) {
  const c = tone === "success" ? "var(--rc-success)" : tone === "danger" ? "var(--rc-error)" : "var(--rc-fg1)";
  const tt = trendTone === "success" ? "var(--rc-success)" : trendTone === "danger" ? "var(--rc-error)" : tone === "success" ? "var(--rc-success)" : tone === "danger" ? "var(--rc-error)" : "var(--rc-fg2)";
  return (
    <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ font: "500 11px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</div>
        {trend && <span style={{ font: "600 11px " + RC_FONT, color: tt }}>{trend}</span>}
      </div>
      <Currency value={value} size={22} color={c} />
      <div style={{ font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function SixMonthChart() {
  const data = CASH_FLOW.slice(-6);
  const w = 520, h = 180, pad = { l: 36, r: 8, t: 8, b: 24 };
  const inner = { w: w - pad.l - pad.r, h: h - pad.t - pad.b };
  const max = Math.max(...data.flatMap(d => [d.rev, d.exp])) * 1.1;
  const slot = inner.w / data.length;
  const barW = slot * 0.32;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 180, display: "block" }} preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <g key={f}>
          <line x1={pad.l} x2={pad.l + inner.w} y1={pad.t + inner.h * (1 - f)} y2={pad.t + inner.h * (1 - f)} stroke="var(--rc-outline)" strokeDasharray={f === 0 ? "0" : "2 4"} />
          <text x={pad.l - 6} y={pad.t + inner.h * (1 - f) + 3} fill="var(--rc-fg2)" fontSize="9" textAnchor="end" fontFamily={RC_FONT}>{Math.round(max * f / 1000)}k</text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = pad.l + slot * i + slot / 2;
        const revH = (d.rev / max) * inner.h;
        const expH = (d.exp / max) * inner.h;
        return (
          <g key={d.m}>
            <rect x={cx - barW - 2} y={pad.t + inner.h - revH} width={barW} height={revH} rx="2" fill="var(--rc-success)" />
            <rect x={cx + 2}        y={pad.t + inner.h - expH} width={barW} height={expH} rx="2" fill="var(--rc-error)" opacity="0.85" />
            <text x={cx} y={h - 6} fill="var(--rc-fg2)" fontSize="10" textAnchor="middle" fontFamily={RC_FONT}>{d.m}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction detail
// ─────────────────────────────────────────────────────────────────────────────
function TransactionDetailPage({ ctx }) {
  const id = ctx.route.params?.id;
  const t = TRANSACTIONS.find(x => x.id === id);
  if (!t) return <Empty title="Transaction not found" />;

  const isRev = t.type === "revenue";
  const p = propertyById(t.propertyId);
  const r = t.renterId ? renterById(t.renterId) : null;
  const s = t.supplierId ? supplierById(t.supplierId) : null;
  const cat = t.categoryKey ? CAT_BY_KEY[t.categoryKey] : null;
  const method = PAYMENT_METHODS.find(m => m.key === t.method);

  return (
    <>
      <PageHeader
        title={isRev ? "Revenue" : "Expense"}
        meta={fmtDate(t.date)}
        back={isRev ? "Transactions" : "Transactions"}
        onBack={() => ctx.navigate("transactions")}
        actions={
          <>
            <Btn kind="outline" size="md" icon="share">Share</Btn>
            <Btn kind="outline" size="md" icon="trash">Delete</Btn>
            <Btn kind="outline" size="md" icon="pencil" onClick={() => ctx.openDrawer("transaction", { id: t.id })}>Edit</Btn>
          </>
        }
      />

      <div style={{ padding: "24px 40px 40px", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18, alignItems: "flex-start" }}>
        {/* Main card */}
        <div style={{ background: isRev ? "var(--rc-revenue-bg)" : "var(--rc-expense-bg)", border: "1px solid var(--rc-outline)", borderRadius: 16, padding: "28px 28px", display: "flex", flexDirection: "column", gap: 4 }}>
          <Pill tone={isRev ? "success" : "danger"} size="lg" icon={isRev ? "trendUp" : "trendDown"}>
            {isRev ? "Revenue" : `Expense · ${cat?.label}`}
          </Pill>
          <Currency value={t.amount} size={56} color={isRev ? "var(--rc-revenue-fg)" : "var(--rc-expense-fg)"} />
          <div style={{ font: "500 14px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 4 }}>
            {isRev ? `Rent for ${t.monthFor ? `${MONTHS[parseInt(t.monthFor.split("-")[1], 10) - 1]} ${t.monthFor.split("-")[0]}` : "—"}` : `Paid on ${fmtDate(t.date)}`}
          </div>
          {t.notes && (
            <div style={{ marginTop: 18, padding: "12px 14px", background: "var(--rc-surface)", borderRadius: 10, border: "1px solid var(--rc-outline)", font: "400 13px " + RC_FONT, color: "var(--rc-fg1)", lineHeight: 1.55 }}>
              <div style={{ font: "600 11px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 6 }}>Notes</div>
              {t.notes}
            </div>
          )}
        </div>

        <DetailPanel title="Details">
          {p && (
            <DetailRow icon="building2" label="Property" value={
              <button onClick={() => ctx.navigate("propertyDetail", { id: p.id })} style={{ background: "transparent", border: 0, color: "var(--rc-primary)", font: "600 13px " + RC_FONT, cursor: "pointer", padding: 0 }}>{p.addr}</button>
            } />
          )}
          {r && (
            <DetailRow icon="user" label="Renter" value={
              <button onClick={() => ctx.navigate("renterDetail", { id: r.id })} style={{ background: "transparent", border: 0, color: "var(--rc-primary)", font: "600 13px " + RC_FONT, cursor: "pointer", padding: 0 }}>{r.name}</button>
            } />
          )}
          {s && (
            <DetailRow icon="store" label="Supplier" value={s.name} />
          )}
          {cat && <DetailRow icon={cat.icon} label="Category" value={cat.label} />}
          <DetailRow icon={method?.icon || "cash"} label="Payment method" value={method?.label || "—"} />
          {t.monthFor && <DetailRow icon="calendar" label="Month for" value={`${MONTHS[parseInt(t.monthFor.split("-")[1], 10) - 1]} ${t.monthFor.split("-")[0]}`} />}
          <DetailRow icon="calendar" label="Date of payment" value={fmtDate(t.date)} last={!t.receiptUrl} />
        </DetailPanel>

        {/* Receipt — placeholder card */}
        <div style={{ gridColumn: "1 / -1" }}>
          <DetailPanel title="Receipt">
            <div style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: 320, height: 200, border: "1.5px dashed var(--rc-outline)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--rc-fg2)" }}>
                <Icon name="receipt" size={28} />
                <div style={{ font: "500 13px " + RC_FONT }}>No receipt attached</div>
                <Btn kind="outline" size="sm" icon="upload">Upload</Btn>
              </div>
            </div>
          </DetailPanel>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction form — single + bulk
// ─────────────────────────────────────────────────────────────────────────────
function TransactionForm({ ctx, drawerProps, onClose }) {
  const editing = drawerProps?.id ? TRANSACTIONS.find(t => t.id === drawerProps.id) : null;
  const initialType = editing?.type || drawerProps?.type || null;

  // Step 1: choose type
  const [type, setType] = React.useState(initialType);
  const [mode, setMode] = React.useState("single"); // single | bulk
  const [form, setForm] = React.useState(editing || {
    propertyId: drawerProps?.propertyId || "",
    renterId: drawerProps?.renterId || "",
    method: "bank_transfer",
    date: "2026-05-15",
    monthFor: "2026-05",
  });
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Bulk state — selected renter ids with amounts
  const [bulkSelected, setBulkSelected] = React.useState(RENTERS.reduce((acc, r) => ({ ...acc, [r.id]: { checked: false, amount: r.rent } }), {}));
  const bulkCount = Object.values(bulkSelected).filter(v => v.checked).length;
  const bulkTotal = Object.entries(bulkSelected).filter(([, v]) => v.checked).reduce((s, [, v]) => s + Number(v.amount || 0), 0);

  return (
    <Drawer
      open
      onClose={onClose}
      title={editing ? `Edit ${editing.type}` : type ? (mode === "bulk" ? "Bulk record rent" : `Record ${type}`) : "Add transaction"}
      subtitle={editing ? fmtDate(editing.date) : mode === "bulk" ? "Record rent from multiple renters at once" : null}
      width={type === "revenue" && mode === "bulk" ? 760 : 640}
      footer={!type ? null : (
        <>
          <Btn kind="outline" size="md" onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" size="md" icon="check" onClick={onClose}>
            {editing ? "Save changes" : mode === "bulk" ? `Record ${bulkCount} payment${bulkCount === 1 ? "" : "s"}` : `Record ${type}`}
          </Btn>
        </>
      )}
    >
      {!type ? (
        <ChooseType onSelect={setType} />
      ) : (
        <>
          {!editing && (
            <button onClick={() => setType(null)} style={{ display: "inline-flex", alignItems: "center", gap: 5, font: "500 12px " + RC_FONT, color: "var(--rc-fg2)", background: "transparent", border: 0, cursor: "pointer", padding: 0, marginBottom: 16 }}>
              <Icon name="chevronLeft" size={13} /> Change type
            </button>
          )}

          {type === "revenue" && !editing && (
            <div style={{ marginBottom: 16 }}>
              <SegToggle
                options={[
                  { key: "single", label: "Single payment", icon: "user" },
                  { key: "bulk",   label: `Bulk · ${bulkCount} selected`, icon: "users" },
                ]}
                value={mode}
                onChange={setMode}
              />
            </div>
          )}

          {type === "revenue" && mode === "single" && <RevenueForm form={form} upd={upd} />}
          {type === "revenue" && mode === "bulk" && <BulkRevenueForm bulkSelected={bulkSelected} setBulkSelected={setBulkSelected} bulkTotal={bulkTotal} form={form} upd={upd} />}
          {type === "expense" && <ExpenseForm form={form} upd={upd} />}
        </>
      )}
    </Drawer>
  );
}

function ChooseType({ onSelect }) {
  return (
    <div>
      <p style={{ font: "400 14px " + RC_FONT, color: "var(--rc-fg2)", margin: "0 0 18px", lineHeight: 1.55 }}>
        What kind of transaction are you recording?
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <button onClick={() => onSelect("revenue")} style={{ background: "var(--rc-revenue-bg)", border: "1px solid var(--rc-outline)", borderRadius: 14, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start", cursor: "pointer", textAlign: "left" }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: "var(--rc-success)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="trendUp" size={22} />
          </div>
          <div>
            <div style={{ font: "700 16px " + RC_FONT, color: "var(--rc-revenue-fg)" }}>Revenue</div>
            <div style={{ font: "400 12.5px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 4 }}>Rent payment from a renter. Single or bulk.</div>
          </div>
        </button>
        <button onClick={() => onSelect("expense")} style={{ background: "var(--rc-expense-bg)", border: "1px solid var(--rc-outline)", borderRadius: 14, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start", cursor: "pointer", textAlign: "left" }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: "var(--rc-error)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="trendDown" size={22} />
          </div>
          <div>
            <div style={{ font: "700 16px " + RC_FONT, color: "var(--rc-expense-fg)" }}>Expense</div>
            <div style={{ font: "400 12.5px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 4 }}>Maintenance, utilities, insurance, anything else.</div>
          </div>
        </button>
      </div>
    </div>
  );
}

function RevenueForm({ form, upd }) {
  return (
    <>
      <FormSection title="Payment details">
        <Field label="Property" required>
          <Select value={form.propertyId} onChange={(v) => upd("propertyId", Number(v))} placeholder="Choose property…" options={PROPERTIES.map(p => ({ value: p.id, label: p.addr }))} />
        </Field>
        <Field label="Renter" required>
          <Select value={form.renterId} onChange={(v) => upd("renterId", Number(v))} placeholder="Choose renter…" options={(form.propertyId ? rentersOfProperty(Number(form.propertyId)) : RENTERS).map(r => ({ value: r.id, label: r.name }))} />
        </Field>
        <Field label="Amount (₪)" required>
          <Input type="number" value={form.amount || ""} onChange={(e) => upd("amount", e.target.value)} placeholder="12000" />
        </Field>
        <Field label="Date of payment" required>
          <Input type="date" value={form.date || ""} onChange={(e) => upd("date", e.target.value)} />
        </Field>
        <Field label="Month covered" required full>
          <MonthPicker value={form.monthFor} onChange={(v) => upd("monthFor", v)} />
        </Field>
      </FormSection>

      <FormSection title="Method & notes" cols={1}>
        <Field label="Payment method">
          <PaymentMethodPicker value={form.method} onChange={(v) => upd("method", v)} />
        </Field>
        <Field label="Notes">
          <Textarea value={form.notes || ""} onChange={(e) => upd("notes", e.target.value)} placeholder="Anything to remember…" />
        </Field>
      </FormSection>

      <FormSection title="Receipt" cols={1}>
        <UploadRow label="Receipt image" />
      </FormSection>
    </>
  );
}

function ExpenseForm({ form, upd }) {
  return (
    <>
      <FormSection title="Expense details">
        <Field label="Property" required>
          <Select value={form.propertyId} onChange={(v) => upd("propertyId", Number(v))} placeholder="Choose property…" options={PROPERTIES.map(p => ({ value: p.id, label: p.addr }))} />
        </Field>
        <Field label="Category" required>
          <Select value={form.categoryKey} onChange={(v) => upd("categoryKey", v)} placeholder="Choose category…" options={CATEGORIES.map(c => ({ value: c.key, label: c.label }))} />
        </Field>
        <Field label="Supplier">
          <Select value={form.supplierId} onChange={(v) => upd("supplierId", Number(v))} placeholder="Optional — no supplier" options={[{ value: "", label: "No supplier" }, ...SUPPLIERS.filter(s => s.active).filter(s => !form.categoryKey || s.categories.includes(form.categoryKey)).map(s => ({ value: s.id, label: s.name }))]} />
        </Field>
        <Field label="Amount (₪)" required>
          <Input type="number" value={form.amount || ""} onChange={(e) => upd("amount", e.target.value)} placeholder="0" />
        </Field>
        <Field label="Date" required>
          <Input type="date" value={form.date || ""} onChange={(e) => upd("date", e.target.value)} />
        </Field>
      </FormSection>

      <FormSection title="Method & notes" cols={1}>
        <Field label="Payment method">
          <PaymentMethodPicker value={form.method} onChange={(v) => upd("method", v)} />
        </Field>
        <Field label="Notes">
          <Textarea value={form.notes || ""} onChange={(e) => upd("notes", e.target.value)} placeholder="What was this for?" />
        </Field>
      </FormSection>

      <FormSection title="Receipt" cols={1}>
        <UploadRow label="Receipt image" />
      </FormSection>
    </>
  );
}

function BulkRevenueForm({ bulkSelected, setBulkSelected, bulkTotal, form, upd }) {
  const allChecked = Object.values(bulkSelected).every(v => v.checked);
  const toggleAll = () => {
    const v = !allChecked;
    setBulkSelected(Object.fromEntries(Object.entries(bulkSelected).map(([k, val]) => [k, { ...val, checked: v }])));
  };
  return (
    <>
      <FormSection title="Bulk parameters">
        <Field label="Month covered" required>
          <MonthPicker value={form.monthFor} onChange={(v) => upd("monthFor", v)} compact />
        </Field>
        <Field label="Date of payment" required>
          <Input type="date" value={form.date || ""} onChange={(e) => upd("date", e.target.value)} />
        </Field>
        <Field label="Payment method" full>
          <PaymentMethodPicker value={form.method} onChange={(v) => upd("method", v)} />
        </Field>
      </FormSection>

      <FormSection title={`Renters · ${Object.values(bulkSelected).filter(v => v.checked).length} selected · ${fmtIls(bulkTotal)}`} cols={1}>
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 4px", marginBottom: 8 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "500 12.5px " + RC_FONT, color: "var(--rc-fg1)", cursor: "pointer" }}>
              <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ width: 16, height: 16, cursor: "pointer" }} />
              Select all
            </label>
            <button onClick={() => setBulkSelected(Object.fromEntries(Object.entries(bulkSelected).map(([k, val]) => [k, { ...val, checked: false }])))} style={{ background: "transparent", border: 0, color: "var(--rc-fg2)", font: "500 12px " + RC_FONT, cursor: "pointer" }}>Clear all</button>
          </div>
          <div style={{ border: "1px solid var(--rc-outline)", borderRadius: 10, overflow: "hidden" }}>
            {RENTERS.map((r, i) => {
              const sel = bulkSelected[r.id] || { checked: false, amount: r.rent };
              const p = propertyById(r.propertyId);
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderBottom: i === RENTERS.length - 1 ? 0 : "1px solid var(--rc-outline)", background: sel.checked ? "var(--rc-revenue-bg)" : "var(--rc-surface)" }}>
                  <input type="checkbox" checked={sel.checked} onChange={(e) => setBulkSelected({ ...bulkSelected, [r.id]: { ...sel, checked: e.target.checked } })} style={{ width: 16, height: 16, cursor: "pointer" }} />
                  <Avatar name={r.name} size={32} color={r.avatarColor} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "600 13px " + RC_FONT, color: "var(--rc-fg1)" }}>{r.name}</div>
                    <div style={{ font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)" }}>{p?.addr}</div>
                  </div>
                  <input type="number" value={sel.amount} onChange={(e) => setBulkSelected({ ...bulkSelected, [r.id]: { ...sel, amount: e.target.value } })} style={{ width: 110, height: 32, padding: "0 10px", borderRadius: 7, border: "1px solid var(--rc-outline)", background: "var(--rc-surface)", font: "600 13px " + RC_FONT, color: "var(--rc-fg1)", outline: "none", textAlign: "right", fontVariantNumeric: "tabular-nums" }} />
                </div>
              );
            })}
          </div>
        </div>
      </FormSection>
    </>
  );
}

function PaymentMethodPicker({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
      {PAYMENT_METHODS.map(m => (
        <button key={m.key} type="button" onClick={() => onChange(m.key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 8px", borderRadius: 9, border: "1.5px solid " + (value === m.key ? "var(--rc-brand-navy)" : "var(--rc-outline)"), background: value === m.key ? "var(--rc-primary-container)" : "var(--rc-surface)", color: value === m.key ? "var(--rc-on-primary-ctr)" : "var(--rc-fg1)", cursor: "pointer", font: "600 12px " + RC_FONT }}>
          <Icon name={m.icon} size={18} />
          {m.label}
        </button>
      ))}
    </div>
  );
}

function MonthPicker({ value, onChange, compact }) {
  // Show months around now (Jan 2026 — Dec 2026)
  const months = [];
  for (let i = 0; i < 12; i++) months.push(`2026-${String(i + 1).padStart(2, "0")}`);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${compact ? 4 : 6}, 1fr)`, gap: 6 }}>
      {months.map(m => {
        const monthIdx = parseInt(m.split("-")[1], 10) - 1;
        const sel = value === m;
        return (
          <button key={m} type="button" onClick={() => onChange(m)} style={{ padding: "10px 0", borderRadius: 8, border: "1px solid " + (sel ? "var(--rc-brand-navy)" : "var(--rc-outline)"), background: sel ? "var(--rc-brand-navy)" : "var(--rc-surface)", color: sel ? "#fff" : "var(--rc-fg1)", font: (sel ? "700 " : "500 ") + "12px " + RC_FONT, cursor: "pointer" }}>
            {MONTHS[monthIdx]}
          </button>
        );
      })}
    </div>
  );
}

function UploadRow({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid var(--rc-outline)", borderRadius: 9 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--rc-bg)", color: "var(--rc-fg2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="receipt" size={15} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ font: "600 13px " + RC_FONT, color: "var(--rc-fg1)" }}>{label}</div>
        <div style={{ font: "400 11px " + RC_FONT, color: "var(--rc-fg2)" }}>JPG, PNG, PDF</div>
      </div>
      <Btn kind="outline" size="sm" icon="camera">Camera</Btn>
      <Btn kind="outline" size="sm" icon="paperclip">Upload</Btn>
    </div>
  );
}

Object.assign(window, { TransactionsPage, TransactionDetailPage, TransactionForm });
