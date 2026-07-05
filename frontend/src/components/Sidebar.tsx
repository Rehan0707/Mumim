import type { Business } from "../types";

export type PageKey = "home" | "inventory" | "orders" | "crm" | "analytics" | "settings";

const NAV: { key: PageKey; label: string; icon: string }[] = [
  { key: "home", label: "Home", icon: "🏠" },
  { key: "inventory", label: "Inventory", icon: "📦" },
  { key: "orders", label: "Orders", icon: "🧾" },
  { key: "crm", label: "Customers", icon: "👥" },
  { key: "analytics", label: "Analytics", icon: "📈" },
  { key: "settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar({
  page,
  onNav,
  business,
  live,
}: {
  page: PageKey;
  onNav: (p: PageKey) => void;
  business?: Business;
  live: boolean;
}) {
  return (
    <aside className="w-60 shrink-0 bg-brand-950 text-white flex flex-col min-h-screen">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-500 grid place-items-center font-extrabold text-brand-950">M</div>
          <div>
            <div className="font-extrabold text-lg leading-none">Munim<span className="text-brand-400">.ai</span></div>
            <div className="text-[10px] text-brand-100/60 uppercase tracking-widest mt-0.5">Business OS</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => onNav(n.key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              page === n.key ? "bg-brand-600 text-white" : "text-brand-100/70 hover:bg-white/5"
            }`}
          >
            <span>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${live ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
          <span className="text-brand-100/70">{live ? "Live" : "Offline"}</span>
        </div>
        <div className="mt-2 text-sm font-semibold truncate">{business?.name || "—"}</div>
        <div className="text-xs text-brand-100/50">{business?.whatsapp_no}</div>
      </div>
    </aside>
  );
}
