// shared.jsx — icons, mock data, primitives, app chrome, router.
// Everything in here is shared across every page. Each page is a function
// that takes a `ctx` (router + actions) and returns its UI.

// ─────────────────────────────────────────────────────────────────────────────
// Icons — Lucide-style strokes. MaterialCommunityIcons names where the design
// system uses them.
// ─────────────────────────────────────────────────────────────────────────────
function Icon({ name, size = 18, color = "currentColor", stroke = 1.6, style, className }) {
  const p = ICON_PATHS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, display: "block", ...style }}
      className={className}
      aria-hidden="true"
    >
      {p || <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}

const ICON_PATHS = {
  home:        <><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></>,
  building:    <><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-4h4v4"/></>,
  building2:   <><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21V12h6v9"/><path d="M3 21h18"/></>,
  users:       <><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="9" r="3"/><path d="M14.5 14.5c2.5 0 7.5 1.5 7.5 5.5"/></>,
  user:        <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></>,
  wallet:      <><path d="M3 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 7V6a2 2 0 0 1 2-2h11"/><circle cx="16.5" cy="13.5" r="1.2"/></>,
  cog:         <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></>,
  plus:        <><path d="M12 5v14M5 12h14"/></>,
  minus:       <><path d="M5 12h14"/></>,
  search:      <><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></>,
  chevron:     <><path d="m9 6 6 6-6 6"/></>,
  chevronLeft: <><path d="m15 6-6 6 6 6"/></>,
  chevronDown: <><path d="m6 9 6 6 6-6"/></>,
  chevronUp:   <><path d="m6 15 6-6 6 6"/></>,
  pencil:      <><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></>,
  x:           <><path d="M18 6 6 18M6 6l12 12"/></>,
  check:       <><path d="M20 6 9 17l-5-5"/></>,
  trash:       <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>,
  trendUp:     <><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></>,
  trendDown:   <><path d="M3 7l6 6 4-4 8 8"/><path d="M14 17h7v-7"/></>,
  arrowUp:     <><path d="M12 19V5M5 12l7-7 7 7"/></>,
  arrowDown:   <><path d="M12 5v14M19 12l-7 7-7-7"/></>,
  arrowRight:  <><path d="M5 12h14M13 5l7 7-7 7"/></>,
  arrowLeft:   <><path d="M19 12H5M12 19l-7-7 7-7"/></>,
  bell:        <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21a2 2 0 0 0 4 0"/></>,
  filter:      <><path d="M3 4h18l-7 9v6l-4 2v-8z"/></>,
  sort:        <><path d="M3 6h18M6 12h12M10 18h4"/></>,
  grid:        <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  list:        <><path d="M3 6h18M3 12h18M3 18h18"/></>,
  rows:        <><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/></>,
  download:    <><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></>,
  upload:      <><path d="M12 21V9M7 14l5-5 5 5M5 3h14"/></>,
  calendar:    <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>,
  clock:       <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  phone:       <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.91.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></>,
  mail:        <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  mapPin:      <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
  more:        <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
  alert:       <><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></>,
  receipt:     <><path d="M4 3h16v18l-3-2-2 2-2-2-2 2-2-2-2 2-3-2zM8 7h8M8 11h8M8 15h5"/></>,
  doc:         <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></>,
  ruler:       <><path d="M3 11l4-4 14 14-4 4z"/><path d="M8 8l1.5 1.5M11 11l1.5 1.5M14 14l1.5 1.5M17 17l1.5 1.5"/></>,
  car:         <><path d="M5 17v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2M15 17v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2"/><path d="M3 17h18l-1.5-5.5a2 2 0 0 0-2-1.5h-9a2 2 0 0 0-2 1.5L3 17z"/><circle cx="7.5" cy="15" r="1"/><circle cx="16.5" cy="15" r="1"/></>,
  bolt:        <><path d="m13 2-9 12h7l-1 8 9-12h-7z"/></>,
  droplet:     <><path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z"/></>,
  flame:       <><path d="M12 2c0 4-5 5-5 10a5 5 0 0 0 10 0c0-2-1-3-2-4 0 2-1 3-2 3 0-3 1-5-1-9z"/></>,
  briefcase:   <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
  shield:      <><path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5z"/></>,
  hash:        <><path d="M10 3 8 21M16 3l-2 18M3 8h18M3 16h18"/></>,
  sun:         <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
  moon:        <><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></>,
  monitor:     <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>,
  globe:       <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
  logout:      <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l-5-5 5-5M5 12h13"/></>,
  google:      <><path d="M21.6 12.2c0-.6-.1-1.3-.2-1.9H12v3.6h5.4c-.2 1.2-.9 2.3-2 3v2.4h3.2c1.9-1.7 3-4.3 3-7.1z"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.4c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.5C4.7 19.8 8.1 22 12 22z"/><path d="M6.4 14.1c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.6H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.4z"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 3.1 14.7 2 12 2 8.1 2 4.7 4.2 3.1 7.6l3.3 2.5C7.2 7.7 9.4 6 12 6z"/></>,
  bit:         <><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9h4a2 2 0 1 1 0 4H9v4h4.5a2.5 2.5 0 1 0 0-5"/></>,
  cash:        <><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M5 9v6M19 9v6"/></>,
  bank:        <><path d="M3 21h18M3 10h18M5 10V8l7-5 7 5v2M6 10v8M10 10v8M14 10v8M18 10v8"/></>,
  check2:      <><path d="M20 6 9 17l-5-5"/></>,
  copy:        <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
  share:       <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5"/></>,
  star:        <><path d="m12 2 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z"/></>,
  command:     <><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></>,
  camera:      <><path d="M2 7h4l2-3h8l2 3h4v13H2z"/><circle cx="12" cy="13" r="4"/></>,
  paperclip:   <><path d="m21 11-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 1 1-3-3l8-8"/></>,
  store:       <><path d="M3 9l1-5h16l1 5M3 9v11h18V9M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3 1.3 3 3 3 3-1.3 3-3 1.3 3 3 3 3-1.3 3-3"/></>,
  drop:        <><path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z"/></>,
  key:         <><circle cx="8" cy="15" r="4"/><path d="m10.9 12.1 8.6-8.6 2 2-2 2 1.5 1.5-2 2-1.5-1.5L15 11.5"/></>,
  fileExcel:   <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13l6 6M15 13l-6 6"/></>,
  filePdf:     <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 14h2a1 1 0 1 1 0 2H8zm0 5h2M13 14v5M16 14v5M13 17h3"/></>,
  pieChart:    <><path d="M21 15.5A9 9 0 1 1 8.5 3v9h12.5z"/><path d="M14 3a9 9 0 0 1 7 7h-7z"/></>,
  barChart:    <><path d="M3 21V8M9 21V3M15 21v-7M21 21v-12"/></>,
  zap:         <><path d="m13 2-9 12h7l-1 8 9-12h-7z"/></>,
  contacts:    <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M6 21a6 6 0 0 1 12 0"/></>,
  sms:         <><path d="M3 5h18v12H7l-4 4z"/></>,
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────
const RC_FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const fmtIls = (n) => Math.abs(n).toLocaleString("en-US") + "\u20AA";
const fmtSigned = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toLocaleString("en-US") + "\u20AA";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${parseInt(day,10)} ${MONTHS[parseInt(m,10)-1]} ${y}`;
};
const fmtDateShort = (d) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${parseInt(day,10)} ${MONTHS[parseInt(m,10)-1]}`;
};
const TODAY = new Date("2026-05-15");
const daysUntil = (d) => {
  if (!d) return null;
  return Math.round((new Date(d) - TODAY) / 86400000);
};
const initials = (n) => n.split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────
const PROPERTIES = [
  { id: 1, addr: "87 Maple Street",    city: "Tel Aviv",  type: "Residential", size: 92,  rent: 12000, beds: 2, baths: 1, status: "occupied", renters: 2, leaseEnd: "2026-08-31", color: "#9DB5C1", zip: "62193",  owner: "Eyal Kook",  parking: ["P-08"],            elecMeter: ["441-77"], waterMeter: ["812-A"], gasMeter: ["G-22"],  propertyTax: 4200, committee: 120, sqFt: 92, inventory: "Fully furnished — bed, sofa, dining set, fridge, washer." },
  { id: 2, addr: "3310 Sunset Blvd",   city: "Tel Aviv",  type: "Residential", size: 110, rent: 14500, beds: 3, baths: 2, status: "vacant",   renters: 0, leaseEnd: null,         color: "#D6B68A", zip: "63812",  owner: "Eyal Kook",  parking: [],                  elecMeter: [],         waterMeter: [],         gasMeter: [],        propertyTax: 5400, committee: 240, sqFt: 110, inventory: "Unfurnished. Built-in kitchen only." },
  { id: 3, addr: "22 Harbor View Rd",  city: "Haifa",     type: "Commercial",  size: 240, rent: 22000, beds: 0, baths: 2, status: "occupied", renters: 1, leaseEnd: "2027-01-15", color: "#B7C9A8", zip: "33093",  owner: "Oded Reuven", parking: ["3 spaces"],        elecMeter: ["903-AC"], waterMeter: [],         gasMeter: [],        propertyTax: 9600, committee: 0,   sqFt: 240, inventory: "Open-plan ground floor commercial." },
  { id: 4, addr: "509 Elm Court",      city: "Ramat Gan", type: "Residential", size: 65,  rent: 8200,  beds: 1, baths: 1, status: "vacant",   renters: 0, leaseEnd: null,         color: "#C9A8B7", zip: "52301",  owner: "Eyal Kook",  parking: [],                  elecMeter: [],         waterMeter: [],         gasMeter: [],        propertyTax: 2900, committee: 95,  sqFt: 65, inventory: "Partly furnished. Bed and built-in closets." },
  { id: 5, addr: "142 Birchwood Lane", city: "Tel Aviv",  type: "Residential", size: 130, rent: 12000, beds: 4, baths: 3, status: "occupied", renters: 1, leaseEnd: "2026-05-31", color: "#A8B7C9", zip: "61244",  owner: "Oded Reuven", parking: ["A-12","B-34"],     elecMeter: ["999"],    waterMeter: ["712-B"], gasMeter: ["G-141"], propertyTax: 5800, committee: 210, sqFt: 130, inventory: "Fully furnished family apartment." },
  { id: 6, addr: "401 Cedar Ave",      city: "Herzliya",  type: "Residential", size: 88,  rent: 11500, beds: 2, baths: 1, status: "occupied", renters: 1, leaseEnd: "2026-12-01", color: "#B6A8C9", zip: "46307",  owner: "Eyal Kook",  parking: ["C-04"],            elecMeter: ["307-K"],  waterMeter: ["205-X"], gasMeter: [],        propertyTax: 4100, committee: 140, sqFt: 88, inventory: "Furnished with bed, sofa, dining set." },
];

