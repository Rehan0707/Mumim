import { useState } from "react";

export type PageKey = "home" | "orders" | "inventory" | "invoice" | "analytics" | "crm" | "settings";

const NAV_ITEMS: { key: PageKey; label: string; icon: string }[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "orders", label: "Orders", icon: "receipt_long" },
  { key: "inventory", label: "Inventory", icon: "inventory_2" },
  { key: "invoice", label: "Invoice", icon: "description" },
  { key: "analytics", label: "Analytics", icon: "leaderboard" },
  { key: "crm", label: "CRM", icon: "group" },
  { key: "settings", label: "Settings", icon: "settings" },
];

export default function Sidebar({
  page,
  onNav,
  business,
  live,
  onLogout,
}: {
  page: string;
  onNav: (page: string) => void;
  business: { name: string; whatsapp_no: string } | null;
  live: boolean;
  onLogout: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-surface shadow-soft-depth md:hidden"
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined text-on-surface">menu</span>
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={closeMobile} />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-surface-container-lowest shadow-float-depth transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-end p-4 pb-0 md:hidden">
          <button
            type="button"
            onClick={closeMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-6 py-card-padding">
          <h1 className="font-display text-display-lg font-bold text-primary">Munim.ai</h1>
          <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">Live Ledger</p>
        </div>

        {business && (
          <div className="border-b border-outline-variant/30 px-6 pb-4 pt-2 mx-4">
            <p className="text-body-lg font-semibold text-on-surface">{business.name}</p>
            <p className="text-body-sm text-on-surface-variant">{business.whatsapp_no}</p>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onNav(item.key);
                closeMobile();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                page === item.key
                  ? "bg-secondary-container text-on-secondary-container"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: page === item.key ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="font-label-caps text-label-caps">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 space-y-1">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-on-surface-variant hover:bg-surface-container-high transition-all duration-200"
          >
            <span className="material-symbols-outlined">help</span>
            <span className="font-label-caps text-label-caps">Help</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-on-surface-variant hover:bg-surface-container-high transition-all duration-200"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-caps text-label-caps">Logout</span>
          </button>
        </div>

        {live && (
          <div className="border-t border-outline-variant/30 px-6 py-3 mx-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-secondary-fixed opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-secondary-fixed" />
              </span>
              <span className="text-body-sm text-secondary">Live</span>
            </div>
          </div>
        )}
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface shadow-[0_-4px_20px_rgba(15,92,70,0.08)] z-20 flex justify-around items-center h-16">
        {NAV_ITEMS.slice(0, 4).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onNav(item.key)}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              page === item.key ? "text-primary" : "text-on-surface-variant"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: page === item.key ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-label-caps mt-1">{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center justify-center text-on-surface-variant w-full h-full"
        >
          <span className="material-symbols-outlined">menu</span>
          <span className="text-[10px] font-label-caps mt-1">More</span>
        </button>
      </nav>
    </>
  );
}
