// app.jsx — main entry, router state, tweaks panel.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "sidebar":   "wide",
  "density":   "comfortable",
  "theme":     "light",
  "accent":    "navy"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Router state — { name, params }
  const [route, setRoute] = React.useState({ name: "auth", params: {} });
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [drawer, setDrawer] = React.useState(null); // { kind, props }
  const [theme, setTheme] = useTheme(t.theme);

  // Sync theme to tweak
  React.useEffect(() => { setTheme(t.theme); }, [t.theme]);
  React.useEffect(() => { if (theme !== t.theme) setTweak("theme", theme); }, [theme]);

  // Hash-based routing — lets user bookmark a page
  React.useEffect(() => {
    const apply = () => {
      const h = (location.hash || "#auth").slice(1);
      const [name, idStr] = h.split("/");
      const params = idStr ? { id: isNaN(idStr) ? idStr : Number(idStr) } : {};
      setRoute({ name: name || "auth", params });
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const navigate = (name, params) => {
    const idPart = params?.id != null ? "/" + params.id : "";
    location.hash = name + idPart;
    setRoute({ name, params: params || {} });
  };

  const openDrawer = (kind, props) => setDrawer({ kind, props: props || {} });
  const closeDrawer = () => setDrawer(null);

  const openAdd = () => {
    // Sensible default per current route
    if (route.name === "properties" || route.name === "propertyDetail") openDrawer("property");
    else if (route.name === "renters" || route.name === "renterDetail") openDrawer("renter");
    else if (route.name === "transactions" || route.name === "transactionDetail") openDrawer("transaction");
    else if (route.name === "suppliers") openDrawer("supplier");
    else openDrawer("transaction");
  };

  const ctx = {
    route,
    navigate,
    paletteOpen,
    openPalette: () => setPaletteOpen(true),
    closePalette: () => setPaletteOpen(false),
    openDrawer,
    closeDrawer,
    openAdd,
    theme,
    setTheme,
    toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
    density: t.density,
    setDensity: (v) => setTweak("density", v),
    sidebar: t.sidebar,
    setSidebar: (v) => setTweak("sidebar", v),
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setPaletteOpen(true); return; }
      if (e.key === "Escape") { setPaletteOpen(false); closeDrawer(); return; }
      // Letter shortcuts only when no input is focused
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;
      if (route.name === "auth") return;
      if (e.key === "g") setPaletteOpen(true);
      else if (e.key === "h") navigate("home");
      else if (e.key === "P") navigate("properties");
      else if (e.key === "p") openDrawer("property");
      else if (e.key === "T") navigate("renters");
      else if (e.key === "t") openDrawer("renter");
      else if (e.key === "X") navigate("transactions");
      else if (e.key === "R") openDrawer("transaction", { type: "revenue" });
      else if (e.key === "E") openDrawer("transaction", { type: "expense" });
      else if (e.key === "S") navigate("suppliers");
      else if (e.key === ",") navigate("settings");
      else if (e.key === "r") navigate("reports");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [route]);

  // Render
  if (route.name === "auth") return (
    <>
      <AuthPage ctx={ctx} />
      <RcTweaksPanel ctx={ctx} t={t} setTweak={setTweak} />
    </>
  );

  let content;
  switch (route.name) {
    case "home":               content = <HomePage ctx={ctx} />; break;
    case "properties":         content = <PropertiesPage ctx={ctx} />; break;
    case "propertyDetail":     content = <PropertyDetailPage ctx={ctx} />; break;
    case "renters":            content = <RentersPage ctx={ctx} />; break;
    case "renterDetail":       content = <RenterDetailPage ctx={ctx} />; break;
    case "transactions":       content = <TransactionsPage ctx={ctx} />; break;
    case "transactionDetail":  content = <TransactionDetailPage ctx={ctx} />; break;
    case "suppliers":          content = <SuppliersPage ctx={ctx} />; break;
    case "reports":            content = <ReportsPage ctx={ctx} />; break;
    case "reportIncomeExpense":content = <IncomeExpenseReport ctx={ctx} />; break;
    case "reportExpenseLog":   content = <ExpenseLogReport ctx={ctx} />; break;
    case "settings":           content = <SettingsPage ctx={ctx} />; break;
    default:                   content = <HomePage ctx={ctx} />; break;
  }

  return (
    <>
      <AppChrome ctx={ctx} sidebar={t.sidebar}>
        {content}
      </AppChrome>

      {/* Drawers */}
      {drawer?.kind === "property"    && <PropertyForm    ctx={ctx} drawerProps={drawer.props} onClose={closeDrawer} />}
      {drawer?.kind === "renter"      && <RenterForm      ctx={ctx} drawerProps={drawer.props} onClose={closeDrawer} />}
      {drawer?.kind === "transaction" && <TransactionForm ctx={ctx} drawerProps={drawer.props} onClose={closeDrawer} />}
      {drawer?.kind === "supplier"    && <SupplierForm    ctx={ctx} drawerProps={drawer.props} onClose={closeDrawer} />}

      <RcTweaksPanel ctx={ctx} t={t} setTweak={setTweak} />
    </>
  );
}

function RcTweaksPanel({ ctx, t, setTweak }) {
  return (
    <TweaksPanel>
      <TweakSection label="Layout" />
      <TweakRadio
        label="Sidebar"
        value={t.sidebar}
        options={["wide", "pill", "icon"]}
        onChange={(v) => setTweak("sidebar", v)}
      />
      <TweakRadio
        label="Density"
        value={t.density}
        options={["compact", "comfortable", "cozy"]}
        onChange={(v) => setTweak("density", v)}
      />
      <TweakSection label="Theme" />
      <TweakRadio
        label="Mode"
        value={t.theme}
        options={["light", "dark"]}
        onChange={(v) => setTweak("theme", v)}
      />
      <TweakSection label="Shortcuts" />
      <div style={{ font: "400 11px Inter, sans-serif", color: "var(--rc-fg2)", lineHeight: 1.7, padding: "4px 2px" }}>
        <div><kbd style={kbdStyle}>⌘K</kbd> Command palette</div>
        <div><kbd style={kbdStyle}>h</kbd> Home · <kbd style={kbdStyle}>P</kbd> Properties · <kbd style={kbdStyle}>T</kbd> Renters · <kbd style={kbdStyle}>X</kbd> Transactions</div>
        <div><kbd style={kbdStyle}>r</kbd> Reports · <kbd style={kbdStyle}>S</kbd> Suppliers · <kbd style={kbdStyle}>,</kbd> Settings</div>
        <div><kbd style={kbdStyle}>p</kbd> +property · <kbd style={kbdStyle}>t</kbd> +renter · <kbd style={kbdStyle}>R</kbd> +revenue · <kbd style={kbdStyle}>E</kbd> +expense</div>
      </div>
    </TweaksPanel>
  );
}

const kbdStyle = {
  fontFamily: "ui-monospace, Menlo, monospace",
  fontSize: 10,
  background: "var(--rc-bg)",
  border: "1px solid var(--rc-outline)",
  borderRadius: 3,
  padding: "0 4px",
  color: "var(--rc-fg1)",
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