const RENTERS = [
  { id: 1, name: "Maya Thornton",  phone: "+972 50 238 4729", email: "maya@example.com",    propertyId: 5, rent: 12000, leaseStart: "2024-06-01", leaseEnd: "2026-05-31", balance: 0,    status: "expiring",
    payType: "Bank transfer", payDay: 23, avatarColor: "#C9A8B7",
    insurance: { company: "Migdal", policy: "MG-94120", expiry: "2026-06-01" },
    extras: [{ name: "Daniel Thornton", phone: "+972 50 555 1818" }],
    leaseYears: [
      { range: "24-25", amount: 11500, kind: "Contract" },
      { range: "25-26", amount: 12000, kind: "Contract", current: true },
      { range: "26-27", amount: 12500, kind: "Option" },
      { range: "27-28", amount: 13000, kind: "Option" },
    ] },
  { id: 2, name: "Daniel Okafor",  phone: "+972 52 729 3815", email: "daniel@example.com",  propertyId: 6, rent: 11500, leaseStart: "2023-09-15", leaseEnd: "2026-12-01", balance: 0,    status: "active",
    payType: "Standing order", payDay: 1, avatarColor: "#A8B7C9",
    insurance: { company: "Harel", policy: "HR-72319", expiry: "2027-01-12" },
    extras: [],
    leaseYears: [
      { range: "23-24", amount: 10800, kind: "Contract" },
      { range: "24-25", amount: 11000, kind: "Contract" },
      { range: "25-26", amount: 11500, kind: "Contract", current: true },
    ] },
  { id: 3, name: "Carlos Reyes",   phone: "+972 54 376 2481", email: "carlos@example.com",  propertyId: 1, rent: 12000, leaseStart: "2025-02-10", leaseEnd: "2026-08-31", balance: -400, status: "overdue",
    payType: "Cash", payDay: 5, avatarColor: "#D6B68A",
    insurance: null, extras: [{ name: "Maria Reyes", phone: "+972 54 990 1212" }],
    leaseYears: [
      { range: "25-26", amount: 12000, kind: "Contract", current: true },
      { range: "26-27", amount: 12500, kind: "Option" },
    ] },
  { id: 4, name: "Priya Nambiar",  phone: "+972 53 354 9307", email: "priya@example.com",   propertyId: 1, rent: 10000, leaseStart: "2024-11-22", leaseEnd: "2026-06-30", balance: 0,    status: "expiring",
    payType: "Bank transfer", payDay: 1, avatarColor: "#B7C9A8",
    insurance: { company: "Phoenix", policy: "PX-31908", expiry: "2026-07-01" },
    extras: [],
    leaseYears: [
      { range: "24-25", amount: 9600,  kind: "Contract" },
      { range: "25-26", amount: 10000, kind: "Contract", current: true },
    ] },
  { id: 5, name: "Northshore Co.", phone: "+972 4 810 2244",  email: "ops@northshore.co.il",propertyId: 3, rent: 22000, leaseStart: "2024-02-01", leaseEnd: "2027-01-15", balance: 0,    status: "active",
    payType: "Wire", payDay: 10, avatarColor: "#9DB5C1",
    insurance: { company: "Clal", policy: "CL-88112", expiry: "2027-02-01" },
    extras: [{ name: "Avi Frenkel (CFO)", phone: "+972 50 222 1100" }],
    leaseYears: [
      { range: "24-25", amount: 20000, kind: "Contract" },
      { range: "25-26", amount: 21000, kind: "Contract" },
      { range: "26-27", amount: 22000, kind: "Contract", current: true },
      { range: "27-28", amount: 23000, kind: "Option" },
    ] },
];

