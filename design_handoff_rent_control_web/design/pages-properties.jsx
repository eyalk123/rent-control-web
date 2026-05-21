// pages-properties.jsx — list, detail (3 tabs), add/edit form.

// ─────────────────────────────────────────────────────────────────────────────
// Properties list
// ─────────────────────────────────────────────────────────────────────────────
function PropertiesPage({ ctx }) {
  const [q, setQ] = React.useState("");
  const [view, setView] = React.useState("card"); // card | table
  const [typeFilter, setTypeFilter] = React.useState(null);
  const [ownerFilter, setOwnerFilter] = React.useState(null);

  const filtered = PROPERTIES.filter(p => {
    if (q && !p.addr.toLowerCase().includes(q.toLowerCase()) && !p.city.toLowerCase().includes(q.toLowerCase())) return false;
    if (typeFilter && p.type !== typeFilter) return false;
    if (ownerFilter && p.owner !== ownerFilter) return false;
    return true;
  });

  const occupied = PROPERTIES.filter(p => p.status === "occupied").length;
  const totalMonthly = PROPERTIES.filter(p => p.status === "occupied").reduce((s, p) => s + p.rent, 0);

  return (
    <>
      <PageHeader
        title="Properties"
        meta={`${PROPERTIES.length} properties · ${occupied} occupied · ${fmtIls(totalMonthly)} monthly revenue`}
        actions={
          <>
            <Btn kind="outline" size="md" icon="download">Export</Btn>
            <Btn kind="primary" size="md" icon="plus" onClick={() => ctx.openDrawer("property")}>Add property</Btn>
          </>
        }
      />

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 40px", flexWrap: "wrap" }}>
        <SearchInput placeholder="Search address or city…" value={q} onChange={setQ} width={300} hint={null} />
        <FilterChip label="Type" value={typeFilter} active={!!typeFilter} onClick={() => setTypeFilter(typeFilter === "Residential" ? "Commercial" : typeFilter === "Commercial" ? null : "Residential")} onClear={() => setTypeFilter(null)} />
        <FilterChip label="Owner" value={ownerFilter} active={!!ownerFilter} onClick={() => setOwnerFilter(ownerFilter === "Eyal Kook" ? "Oded Reuven" : ownerFilter === "Oded Reuven" ? null : "Eyal Kook")} onClear={() => setOwnerFilter(null)} />
        <FilterChip label="Status" />
        <FilterChip label="City" />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <SegToggle options={[{ key: "card", label: "Cards", icon: "grid" }, { key: "table", label: "Table", icon: "list" }]} value={view} onChange={setView} />
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <Empty icon="building2" title="No properties match" hint="Adjust filters or clear your search." />
      ) : view === "card" ? (
        <div style={{ padding: "0 40px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {filtered.map(p => <PropertyCard key={p.id} p={p} ctx={ctx} />)}
        </div>
      ) : (
        <PropertyTable rows={filtered} ctx={ctx} />
      )}
    </>
  );
}

