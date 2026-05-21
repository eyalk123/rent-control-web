// pages-suppliers.jsx — list + add/edit form.

function SuppliersPage({ ctx }) {
  const [q, setQ] = React.useState("");
  const [showInactive, setShowInactive] = React.useState(false);

  const filtered = SUPPLIERS.filter(s => {
    if (!showInactive && !s.active) return false;
    if (q && !s.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Suppliers"
        back="Transactions"
        onBack={() => ctx.navigate("transactions")}
        meta={`${SUPPLIERS.length} total · ${SUPPLIERS.filter(s => s.active).length} active`}
        actions={
          <>
            <Btn kind="outline" size="md" icon={showInactive ? "check" : null} onClick={() => setShowInactive(!showInactive)}>
              {showInactive ? "Hiding inactive" : "Show inactive"}
            </Btn>
            <Btn kind="primary" size="md" icon="plus" onClick={() => ctx.openDrawer("supplier")}>Add supplier</Btn>
          </>
        }
      />

      <div style={{ padding: "16px 40px" }}>
        <SearchInput placeholder="Search suppliers…" value={q} onChange={setQ} width="100%" hint={null} />
      </div>

      <div style={{ padding: "0 40px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14 }}>
        {filtered.map(s => <SupplierCard key={s.id} s={s} ctx={ctx} />)}
        {filtered.length === 0 && <div style={{ gridColumn: "1 / -1" }}><Empty icon="store" title="No suppliers" /></div>}
      </div>
    </>
  );
}

function SupplierCard({ s, ctx }) {
  return (
    <button
      onClick={() => ctx.openDrawer("supplier", { id: s.id })}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--rc-fg2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rc-outline)"; }}
      style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 12, opacity: s.active ? 1 : 0.6, transition: "border-color .15s" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 9, background: "var(--rc-primary-container)", color: "var(--rc-on-primary-ctr)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="store" size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "700 14.5px " + RC_FONT, color: "var(--rc-fg1)" }}>{s.name}</div>
          <div style={{ font: "400 12px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 2 }}>{s.phone}</div>
        </div>
        {!s.active && <Pill tone="neutral">Inactive</Pill>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {s.categories.map(k => (
          <Pill key={k} tone="info">{CAT_BY_KEY[k]?.label}</Pill>
        ))}
      </div>
      {s.bank && (
        <div style={{ padding: "8px 10px", background: "var(--rc-bg)", borderRadius: 8, font: "500 11px " + RC_FONT, color: "var(--rc-fg2)", fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="bank" size={12} /> {s.bank.code}-{s.bank.branch}-{s.bank.account}
        </div>
      )}
    </button>
  );
}

// Add/edit drawer
function SupplierForm({ ctx, drawerProps, onClose }) {
  const editing = drawerProps?.id ? supplierById(drawerProps.id) : null;
  const [form, setForm] = React.useState(editing || { active: true, categories: [] });
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleCat = (k) => upd("categories", form.categories.includes(k) ? form.categories.filter(x => x !== k) : [...form.categories, k]);

  return (
    <Drawer
      open
      onClose={onClose}
      title={editing ? "Edit supplier" : "Add supplier"}
      subtitle={editing ? editing.name : "Vendors and service providers."}
      width={620}
      footer={
        <>
          <Btn kind="outline" size="md" onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" size="md" icon="check" onClick={onClose}>{editing ? "Save changes" : "Create supplier"}</Btn>
        </>
      }
    >
      <FormSection title="Basic information">
        <Field label="Name" required full>
          <Input value={form.name || ""} onChange={(e) => upd("name", e.target.value)} placeholder="e.g. CoolAir Services" />
        </Field>
        <Field label="Phone">
          <Input value={form.phone || ""} onChange={(e) => upd("phone", e.target.value)} placeholder="+972 …" />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email || ""} onChange={(e) => upd("email", e.target.value)} />
        </Field>
      </FormSection>

      <FormSection title="Categories" subtitle="Suppliers show up in the expense form filtered by these categories." cols={1}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {CATEGORIES.map(c => {
            const sel = form.categories.includes(c.key);
            return (
              <button key={c.key} type="button" onClick={() => toggleCat(c.key)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 9, border: "1.5px solid " + (sel ? "var(--rc-brand-navy)" : "var(--rc-outline)"), background: sel ? "var(--rc-primary-container)" : "var(--rc-surface)", color: sel ? "var(--rc-on-primary-ctr)" : "var(--rc-fg1)", cursor: "pointer", font: "500 12px " + RC_FONT, textAlign: "left" }}>
                <Icon name={c.icon} size={14} />
                {c.label}
              </button>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="Bank account" subtitle="For Israeli transfers.">
        <Field label="Bank code">
          <Input className="rc-mono" style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }} value={form.bank?.code || ""} onChange={(e) => upd("bank", { ...(form.bank || {}), code: e.target.value })} placeholder="012" />
        </Field>
        <Field label="Branch">
          <Input style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }} value={form.bank?.branch || ""} onChange={(e) => upd("bank", { ...(form.bank || {}), branch: e.target.value })} placeholder="841" />
        </Field>
        <Field label="Account" full>
          <Input style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }} value={form.bank?.account || ""} onChange={(e) => upd("bank", { ...(form.bank || {}), account: e.target.value })} placeholder="338-219-7" />
        </Field>
      </FormSection>

      <FormSection title="Notes & status" cols={1}>
        <Field label="Notes">
          <Textarea value={form.notes || ""} onChange={(e) => upd("notes", e.target.value)} />
        </Field>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--rc-bg)", borderRadius: 9 }}>
          <button type="button" onClick={() => upd("active", !form.active)} style={{ width: 38, height: 22, borderRadius: 999, border: 0, background: form.active ? "var(--rc-success)" : "var(--rc-outline)", position: "relative", cursor: "pointer", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 2, left: form.active ? 18 : 2, width: 18, height: 18, borderRadius: 999, background: "#fff", transition: "left .15s" }} />
          </button>
          <div>
            <div style={{ font: "600 13px " + RC_FONT, color: "var(--rc-fg1)" }}>Active</div>
            <div style={{ font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)" }}>Inactive suppliers don't show up in the expense form.</div>
          </div>
        </div>
      </FormSection>
    </Drawer>
  );
}

Object.assign(window, { SuppliersPage, SupplierForm });