const SUPPLIERS = [
  { id: 1, name: "CoolAir Services",      phone: "+972 3 555 1010", email: "service@coolair.co.il",  categories: ["air_conditioning","repairs"], active: true,  notes: "Annual A/C servicing contract.", bank: { code: "012", branch: "841", account: "338-219-7" } },
  { id: 2, name: "City Plumbing",         phone: "+972 50 200 4477",email: "shay@cityplumbing.co.il",categories: ["repairs","water"],            active: true,  notes: "",                                bank: null },
  { id: 3, name: "Brightline Electric",   phone: "+972 4 660 9087", email: "info@brightline.co.il",  categories: ["electricity","repairs"],      active: true,  notes: "",                                bank: { code: "010", branch: "204", account: "990-117-3" } },
  { id: 4, name: "Green Hands Gardening", phone: "+972 52 919 2231",email: "noa@greenhands.co.il",   categories: ["gardening"],                  active: true,  notes: "",                                bank: null },
  { id: 5, name: "Sparkle Cleaning",      phone: "+972 50 412 9080",email: "team@sparkleclean.co.il",categories: ["cleaning"],                    active: false, notes: "Inactive — switched provider.",   bank: null },
  { id: 6, name: "Bituach Yashir",        phone: "+972 3 800 0000", email: "claims@bituach.co.il",   categories: ["insurance"],                  active: true,  notes: "",                                bank: { code: "012", branch: "112", account: "550-220-1" } },
];

const CATEGORIES = [
  { key: "maintenance",      label: "Maintenance",      icon: "ruler" },
  { key: "electricity",      label: "Electricity",      icon: "bolt" },
  { key: "water",            label: "Water",            icon: "droplet" },
  { key: "gas",              label: "Gas",              icon: "flame" },
  { key: "insurance",        label: "Insurance",        icon: "shield" },
  { key: "property_tax",     label: "Property Tax",     icon: "doc" },
  { key: "repairs",          label: "Repairs",          icon: "briefcase" },
  { key: "cleaning",         label: "Cleaning",         icon: "droplet" },
  { key: "gardening",        label: "Gardening",        icon: "store" },
  { key: "air_conditioning", label: "Air Conditioning", icon: "zap" },
  { key: "management_fee",   label: "Management Fee",   icon: "briefcase" },
  { key: "other",            label: "Other",            icon: "more" },
];
const CAT_BY_KEY = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

const PAYMENT_METHODS = [
  { key: "cash",          label: "Cash",          icon: "cash" },
  { key: "bank_transfer", label: "Bank Transfer", icon: "bank" },
  { key: "bit",           label: "Bit",           icon: "bit" },
  { key: "check",         label: "Check",         icon: "doc" },
];