function PropertyCard({ p, ctx }) {
  const renters = rentersOfProperty(p.id);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => ctx.navigate("propertyDetail", { id: p.id })}
      onKeyDown={(e) => { if (e.key === "Enter") ctx.navigate("propertyDetail", { id: p.id }); }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--rc-fg2)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rc-outline)"; e.currentTarget.style.transform = "none"; }}
      style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 14, padding: 0, cursor: "pointer", textAlign: "left", overflow: "hidden", transition: "border-color .15s, transform .15s" }}
    >
      {/* Photo strip */}
      <div style={{ height: 120, background: p.color + "55", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
          <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" fill="rgba(255,255,255,0.55)" />
          <path d="M3 11l9-8 9 8" stroke="var(--rc-brand-navy)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        </svg>
        <div style={{ position: "absolute", top: 10, left: 12, display: "flex", gap: 6 }}>
          <Pill tone={p.status === "occupied" ? "success" : "warning"}>{p.status === "occupied" ? "Occupied" : "Vacant"}</Pill>
          <Pill tone="neutral">{p.type}</Pill>
        </div>
        <div style={{ position: "absolute", top: 10, right: 12 }}>
          <button onClick={(e) => { e.stopPropagation(); }} style={{ width: 28, height: 28, borderRadius: 8, border: 0, background: "rgba(255,255,255,0.8)", color: "var(--rc-fg1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="more" size={14} />
          </button>
        </div>
      </div>

      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ font: "700 16px " + RC_FONT, color: "var(--rc-fg1)", letterSpacing: -0.2 }}>{p.addr}</div>
        <div style={{ font: "400 12px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="mapPin" size={12} /> {p.city}, {p.zip}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--rc-outline)" }}>
          <Stat label="Rent" value={p.rent > 0 ? fmtIls(p.rent) : "—"} />
          <Stat label="Renters" value={renters.length || "—"} />
          <Stat label="Size" value={`${p.sqFt}m²`} />
        </div>

        {renters.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--rc-outline)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", marginRight: 4 }}>
              {renters.slice(0, 3).map((r, i) => (
                <div key={r.id} style={{ marginLeft: i === 0 ? 0 : -10, border: "2px solid var(--rc-surface)", borderRadius: 999 }}>
                  <Avatar name={r.name} size={26} color={r.avatarColor} />
                </div>
              ))}
            </div>
            <span style={{ font: "500 12px " + RC_FONT, color: "var(--rc-fg2)" }}>
              {renters[0].name}{renters.length > 1 ? ` +${renters.length - 1}` : ""}
            </span>
            <span style={{ marginLeft: "auto", font: "400 11px " + RC_FONT, color: "var(--rc-fg2)" }}>
              Lease ends {fmtDateShort(p.leaseEnd)}
            </span>
          </div>
        )}
        {p.status === "vacant" && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--rc-outline)", font: "500 12px " + RC_FONT, color: "var(--rc-warning)", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="alert" size={13} /> Available · est. {fmtIls(p.rent)}/mo
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ font: "500 10px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ font: "700 14px " + RC_FONT, color: "var(--rc-fg1)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function PropertyTable({ rows, ctx }) {
  const cols = [
    { key: "addr",    label: "Property", flex: 2 },
    { key: "type",    label: "Type",     w: 110 },
    { key: "owner",   label: "Owner",    w: 130 },
    { key: "renters", label: "Renters",  w: 100 },
    { key: "rent",    label: "Rent",     w: 110, align: "right" },
    { key: "leaseEnd",label: "Lease ends",w: 130 },
    { key: "status",  label: "Status",   w: 110 },
  ];
  return (
    <div style={{ padding: "0 40px 40px" }}>
      <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", padding: "10px 16px", background: "var(--rc-bg)", borderBottom: "1px solid var(--rc-outline)", font: "600 11px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.5, textTransform: "uppercase" }}>
          {cols.map(c => (
            <div key={c.key} style={{ flex: c.flex, width: c.w, textAlign: c.align || "left" }}>{c.label}</div>
          ))}
          <div style={{ width: 36 }} />
        </div>
        {rows.map((p, i) => {
          const renters = rentersOfProperty(p.id);
          return (
            <button
              key={p.id}
              onClick={() => ctx.navigate("propertyDetail", { id: p.id })}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--rc-bg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--rc-surface)"; }}
              style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: i === rows.length - 1 ? 0 : "1px solid var(--rc-outline)", background: "var(--rc-surface)", border: 0, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomStyle: "solid", borderBottomColor: "var(--rc-outline)", cursor: "pointer", textAlign: "left", width: "100%", font: "400 13px " + RC_FONT, color: "var(--rc-fg1)" }}
            >
              <div style={{ flex: cols[0].flex, display: "flex", alignItems: "center", gap: 10 }}>
                <PropTile property={p} size={32} />
                <div>
                  <div style={{ font: "600 13.5px " + RC_FONT, color: "var(--rc-fg1)" }}>{p.addr}</div>
                  <div style={{ font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)" }}>{p.city}, {p.zip}</div>
                </div>
              </div>
              <div style={{ width: cols[1].w }}>{p.type}</div>
              <div style={{ width: cols[2].w, color: "var(--rc-fg2)" }}>{p.owner}</div>
              <div style={{ width: cols[3].w, color: "var(--rc-fg2)" }}>{renters.length}</div>
              <div style={{ width: cols[4].w, textAlign: "right", font: "600 13px " + RC_FONT, fontVariantNumeric: "tabular-nums" }}>{p.rent > 0 ? fmtIls(p.rent) : "—"}</div>
              <div style={{ width: cols[5].w, color: "var(--rc-fg2)" }}>{fmtDateShort(p.leaseEnd)}</div>
              <div style={{ width: cols[6].w }}>
                <Pill tone={p.status === "occupied" ? "success" : "warning"}>{p.status === "occupied" ? "Occupied" : "Vacant"}</Pill>
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
// Property detail — 3 tabs
// ─────────────────────────────────────────────────────────────────────────────
function PropertyDetailPage({ ctx }) {
  const id = ctx.route.params?.id;
  const p = propertyById(id);
  const [tab, setTab] = React.useState("info");

  if (!p) return <Empty title="Property not found" />;

  const renters = rentersOfProperty(p.id);
  const txs = txOfProperty(p.id);
  const revTotal = txs.filter(t => t.type === "revenue").reduce((s, t) => s + t.amount, 0);
  const expTotal = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <>
      {/* Hero */}
      <div style={{ background: p.color + "33", borderBottom: "1px solid var(--rc-outline)", padding: "24px 40px 0" }}>
        <button onClick={() => ctx.navigate("properties")} style={{ display: "inline-flex", alignItems: "center", gap: 5, font: "500 12px " + RC_FONT, color: "var(--rc-fg2)", background: "transparent", border: 0, cursor: "pointer", padding: 0, marginBottom: 14 }}>
          <Icon name="chevronLeft" size={14} /> All properties
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <PropTile property={p} size={84} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <Pill tone={p.status === "occupied" ? "success" : "warning"} size="lg">{p.status === "occupied" ? "Occupied" : "Vacant"}</Pill>
                <Pill tone="neutral" size="lg">{p.type}</Pill>
              </div>
              <h1 style={{ font: "700 32px " + RC_FONT, letterSpacing: -0.7, margin: 0, color: "var(--rc-fg1)" }}>{p.addr}</h1>
              <div style={{ font: "400 14px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="mapPin" size={13} /> {p.city}, {p.zip} · Owned by {p.owner}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="outline" size="md" icon="copy">Copy address</Btn>
            <Btn kind="outline" size="md" icon="pencil" onClick={() => ctx.openDrawer("property", { id: p.id })}>Edit</Btn>
            <Btn kind="primary" size="md" icon="plus" onClick={() => ctx.openDrawer("transaction", { propertyId: p.id })}>Add transaction</Btn>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, marginTop: 28, paddingTop: 18, paddingBottom: 18, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <HeroStat label="Monthly rent" value={fmtIls(p.rent)} />
          <HeroStat label="Size" value={`${p.sqFt}m²`} sub={`${p.beds}BR · ${p.baths}BA`} />
          <HeroStat label="Annual revenue" value={fmtIls(revTotal * 4)} sub="trailing 12 mo" tone="success" />
          <HeroStat label="Annual expenses" value={fmtIls(expTotal * 4)} sub="trailing 12 mo" tone="danger" />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0 }}>
          {[{ k: "info", l: "Details" }, { k: "renters", l: `Renters (${renters.length})` }, { k: "transactions", l: `Transactions (${txs.length})` }, { k: "documents", l: "Documents" }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: "12px 18px", background: "transparent", border: 0, borderBottom: tab === t.k ? "2px solid var(--rc-brand-navy)" : "2px solid transparent", color: tab === t.k ? "var(--rc-brand-navy)" : "var(--rc-fg2)", font: (tab === t.k ? "700 " : "500 ") + "13px " + RC_FONT, cursor: "pointer", marginBottom: -1 }}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: "28px 40px 40px" }}>
        {tab === "info" && <PropertyInfo p={p} />}
        {tab === "renters" && <PropertyRenters p={p} renters={renters} ctx={ctx} />}
        {tab === "transactions" && <PropertyTx p={p} txs={txs} ctx={ctx} />}
        {tab === "documents" && <PropertyDocs p={p} />}
      </div>
    </>
  );
}

