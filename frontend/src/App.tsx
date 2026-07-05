import { useEffect, useRef, useState } from "react";
import { api, openDashboardSocket } from "./api";
import { Sidebar, type PageKey } from "./components/Sidebar";
import { WhatsappSimulator } from "./components/WhatsappSimulator";
import { Home } from "./pages/Home";
import { Inventory } from "./pages/Inventory";
import { Orders } from "./pages/Orders";
import { CRM } from "./pages/CRM";
import { Analytics } from "./pages/Analytics";
import { Settings } from "./pages/Settings";
import type { Business, WsEvent } from "./types";
import { formatINR } from "./components/ui";

const PAGE_TITLES: Record<PageKey, string> = {
  home: "Dashboard",
  inventory: "Inventory",
  orders: "Orders",
  crm: "Customers",
  analytics: "Analytics",
  settings: "Settings",
};

export default function App() {
  const [business, setBusiness] = useState<Business | undefined>();
  const [page, setPage] = useState<PageKey>("home");
  const [live, setLive] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [feed, setFeed] = useState<string[]>([]);
  const [highlight, setHighlight] = useState<string | undefined>();
  const wsRef = useRef<WebSocket | null>(null);

  const refresh = () => setRefreshKey((k) => k + 1);

  // load the demo business
  useEffect(() => {
    api.businesses().then((list) => setBusiness(list[0])).catch(() => {});
  }, []);

  // open live socket once we have a business
  useEffect(() => {
    if (!business) return;
    const ws = openDashboardSocket(business.id, (e: WsEvent) => handleEvent(e));
    ws.onopen = () => setLive(true);
    ws.onclose = () => setLive(false);
    wsRef.current = ws;
    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  function pushFeed(line: string) {
    setFeed((f) => [line, ...f].slice(0, 25));
  }

  function handleEvent(e: WsEvent) {
    switch (e.type) {
      case "new_message":
        pushFeed(`${e.data.direction === "in" ? "💬" : "🤖"} ${e.data.text}`);
        break;
      case "new_order":
        pushFeed(`🧾 New order ${formatINR(e.data.total)} — ${e.data.customer_name || e.data.customer_no}`);
        refresh();
        break;
      case "order_update":
        pushFeed(`🔄 Order #${e.data.id.slice(0, 4)} → ${e.data.status}`);
        refresh();
        break;
      case "stock_update":
        pushFeed(`📦 ${e.data.name}: stock → ${e.data.stock_qty}`);
        setHighlight(e.data.product_id);
        setTimeout(() => setHighlight(undefined), 1500);
        refresh();
        break;
      case "low_stock":
        pushFeed(`⚠️ Low stock: ${e.data.name} (${e.data.stock_qty} left)`);
        break;
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar page={page} onNav={setPage} business={business} live={live} />

      <div className="flex-1 flex min-w-0">
        <main className="flex-1 min-w-0 p-6 lg:p-8">
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">{PAGE_TITLES[page]}</h1>
              <p className="text-sm text-slate-400">
                {business?.name} · the AI munim for every shop
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs bg-white rounded-full px-3 py-1.5 shadow-card">
              <span className={`w-2 h-2 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
              {live ? "Live updates on" : "Connecting…"}
            </div>
          </header>

          {business && page === "home" && <Home bid={business.id} refreshKey={refreshKey} feed={feed} />}
          {business && page === "inventory" && <Inventory bid={business.id} refreshKey={refreshKey} highlight={highlight} />}
          {business && page === "orders" && <Orders bid={business.id} refreshKey={refreshKey} onChange={refresh} />}
          {business && page === "crm" && <CRM bid={business.id} refreshKey={refreshKey} />}
          {business && page === "analytics" && <Analytics bid={business.id} refreshKey={refreshKey} />}
          {business && page === "settings" && <Settings business={business} onSaved={() => api.businesses().then((l) => setBusiness(l[0]))} />}
          {!business && (
            <div className="text-slate-400 text-sm">
              Connecting to backend… make sure it's running on :8000 and seeded (<code>python -m app.seed</code>).
            </div>
          )}
        </main>

        <WhatsappSimulator />
      </div>
    </div>
  );
}