const TRANSACTIONS = [
  { id: 1,  date: "2026-05-14", propertyId: 1, renterId: 4,    party: "Priya Nambiar",       categoryKey: null,                supplierId: null, type: "revenue", amount: 10000, method: "bank_transfer", monthFor: "2026-05", notes: "" },
  { id: 2,  date: "2026-05-12", propertyId: 1, renterId: 3,    party: "Carlos Reyes",        categoryKey: null,                supplierId: null, type: "revenue", amount: 12000, method: "cash",          monthFor: "2026-05", notes: "Paid 7 days late." },
  { id: 3,  date: "2026-05-07", propertyId: 5, renterId: null, party: "CoolAir Services",    categoryKey: "air_conditioning",  supplierId: 1,    type: "expense", amount: 400,   method: "bank_transfer", monthFor: null,      notes: "Annual A/C clean." },
  { id: 4,  date: "2026-05-07", propertyId: 5, renterId: 1,    party: "Maya Thornton",       categoryKey: null,                supplierId: null, type: "revenue", amount: 12000, method: "bank_transfer", monthFor: "2026-05", notes: "" },
  { id: 5,  date: "2026-05-02", propertyId: 6, renterId: 2,    party: "Daniel Okafor",       categoryKey: null,                supplierId: null, type: "revenue", amount: 11500, method: "bank_transfer", monthFor: "2026-05", notes: "" },
  { id: 6,  date: "2026-04-28", propertyId: 3, renterId: 5,    party: "Northshore Co.",      categoryKey: null,                supplierId: null, type: "revenue", amount: 22000, method: "bank_transfer", monthFor: "2026-04", notes: "" },
  { id: 7,  date: "2026-04-22", propertyId: 4, renterId: null, party: "City Plumbing",       categoryKey: "repairs",           supplierId: 2,    type: "expense", amount: 1850,  method: "bank_transfer", monthFor: null,      notes: "Replaced kitchen riser." },
  { id: 8,  date: "2026-04-14", propertyId: 1, renterId: 4,    party: "Priya Nambiar",       categoryKey: null,                supplierId: null, type: "revenue", amount: 10000, method: "bank_transfer", monthFor: "2026-04", notes: "" },
  { id: 9,  date: "2026-04-12", propertyId: 1, renterId: 3,    party: "Carlos Reyes",        categoryKey: null,                supplierId: null, type: "revenue", amount: 12000, method: "cash",          monthFor: "2026-04", notes: "" },
  { id: 10, date: "2026-04-07", propertyId: 5, renterId: 1,    party: "Maya Thornton",       categoryKey: null,                supplierId: null, type: "revenue", amount: 12000, method: "bank_transfer", monthFor: "2026-04", notes: "" },
  { id: 11, date: "2026-04-03", propertyId: 3, renterId: null, party: "Brightline Electric", categoryKey: "electricity",       supplierId: 3,    type: "expense", amount: 720,   method: "bank_transfer", monthFor: null,      notes: "" },
  { id: 12, date: "2026-04-01", propertyId: 6, renterId: 2,    party: "Daniel Okafor",       categoryKey: null,                supplierId: null, type: "revenue", amount: 11500, method: "bank_transfer", monthFor: "2026-04", notes: "" },
  { id: 13, date: "2026-03-29", propertyId: 5, renterId: null, party: "Green Hands Gardening",categoryKey: "gardening",        supplierId: 4,    type: "expense", amount: 320,   method: "bit",           monthFor: null,      notes: "Spring trim." },
  { id: 14, date: "2026-03-15", propertyId: 1, renterId: 4,    party: "Priya Nambiar",       categoryKey: null,                supplierId: null, type: "revenue", amount: 10000, method: "bank_transfer", monthFor: "2026-03", notes: "" },
  { id: 15, date: "2026-03-12", propertyId: 5, renterId: 1,    party: "Maya Thornton",       categoryKey: null,                supplierId: null, type: "revenue", amount: 12000, method: "bank_transfer", monthFor: "2026-03", notes: "" },
  { id: 16, date: "2026-03-08", propertyId: 1, renterId: null, party: "Bituach Yashir",      categoryKey: "insurance",         supplierId: 6,    type: "expense", amount: 1130,  method: "bank_transfer", monthFor: null,      notes: "Annual content cover." },
  { id: 17, date: "2026-03-03", propertyId: 3, renterId: 5,    party: "Northshore Co.",      categoryKey: null,                supplierId: null, type: "revenue", amount: 22000, method: "bank_transfer", monthFor: "2026-03", notes: "" },
  { id: 18, date: "2026-02-26", propertyId: 6, renterId: 2,    party: "Daniel Okafor",       categoryKey: null,                supplierId: null, type: "revenue", amount: 11500, method: "bank_transfer", monthFor: "2026-02", notes: "" },
  { id: 19, date: "2026-02-15", propertyId: 5, renterId: null, party: "Brightline Electric", categoryKey: "electricity",       supplierId: 3,    type: "expense", amount: 540,   method: "bank_transfer", monthFor: null,      notes: "" },
  { id: 20, date: "2026-02-09", propertyId: 1, renterId: 3,    party: "Carlos Reyes",        categoryKey: null,                supplierId: null, type: "revenue", amount: 12000, method: "cash",          monthFor: "2026-02", notes: "" },
];

const CASH_FLOW = [
  { m: "Jun '25", rev: 48000, exp: 2400 },
  { m: "Jul '25", rev: 48000, exp: 1100 },
  { m: "Aug '25", rev: 50500, exp: 3400 },
  { m: "Sep '25", rev: 50500, exp: 900 },
  { m: "Oct '25", rev: 60500, exp: 4200 },
  { m: "Nov '25", rev: 60500, exp: 1700 },
  { m: "Dec '25", rev: 62500, exp: 2100 },
  { m: "Jan '26", rev: 62500, exp: 5300 },
  { m: "Feb '26", rev: 62500, exp: 1670 },
  { m: "Mar '26", rev: 65500, exp: 1450 },
  { m: "Apr '26", rev: 67500, exp: 2570 },
  { m: "May '26", rev: 33500, exp: 400 },
];

const REPORT_HISTORY = [
  { id: 1, type: "Income & Expense", period: "2025", generated: "2026-01-08", format: "PDF" },
  { id: 2, type: "Expense Log",      period: "2025 Q4", generated: "2026-01-05", format: "Excel" },
  { id: 3, type: "Income & Expense", period: "2024", generated: "2025-01-12", format: "Excel" },
  { id: 4, type: "Expense Log",      period: "2024", generated: "2025-01-04", format: "PDF" },
];

// Helpers that need the data
const propertyById = (id) => PROPERTIES.find(p => p.id === id);
const renterById = (id) => RENTERS.find(r => r.id === id);
const supplierById = (id) => SUPPLIERS.find(s => s.id === id);
const rentersOfProperty = (pid) => RENTERS.filter(r => r.propertyId === pid);
const txOfProperty = (pid) => TRANSACTIONS.filter(t => t.propertyId === pid);
const txOfRenter = (rid) => TRANSACTIONS.filter(t => t.renterId === rid);

// ─────────────────────────────────────────────────────────────────────────────
// Theme management
// ─────────────────────────────────────────────────────────────────────────────
function useTheme(initial = "light") {
  const [theme, setTheme] = React.useState(initial);
  React.useEffect(() => {
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  }, [theme]);
  return [theme, setTheme];
}

// ─────────────────────────────────────────────────────────────────────────────
// Primitives — Pill, Btn, Avatar, PropTile, Spark, Field, Drawer, Modal…
// ─────────────────────────────────────────────────────────────────────────────
function Pill({ children, tone = "neutral", size = "sm", icon }) {
  const tones = {
    neutral:  { bg: "var(--rc-bg)",          fg: "var(--rc-fg2)" },
    success:  { bg: "var(--rc-revenue-bg)",  fg: "var(--rc-revenue-fg)" },
    warning:  { bg: "rgba(217,119,6,0.13)",  fg: "rgba(180,83,9,1)" },
    danger:   { bg: "var(--rc-expense-bg)",  fg: "var(--rc-expense-fg)" },
    info:     { bg: "var(--rc-primary-container)", fg: "var(--rc-on-primary-ctr)" },
    navy:     { bg: "var(--rc-brand-navy)",  fg: "#fff" },
  };
  const t = tones[tone] || tones.neutral;
  const sz = size === "lg"
    ? { padding: "5px 11px", font: "500 12px " + RC_FONT }
    : { padding: "2px 8px",  font: "500 11px " + RC_FONT };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: t.bg, color: t.fg, borderRadius: 999, whiteSpace: "nowrap", ...sz }}>
      {icon && <Icon name={icon} size={size === "lg" ? 13 : 11} />}
      {children}
    </span>
  );
}