function HeroStat({ label, value, sub, tone }) {
  const c = tone === "success" ? "var(--rc-success)" : tone === "danger" ? "var(--rc-error)" : "var(--rc-fg1)";
  return (
    <div>
      <div style={{ font: "500 10.5px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ font: "700 22px " + RC_FONT, color: c, letterSpacing: -0.4, marginTop: 5, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function PropertyInfo({ p }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      <DetailPanel title="Basic info">
        <DetailRow icon="mapPin"  label="Address"    value={`${p.addr}, ${p.city} ${p.zip}`} />
        <DetailRow icon="building2" label="Type"     value={p.type} />
        <DetailRow icon="user"    label="Owner"      value={p.owner} />
        <DetailRow icon="ruler"   label="Size"       value={`${p.sqFt}m²`} />
        <DetailRow icon="users"   label="Bedrooms"   value={`${p.beds}`} last={p.type !== "Residential"} />
        {p.type === "Residential" && <DetailRow icon="droplet" label="Bathrooms" value={`${p.baths}`} last />}
      </DetailPanel>

      <DetailPanel title="Utilities & numbers">
        <DetailRow icon="car"     label="Parking"        value={p.parking.length ? p.parking.join(", ") : "—"} />
        <DetailRow icon="bolt"    label="Electric meter" value={p.elecMeter.length ? p.elecMeter.join(", ") : "—"} />
        <DetailRow icon="droplet" label="Water meter"    value={p.waterMeter.length ? p.waterMeter.join(", ") : "—"} />
        <DetailRow icon="flame"   label="Gas meter"      value={p.gasMeter.length ? p.gasMeter.join(", ") : "—"} last />
      </DetailPanel>

      <DetailPanel title="Fees">
        <DetailRow icon="doc"        label="Annual property tax" value={fmtIls(p.propertyTax)} />
        <DetailRow icon="briefcase"  label="House committee"     value={p.committee ? `${fmtIls(p.committee)}/mo` : "—"} last />
      </DetailPanel>

      <DetailPanel title="Inventory notes">
        <div style={{ padding: "14px 16px", font: "400 13px " + RC_FONT, color: "var(--rc-fg1)", lineHeight: 1.55 }}>
          {p.inventory || <span style={{ color: "var(--rc-fg2)" }}>No inventory notes yet.</span>}
        </div>
      </DetailPanel>
    </div>
  );
}

function PropertyRenters({ p, renters, ctx }) {
  if (renters.length === 0) {
    return <Empty icon="users" title="No renters yet" hint="Add a renter to start tracking lease and payments." action={<Btn kind="primary" size="md" icon="plus" onClick={() => ctx.openDrawer("renter", { propertyId: p.id })}>Add renter</Btn>} />;
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14 }}>
      {renters.map(r => <RenterMiniCard key={r.id} r={r} ctx={ctx} />)}
    </div>
  );
}