function Btn({ children, kind = "primary", icon, iconRight, size = "md", onClick, disabled, type = "button", style, title }) {
  const styles = {
    primary: { background: "var(--rc-brand-navy)", color: "#fff", border: "0" },
    accent:  { background: "var(--rc-primary)",    color: "#fff", border: "0" },
    outline: { background: "var(--rc-surface)",    color: "var(--rc-fg1)", border: "1px solid var(--rc-outline)" },
    ghost:   { background: "transparent",          color: "var(--rc-fg1)", border: "0" },
    danger:  { background: "var(--rc-error)",      color: "#fff", border: "0" },
    "danger-outline": { background: "var(--rc-surface)", color: "var(--rc-error)", border: "1px solid var(--rc-error)" },
  };
  const sizes = {
    sm: { padding: "6px 10px", font: "500 12px " + RC_FONT, gap: 5, borderRadius: 8,  height: 30 },
    md: { padding: "8px 14px", font: "500 13px " + RC_FONT, gap: 6, borderRadius: 9,  height: 36 },
    lg: { padding: "10px 18px",font: "600 14px " + RC_FONT, gap: 7, borderRadius: 10, height: 42 },
  };
  return (
    <button onClick={onClick} disabled={disabled} type={type} title={title} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "background .12s, color .12s, border-color .12s", ...styles[kind], ...sizes[size], ...style }}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 14 : 16} />}
    </button>
  );
}

function Avatar({ name, size = 36, color, src }) {
  if (src) return <img src={src} style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: 999, background: color || "var(--rc-primary-container)", color: "var(--rc-on-primary-ctr)", display: "flex", alignItems: "center", justifyContent: "center", font: `600 ${Math.round(size * 0.36)}px ${RC_FONT}`, flexShrink: 0, letterSpacing: -0.2 }}>
      {initials(name)}
    </div>
  );
}

function PropTile({ property, size = 56 }) {
  const tint = property?.color || "#A8B7C9";
  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: tint + "33", border: "1px solid " + tint + "55", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", overflow: "hidden" }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
        <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" fill={tint} stroke={tint} strokeWidth="0" />
        <path d="M3 11l9-8 9 8" stroke="var(--rc-brand-navy)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.65" />
      </svg>
    </div>
  );
}

function Spark({ data, color = "var(--rc-success)", width = 80, height = 24 }) {
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / span) * height}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionLabel({ children, style }) {
  return <div style={{ font: "600 11px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.6, textTransform: "uppercase", ...style }}>{children}</div>;
}

function PageHeader({ title, meta, actions, back, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "28px 40px 18px", gap: 24, borderBottom: "1px solid var(--rc-outline)" }}>
      <div style={{ minWidth: 0 }}>
        {back && (
          <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 5, font: "500 12px " + RC_FONT, color: "var(--rc-fg2)", background: "transparent", border: 0, cursor: "pointer", padding: 0, marginBottom: 6 }}>
            <Icon name="chevronLeft" size={14} /> {back}
          </button>
        )}
        <h1 style={{ font: "700 28px " + RC_FONT, letterSpacing: -0.5, margin: 0, color: "var(--rc-fg1)" }}>{title}</h1>
        {meta && <div style={{ font: "400 13px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 4 }}>{meta}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

function SearchInput({ placeholder = "Search…", width = 320, value, onChange, hint = "⌘K" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 36, borderRadius: 9, border: "1px solid var(--rc-outline)", background: "var(--rc-surface)", width, flexShrink: 0 }}>
      <Icon name="search" size={15} color="var(--rc-placeholder)" />
      <input placeholder={placeholder} value={value || ""} onChange={(e) => onChange?.(e.target.value)} style={{ flex: 1, minWidth: 0, border: 0, outline: "none", font: "400 13px " + RC_FONT, color: "var(--rc-fg1)", background: "transparent" }} />
      {hint && <span style={{ font: "500 10px " + RC_FONT, color: "var(--rc-placeholder)", border: "1px solid var(--rc-outline)", borderRadius: 4, padding: "1px 5px" }}>{hint}</span>}
    </div>
  );
}

function FilterChip({ label, value, active, onClick, icon, onClear }) {
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 11px", borderRadius: 8, border: "1px solid " + (active ? "var(--rc-fg1)" : "var(--rc-outline)"), background: active ? "var(--rc-fg1)" : "var(--rc-surface)", color: active ? "#fff" : "var(--rc-fg1)", font: "500 12px " + RC_FONT, cursor: "pointer" }}>
      {icon && <Icon name={icon} size={13} />}
      {label}
      {value && <span style={{ opacity: 0.65, font: "400 12px " + RC_FONT }}>· {value}</span>}
      {active && onClear ? (
        <span onClick={(e) => { e.stopPropagation(); onClear(); }} style={{ display: "inline-flex", padding: 1, borderRadius: 4 }}><Icon name="x" size={11} /></span>
      ) : (
        <Icon name="chevronDown" size={12} />
      )}
    </button>
  );
}

function SegToggle({ options, value, onChange, size = "md" }) {
  const h = size === "sm" ? 28 : 32;
  return (
    <div style={{ display: "inline-flex", height: h, padding: 2, background: "var(--rc-bg)", border: "1px solid var(--rc-outline)", borderRadius: 8 }}>
      {options.map(o => (
        <button key={o.key} onClick={() => onChange?.(o.key)} title={o.label} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0 10px", border: 0, background: value === o.key ? "var(--rc-surface)" : "transparent", color: value === o.key ? "var(--rc-fg1)" : "var(--rc-fg2)", borderRadius: 6, font: "500 12px " + RC_FONT, cursor: "pointer", boxShadow: value === o.key ? "0 1px 2px rgba(0,0,0,0.06)" : "none", whiteSpace: "nowrap" }}>
          {o.icon && <Icon name={o.icon} size={13} />}{o.label}
        </button>
      ))}
    </div>
  );
}

// Form primitives
function Field({ label, hint, error, required, children, full }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: full ? "1 / -1" : "auto" }}>
      <span style={{ font: "500 12px " + RC_FONT, color: "var(--rc-fg1)" }}>
        {label}{required && <span style={{ color: "var(--rc-error)", marginLeft: 3 }}>*</span>}
      </span>
      {children}
      {(hint || error) && <span style={{ font: "400 11px " + RC_FONT, color: error ? "var(--rc-error)" : "var(--rc-fg2)" }}>{error || hint}</span>}
    </label>
  );
}