function RenterMiniCard({ r, ctx }) {
  const d = daysUntil(r.leaseEnd);
  return (
    <button onClick={() => ctx.navigate("renterDetail", { id: r.id })} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%" }}>
      <Avatar name={r.name} size={44} color={r.avatarColor} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ font: "700 14px " + RC_FONT, color: "var(--rc-fg1)" }}>{r.name}</div>
          <Pill tone={r.status === "overdue" ? "danger" : r.status === "expiring" ? "warning" : "success"}>
            {r.status === "active" ? "Active" : r.status === "overdue" ? "Overdue" : "Expiring"}
          </Pill>
        </div>
        <div style={{ font: "400 12px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 2 }}>
          {fmtIls(r.rent)}/mo · Lease ends in {d} days
        </div>
      </div>
      <Icon name="chevron" size={15} color="var(--rc-placeholder)" />
    </button>
  );
}

function PropertyTx({ p, txs, ctx }) {
  if (txs.length === 0) return <Empty icon="wallet" title="No transactions yet" />;
  return (
    <div style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 12, overflow: "hidden" }}>
      {txs.map((t, i) => <TxRow key={t.id} t={t} ctx={ctx} last={i === txs.length - 1} />)}
    </div>
  );
}

function PropertyDocs({ p }) {
  const docs = [
    { name: "Basic contract.pdf",     size: "138 KB", date: "12 Jun 2025" },
    { name: "Full lease — May.pdf",   size: "640 KB", date: "14 May 2024" },
    { name: "Land registry.pdf",      size: "82 KB",  date: "01 Jan 2023" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
      <DetailPanel title="Documents">
        <div style={{ padding: 8 }}>
          {docs.map((d, i) => (
            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 9, borderBottom: i === docs.length - 1 ? 0 : "1px solid var(--rc-outline)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--rc-expense-bg)", color: "var(--rc-expense-fg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="filePdf" size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ font: "600 13px " + RC_FONT, color: "var(--rc-fg1)" }}>{d.name}</div>
                <div style={{ font: "400 11px " + RC_FONT, color: "var(--rc-fg2)" }}>{d.size} · uploaded {d.date}</div>
              </div>
              <Btn kind="ghost" size="sm" icon="download">Download</Btn>
            </div>
          ))}
        </div>
      </DetailPanel>
      <DetailPanel title="Upload new">
        <div style={{ padding: 16 }}>
          <div style={{ border: "1.5px dashed var(--rc-outline)", borderRadius: 12, padding: "26px 16px", textAlign: "center", color: "var(--rc-fg2)" }}>
            <Icon name="upload" size={22} style={{ margin: "0 auto 8px" }} />
            <div style={{ font: "600 13px " + RC_FONT, color: "var(--rc-fg1)" }}>Drop files here</div>
            <div style={{ font: "400 12px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 4 }}>PDF, JPG, PNG up to 10 MB</div>
            <div style={{ marginTop: 12 }}>
              <Btn kind="outline" size="sm" icon="paperclip">Choose file</Btn>
            </div>
          </div>
        </div>
      </DetailPanel>
    </div>
  );
}

// Shared bits used by detail pages
function DetailPanel({ title, right, children }) {
  return (
    <section style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 14, overflow: "hidden" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--rc-outline)" }}>
        <div style={{ font: "700 14px " + RC_FONT, color: "var(--rc-fg1)" }}>{title}</div>
        {right}
      </header>
      <div>{children}</div>
    </section>
  );
}

function DetailRow({ icon, iconColor = "var(--rc-brand-navy)", label, value, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: last ? 0 : "1px solid var(--rc-outline)" }}>
      <Icon name={icon} size={16} color={iconColor} stroke={1.6} />
      <span style={{ flex: 1, font: "500 13px " + RC_FONT, color: "var(--rc-fg2)" }}>{label}</span>
      <span style={{ font: "600 13px " + RC_FONT, color: "var(--rc-fg1)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function TxRow({ t, ctx, last }) {
  const isRev = t.type === "revenue";
  const p = propertyById(t.propertyId);
  return (
    <button
      onClick={() => ctx.navigate("transactionDetail", { id: t.id })}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--rc-bg)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--rc-surface)"; }}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: last ? 0 : "1px solid var(--rc-outline)", borderBottomWidth: last ? 0 : 1, borderBottomStyle: "solid", borderBottomColor: "var(--rc-outline)", background: "var(--rc-surface)", border: 0, cursor: "pointer", textAlign: "left", width: "100%" }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 8, background: isRev ? "var(--rc-revenue-bg)" : "var(--rc-expense-bg)", color: isRev ? "var(--rc-revenue-fg)" : "var(--rc-expense-fg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={isRev ? "trendUp" : "trendDown"} size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: "600 13px " + RC_FONT, color: "var(--rc-fg1)" }}>{t.party}</div>
        <div style={{ font: "400 11.5px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 1 }}>
          {isRev ? "Rent" : CAT_BY_KEY[t.categoryKey]?.label} · {p?.addr}
        </div>
      </div>
      <div style={{ font: "400 12px " + RC_FONT, color: "var(--rc-fg2)", whiteSpace: "nowrap" }}>{fmtDateShort(t.date)}</div>
      <div style={{ width: 110, textAlign: "right", font: "600 13.5px " + RC_FONT, color: isRev ? "var(--rc-revenue-fg)" : "var(--rc-expense-fg)", fontVariantNumeric: "tabular-nums" }}>
        {isRev ? "+" : "−"}{t.amount.toLocaleString()}₪
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Property form (add/edit) — drawer
// ─────────────────────────────────────────────────────────────────────────────
function PropertyForm({ ctx, drawerProps, onClose }) {
  const editing = drawerProps?.id ? propertyById(drawerProps.id) : null;
  const [form, setForm] = React.useState(editing || { type: "Residential", owner: "Eyal Kook", color: "#A8B7C9" });
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Drawer
      open
      onClose={onClose}
      title={editing ? "Edit property" : "Add property"}
      subtitle={editing ? `Updating ${editing.addr}` : "All you need to start tracking rent and expenses."}
      width={620}
      footer={
        <>
          <Btn kind="outline" size="md" onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" size="md" icon="check" onClick={onClose}>{editing ? "Save changes" : "Create property"}</Btn>
        </>
      }
    >
      <FormSection title="Basic information">
        <Field label="Owner" required full>
          <Select value={form.owner} onChange={(v) => upd("owner", v)} options={[
            { value: "Eyal Kook", label: "Eyal Kook" },
            { value: "Oded Reuven", label: "Oded Reuven" },
            { value: "__new", label: "+ Add new owner…" },
          ]} />
        </Field>
        <Field label="Property type" required>
          <Select value={form.type} onChange={(v) => upd("type", v)} options={[
            { value: "Residential", label: "Residential" },
            { value: "Commercial", label: "Commercial" },
          ]} />
        </Field>
        <Field label="Status">
          <Select value={form.status || "vacant"} onChange={(v) => upd("status", v)} options={[
            { value: "vacant", label: "Vacant" },
            { value: "occupied", label: "Occupied" },
          ]} />
        </Field>
        <Field label="Address" required full>
          <Input value={form.addr || ""} onChange={(e) => upd("addr", e.target.value)} placeholder="e.g. 87 Maple Street" />
        </Field>
        <Field label="City" required>
          <Input value={form.city || ""} onChange={(e) => upd("city", e.target.value)} placeholder="Tel Aviv" />
        </Field>
        <Field label="Zip code">
          <Input value={form.zip || ""} onChange={(e) => upd("zip", e.target.value)} placeholder="62193" />
        </Field>
      </FormSection>

      <FormSection title="Additional details">
        <Field label="Size (m²)">
          <Input type="number" value={form.sqFt || ""} onChange={(e) => upd("sqFt", e.target.value)} placeholder="92" />
        </Field>
        <Field label="Monthly rent (₪)">
          <Input type="number" value={form.rent || ""} onChange={(e) => upd("rent", e.target.value)} placeholder="12000" />
        </Field>
        <Field label="Bedrooms">
          <Input type="number" value={form.beds || ""} onChange={(e) => upd("beds", e.target.value)} placeholder="2" />
        </Field>
        <Field label="Bathrooms">
          <Input type="number" value={form.baths || ""} onChange={(e) => upd("baths", e.target.value)} placeholder="1" />
        </Field>
        <Field label="Parking spots" full>
          <ChipInput placeholder="Add parking number…" />
        </Field>
        <Field label="Electric meter numbers" full>
          <ChipInput placeholder="Add meter number…" />
        </Field>
        <Field label="Water meter numbers">
          <ChipInput placeholder="Add meter number…" />
        </Field>
        <Field label="Gas meter numbers">
          <ChipInput placeholder="Add meter number…" />
        </Field>
        <Field label="Annual property tax (₪)">
          <Input type="number" value={form.propertyTax || ""} onChange={(e) => upd("propertyTax", e.target.value)} placeholder="4200" />
        </Field>
        <Field label="House committee fee (₪/mo)">
          <Input type="number" value={form.committee || ""} onChange={(e) => upd("committee", e.target.value)} placeholder="120" />
        </Field>
        <Field label="Inventory notes" full>
          <Textarea value={form.inventory || ""} onChange={(e) => upd("inventory", e.target.value)} placeholder="Furnished items, condition, anything to remember…" />
        </Field>
      </FormSection>

      <FormSection title="Photo">
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ font: "500 12px " + RC_FONT, color: "var(--rc-fg2)", marginBottom: 8 }}>Choose a preset or upload</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8 }}>
            {["#A8B7C9","#9DB5C1","#D6B68A","#B7C9A8","#C9A8B7","#B6A8C9","#E8C29A","#94B0B7"].map(c => (
              <button key={c} type="button" onClick={() => upd("color", c)} style={{ height: 56, borderRadius: 10, border: form.color === c ? "2px solid var(--rc-brand-navy)" : "1px solid var(--rc-outline)", background: c + "55", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 11l9-8 9 8v10H3z" fill={c} stroke="var(--rc-brand-navy)" strokeWidth="1.5" /></svg>
              </button>
            ))}
          </div>
        </div>
      </FormSection>

      <FormSection title="Documents">
        <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
          <UploadRow label="Basic contract" />
          <UploadRow label="Full contract" />
          <UploadRow label="Land registry" />
          <button type="button" style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", background: "transparent", border: "1px dashed var(--rc-outline)", borderRadius: 9, color: "var(--rc-primary)", font: "500 12px " + RC_FONT, cursor: "pointer" }}>
            <Icon name="plus" size={14} /> Add custom file
          </button>
        </div>
      </FormSection>
    </Drawer>
  );
}

function ChipInput({ placeholder }) {
  const [chips, setChips] = React.useState([]);
  const [val, setVal] = React.useState("");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "6px 8px", border: "1px solid var(--rc-outline)", borderRadius: 8, background: "var(--rc-surface)", minHeight: 38 }}>
      {chips.map((c, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "var(--rc-bg)", borderRadius: 6, font: "500 12px " + RC_FONT, color: "var(--rc-fg1)" }}>
          {c}<button onClick={() => setChips(chips.filter((_, j) => j !== i))} style={{ background: "transparent", border: 0, color: "var(--rc-fg2)", cursor: "pointer", padding: 0, display: "inline-flex" }}><Icon name="x" size={11} /></button>
        </span>
      ))}
      <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { setChips([...chips, val.trim()]); setVal(""); e.preventDefault(); } }} placeholder={placeholder} style={{ flex: 1, minWidth: 100, border: 0, outline: "none", padding: "4px", font: "400 13px " + RC_FONT, color: "var(--rc-fg1)", background: "transparent" }} />
    </div>
  );
}

function UploadRow({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid var(--rc-outline)", borderRadius: 9 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--rc-bg)", color: "var(--rc-fg2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="filePdf" size={15} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ font: "600 13px " + RC_FONT, color: "var(--rc-fg1)" }}>{label}</div>
        <div style={{ font: "400 11px " + RC_FONT, color: "var(--rc-fg2)" }}>Not uploaded</div>
      </div>
      <Btn kind="outline" size="sm" icon="upload">Upload</Btn>
    </div>
  );
}

Object.assign(window, { PropertiesPage, PropertyDetailPage, PropertyForm, DetailPanel, DetailRow, TxRow });