function Input(props) {
  return <input {...props} style={{ height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid var(--rc-outline)", background: "var(--rc-surface)", font: "400 13px " + RC_FONT, color: "var(--rc-fg1)", outline: "none", ...props.style }} />;
}

function Textarea(props) {
  return <textarea {...props} style={{ minHeight: 80, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--rc-outline)", background: "var(--rc-surface)", font: "400 13px " + RC_FONT, color: "var(--rc-fg1)", outline: "none", resize: "vertical", fontFamily: "inherit", ...props.style }} />;
}

function Select({ value, onChange, options, placeholder, ...rest }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value || ""} onChange={(e) => onChange?.(e.target.value)} {...rest} style={{ width: "100%", height: 38, padding: "0 32px 0 12px", borderRadius: 8, border: "1px solid var(--rc-outline)", background: "var(--rc-surface)", font: "400 13px " + RC_FONT, color: value ? "var(--rc-fg1)" : "var(--rc-placeholder)", outline: "none", appearance: "none", cursor: "pointer" }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevronDown" size={14} color="var(--rc-fg2)" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
    </div>
  );
}

// Right drawer for forms
function Drawer({ open, onClose, title, subtitle, width = 560, footer, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.32)", backdropFilter: "blur(2px)" }} />
      <div className="rc-drawer" style={{ position: "relative", width, maxWidth: "100vw", height: "100%", background: "var(--rc-surface)", borderLeft: "1px solid var(--rc-outline)", display: "flex", flexDirection: "column", boxShadow: "-12px 0 32px rgba(15,23,42,0.12)" }}>
        <header style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--rc-outline)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <h2 style={{ font: "700 18px " + RC_FONT, letterSpacing: -0.3, margin: 0, color: "var(--rc-fg1)" }}>{title}</h2>
            {subtitle && <div style={{ font: "400 12.5px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} title="Close" style={{ width: 32, height: 32, borderRadius: 8, border: 0, background: "transparent", color: "var(--rc-fg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="x" size={18} />
          </button>
        </header>
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>{children}</div>
        {footer && (
          <footer style={{ padding: "14px 24px", borderTop: "1px solid var(--rc-outline)", display: "flex", justifyContent: "flex-end", gap: 8, background: "var(--rc-surface)" }}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

// Modal — small centered dialog (delete confirm etc.)
function Modal({ open, onClose, title, children, footer, width = 420 }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.32)" }} />
      <div className="rc-drawer" style={{ position: "relative", width, maxWidth: "100%", background: "var(--rc-surface)", borderRadius: 16, padding: 24, boxShadow: "0 32px 64px rgba(15,23,42,0.24)" }}>
        {title && <h3 style={{ font: "700 18px " + RC_FONT, margin: "0 0 10px", color: "var(--rc-fg1)" }}>{title}</h3>}
        {children}
        {footer && <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 8 }}>{footer}</div>}
      </div>
    </div>
  );
}

// Section card — used in forms
function FormSection({ title, subtitle, children, cols = 2 }) {
  return (
    <section style={{ background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ font: "700 14px " + RC_FONT, color: "var(--rc-fg1)" }}>{title}</div>
        {subtitle && <div style={{ font: "400 12px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
        {children}
      </div>
    </section>
  );
}

// Currency display — large value with ₪ in a softer tone
function Currency({ value, size = 28, signed = false, color = "var(--rc-fg1)" }) {
  const n = Math.abs(value).toLocaleString("en-US");
  const sign = signed ? (value >= 0 ? "+" : "−") : "";
  return (
    <span style={{ font: `700 ${size}px ${RC_FONT}`, letterSpacing: -size * 0.025, color, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
      {sign}{n}<span style={{ fontSize: size * 0.55, color: "var(--rc-fg2)", marginLeft: 1 }}>₪</span>
    </span>
  );
}

// Empty state
function Empty({ icon = "alert", title, hint, action }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 24px", textAlign: "center", gap: 12 }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: "var(--rc-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--rc-fg2)" }}>
        <Icon name={icon} size={24} stroke={1.4} />
      </div>
      <div>
        <div style={{ font: "600 15px " + RC_FONT, color: "var(--rc-fg1)" }}>{title}</div>
        {hint && <div style={{ font: "400 13px " + RC_FONT, color: "var(--rc-fg2)", marginTop: 4 }}>{hint}</div>}
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function Sidebar({ ctx, variant = "wide" }) {
  const items = [
    { key: "home",         label: "Home",         icon: "home" },
    { key: "properties",   label: "Properties",   icon: "building2", count: PROPERTIES.length },
    { key: "renters",      label: "Renters",      icon: "users",     count: RENTERS.length },
    { key: "transactions", label: "Transactions", icon: "wallet" },
    { key: "reports",      label: "Reports",      icon: "pieChart" },
  ];
  const bottom = [
    { key: "suppliers", label: "Suppliers", icon: "store" },
    { key: "settings",  label: "Settings",  icon: "cog" },
  ];

  const active = ctx.route.name;
  const go = (k) => ctx.navigate(k);

  if (variant === "icon") {
    return (
      <aside style={{ width: 64, background: "var(--rc-surface)", borderRight: "1px solid var(--rc-outline)", display: "flex", flexDirection: "column", padding: "16px 0", flexShrink: 0 }}>
        <div onClick={() => go("home")} style={{ width: 36, height: 36, borderRadius: 9, background: "var(--rc-brand-navy)", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Icon name="building2" size={18} color="#fff" />
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 10px", flex: 1 }}>
          {items.map(it => {
            const a = it.key === active;
            return (
              <button key={it.key} onClick={() => go(it.key)} title={it.label} style={{ width: 44, height: 44, borderRadius: 9, border: 0, background: a ? "var(--rc-brand-navy)" : "transparent", color: a ? "#fff" : "var(--rc-fg2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Icon name={it.icon} size={19} />
              </button>
            );
          })}
        </nav>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 10px 8px" }}>
          {bottom.map(it => {
            const a = it.key === active;
            return (
              <button key={it.key} onClick={() => go(it.key)} title={it.label} style={{ width: 44, height: 44, borderRadius: 9, border: 0, background: a ? "var(--rc-brand-navy)" : "transparent", color: a ? "#fff" : "var(--rc-fg2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Icon name={it.icon} size={19} />
              </button>
            );
          })}
        </div>
        <button onClick={() => go("settings")} title="Eyal Kook" style={{ width: 36, height: 36, borderRadius: 999, background: "var(--rc-primary-container)", color: "var(--rc-on-primary-ctr)", margin: "8px auto 0", display: "flex", alignItems: "center", justifyContent: "center", font: "600 11px " + RC_FONT, border: 0, cursor: "pointer" }}>EK</button>
      </aside>
    );
  }

  if (variant === "pill") {
    return (
      <aside style={{ width: 220, background: "var(--rc-surface)", borderRight: "1px solid var(--rc-outline)", display: "flex", flexDirection: "column", padding: "20px 12px", flexShrink: 0 }}>
        <div onClick={() => go("home")} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, padding: "0 6px", cursor: "pointer" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--rc-brand-navy)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="building2" size={17} color="#fff" />
          </div>
          <div style={{ font: "700 14px " + RC_FONT, color: "var(--rc-fg1)", letterSpacing: -0.2 }}>rent-control</div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {items.map(it => <NavBtn key={it.key} {...it} active={it.key === active} onClick={() => go(it.key)} />)}
          <div style={{ height: 12 }} />
          {bottom.map(it => <NavBtn key={it.key} {...it} active={it.key === active} onClick={() => go(it.key)} />)}
        </nav>
        <button onClick={() => go("settings")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderTop: "1px solid var(--rc-outline)", paddingTop: 14, background: "transparent", border: 0, borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: "var(--rc-outline)", cursor: "pointer", textAlign: "left", marginTop: 8 }}>
          <Avatar name="Eyal Kook" size={28} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ font: "500 12px " + RC_FONT, color: "var(--rc-fg1)" }}>Eyal Kook</div>
            <div style={{ font: "400 11px " + RC_FONT, color: "var(--rc-fg2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>eyalkook@gmail.com</div>
          </div>
        </button>
      </aside>
    );
  }

  // 'wide' default
  return (
    <aside style={{ width: 252, background: "var(--rc-surface)", borderRight: "1px solid var(--rc-outline)", display: "flex", flexDirection: "column", padding: "20px 14px", flexShrink: 0 }}>
      <div onClick={() => go("home")} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, padding: "0 4px", cursor: "pointer" }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--rc-brand-navy)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="building2" size={18} color="#fff" />
        </div>
        <div>
          <div style={{ font: "700 14px " + RC_FONT, color: "var(--rc-fg1)", letterSpacing: -0.2 }}>Rent Control</div>
          <div style={{ font: "400 10.5px " + RC_FONT, color: "var(--rc-fg2)" }}>Eyal Kook · personal</div>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {items.map(it => <NavBtn key={it.key} {...it} active={it.key === active} onClick={() => go(it.key)} />)}
        <div style={{ marginTop: 14, marginBottom: 6, padding: "0 12px", font: "600 10px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.6, textTransform: "uppercase" }}>Manage</div>
        {bottom.map(it => <NavBtn key={it.key} {...it} active={it.key === active} onClick={() => go(it.key)} />)}
      </nav>

      <div style={{ background: "var(--rc-bg)", borderRadius: 10, padding: 12, marginTop: 12 }}>
        <div style={{ font: "500 10px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>May profit</div>
        <Currency value={33100} size={22} />
        <div style={{ font: "400 11px " + RC_FONT, color: "var(--rc-success)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="trendUp" size={12} /> +4.2% vs Apr
        </div>
      </div>

      <button onClick={() => go("settings")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 6px", marginTop: 12, borderTop: "1px solid var(--rc-outline)", paddingTop: 14, cursor: "pointer", textAlign: "left", background: "transparent", border: 0, borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: "var(--rc-outline)" }}>
        <Avatar name="Eyal Kook" size={30} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ font: "600 12.5px " + RC_FONT, color: "var(--rc-fg1)" }}>Eyal Kook</div>
          <div style={{ font: "400 11px " + RC_FONT, color: "var(--rc-fg2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>eyalkook@gmail.com</div>
        </div>
        <Icon name="chevron" size={14} color="var(--rc-fg2)" />
      </button>
    </aside>
  );
}

function NavBtn({ icon, label, count, active, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: 0, background: active ? "var(--rc-brand-navy)" : "transparent", color: active ? "#fff" : "var(--rc-fg1)", font: (active ? "600 " : "500 ") + "13px " + RC_FONT, cursor: "pointer", textAlign: "left" }}>
      <Icon name={icon} size={17} color={active ? "#fff" : "var(--rc-fg2)"} />
      <span style={{ flex: 1 }}>{label}</span>
      {count != null && (
        <span style={{ font: "500 11px " + RC_FONT, color: active ? "rgba(255,255,255,0.7)" : "var(--rc-fg2)" }}>{count}</span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top bar — search + quick actions
// ─────────────────────────────────────────────────────────────────────────────
function TopBar({ ctx }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px", borderBottom: "1px solid var(--rc-outline)", background: "var(--rc-surface)", gap: 12, flexShrink: 0 }}>
      <div style={{ flex: 1, maxWidth: 480, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => ctx.openPalette()} style={{ display: "flex", flex: 1, alignItems: "center", gap: 8, padding: "0 12px", height: 36, borderRadius: 9, border: "1px solid var(--rc-outline)", background: "var(--rc-bg)", cursor: "pointer", color: "var(--rc-placeholder)" }}>
          <Icon name="search" size={15} />
          <span style={{ flex: 1, textAlign: "left", font: "400 13px " + RC_FONT }}>Search properties, renters, transactions…</span>
          <span style={{ font: "500 10px " + RC_FONT, border: "1px solid var(--rc-outline)", borderRadius: 4, padding: "1px 5px" }}>⌘K</span>
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => ctx.toggleTheme()} title="Toggle theme" style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid var(--rc-outline)", background: "var(--rc-surface)", color: "var(--rc-fg1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={ctx.theme === "dark" ? "sun" : "moon"} size={16} />
        </button>
        <button title="Notifications" style={{ position: "relative", width: 36, height: 36, borderRadius: 9, border: "1px solid var(--rc-outline)", background: "var(--rc-surface)", color: "var(--rc-fg1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="bell" size={16} />
          <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: 999, background: "var(--rc-error)" }} />
        </button>
        <Btn kind="primary" size="md" icon="plus" onClick={() => ctx.openAdd()}>Add</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Command palette — ⌘K
// ─────────────────────────────────────────────────────────────────────────────
function CommandPalette({ ctx }) {
  const [q, setQ] = React.useState("");
  const inputRef = React.useRef(null);
  React.useEffect(() => { if (ctx.paletteOpen) setTimeout(() => inputRef.current?.focus(), 30); }, [ctx.paletteOpen]);
  if (!ctx.paletteOpen) return null;

  const navItems = [
    { kind: "Page", label: "Home",         icon: "home",      action: () => ctx.navigate("home") },
    { kind: "Page", label: "Properties",   icon: "building2", action: () => ctx.navigate("properties") },
    { kind: "Page", label: "Renters",      icon: "users",     action: () => ctx.navigate("renters") },
    { kind: "Page", label: "Transactions", icon: "wallet",    action: () => ctx.navigate("transactions") },
    { kind: "Page", label: "Suppliers",    icon: "store",     action: () => ctx.navigate("suppliers") },
    { kind: "Page", label: "Reports",      icon: "pieChart",  action: () => ctx.navigate("reports") },
    { kind: "Page", label: "Settings",     icon: "cog",       action: () => ctx.navigate("settings") },
  ];
  const actions = [
    { kind: "Action", label: "Add property",      icon: "plus", action: () => ctx.openDrawer("property") },
    { kind: "Action", label: "Add renter",        icon: "plus", action: () => ctx.openDrawer("renter") },
    { kind: "Action", label: "Record revenue",    icon: "trendUp",   action: () => ctx.openDrawer("transaction", { type: "revenue" }) },
    { kind: "Action", label: "Record expense",    icon: "trendDown", action: () => ctx.openDrawer("transaction", { type: "expense" }) },
    { kind: "Action", label: "Add supplier",      icon: "store",     action: () => ctx.openDrawer("supplier") },
    { kind: "Action", label: "Generate report",   icon: "filePdf",   action: () => ctx.navigate("reports") },
  ];
  const props = PROPERTIES.map(p => ({ kind: "Property", label: p.addr, sub: p.city, icon: "building2", action: () => ctx.navigate("propertyDetail", { id: p.id }) }));
  const rents = RENTERS.map(r => ({ kind: "Renter", label: r.name, sub: propertyById(r.propertyId)?.addr, icon: "user", action: () => ctx.navigate("renterDetail", { id: r.id }) }));

  const all = [...navItems, ...actions, ...props, ...rents];
  const ql = q.toLowerCase();
  const matches = ql ? all.filter(x => x.label.toLowerCase().includes(ql) || (x.sub || "").toLowerCase().includes(ql)) : all;

  const grouped = {};
  matches.forEach(m => { (grouped[m.kind] = grouped[m.kind] || []).push(m); });
  const order = ["Page", "Action", "Property", "Renter"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", justifyContent: "center", paddingTop: "12vh" }}>
      <div onClick={() => ctx.closePalette()} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.36)" }} />
      <div className="rc-drawer" style={{ position: "relative", width: 600, maxWidth: "calc(100% - 32px)", maxHeight: 540, background: "var(--rc-surface)", border: "1px solid var(--rc-outline)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 64px rgba(15,23,42,0.24)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--rc-outline)" }}>
          <Icon name="search" size={16} color="var(--rc-fg2)" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a command, page, property or person…" style={{ flex: 1, border: 0, outline: "none", font: "400 14px " + RC_FONT, color: "var(--rc-fg1)", background: "transparent" }} onKeyDown={(e) => { if (e.key === "Escape") ctx.closePalette(); }} />
          <span style={{ font: "500 10px " + RC_FONT, color: "var(--rc-fg2)", border: "1px solid var(--rc-outline)", borderRadius: 4, padding: "1px 5px" }}>esc</span>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
          {order.map(group => grouped[group] && (
            <div key={group}>
              <div style={{ padding: "8px 16px 4px", font: "600 10px " + RC_FONT, color: "var(--rc-fg2)", letterSpacing: 0.5, textTransform: "uppercase" }}>{group}</div>
              {grouped[group].map((m, i) => (
                <button key={group + i} onClick={() => { m.action(); ctx.closePalette(); }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--rc-bg)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 16px", border: 0, background: "transparent", cursor: "pointer", textAlign: "left" }}>
                  <Icon name={m.icon} size={16} color="var(--rc-fg2)" />
                  <span style={{ flex: 1, font: "500 13.5px " + RC_FONT, color: "var(--rc-fg1)" }}>{m.label}</span>
                  {m.sub && <span style={{ font: "400 12px " + RC_FONT, color: "var(--rc-fg2)" }}>{m.sub}</span>}
                  <Icon name="arrowRight" size={13} color="var(--rc-placeholder)" />
                </button>
              ))}
            </div>
          ))}
          {matches.length === 0 && <div style={{ padding: "24px 16px", font: "400 13px " + RC_FONT, color: "var(--rc-fg2)", textAlign: "center" }}>No matches.</div>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App chrome wrapper
// ─────────────────────────────────────────────────────────────────────────────
function AppChrome({ ctx, sidebar, children }) {
  return (
    <div data-density={ctx.density} style={{ width: "100vw", height: "100vh", display: "flex", background: "var(--rc-bg)", color: "var(--rc-fg1)", fontFamily: RC_FONT, overflow: "hidden" }}>
      <Sidebar ctx={ctx} variant={sidebar} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar ctx={ctx} />
        <div className="rc-route" key={ctx.route.name + (ctx.route.params?.id || "")} style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </main>
      <CommandPalette ctx={ctx} />
    </div>
  );
}

// Export everything to window
Object.assign(window, {
  Icon, ICON_PATHS,
  RC_FONT, TODAY, MONTHS, fmtIls, fmtSigned, fmtDate, fmtDateShort, daysUntil, initials,
  PROPERTIES, RENTERS, SUPPLIERS, CATEGORIES, CAT_BY_KEY, PAYMENT_METHODS, TRANSACTIONS, CASH_FLOW, REPORT_HISTORY,
  propertyById, renterById, supplierById, rentersOfProperty, txOfProperty, txOfRenter,
  useTheme,
  Pill, Btn, Avatar, PropTile, Spark, SectionLabel, PageHeader, SearchInput, FilterChip, SegToggle,
  Field, Input, Textarea, Select, Drawer, Modal, FormSection, Currency, Empty,
  Sidebar, TopBar, NavBtn, CommandPalette, AppChrome,
});
