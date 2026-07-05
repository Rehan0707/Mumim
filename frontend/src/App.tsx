import { useEffect, useState } from "react";
import { api, openDashboardSocket } from "./api";
import Sidebar, { type PageKey } from "./components/Sidebar";
import { WhatsappSimulator } from "./components/WhatsappSimulator";
import { Auth } from "./pages/Auth";
import Landing from "./pages/Landing";
import Analytics from "./pages/Analytics";
import CRM from "./pages/CRM";
import Home from "./pages/Home";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import type { Business, WsEvent } from "./types";
import { Card } from "./components/ui";
import { clearSession, loadSession, saveSession, type DemoSession } from "./lib/session";

const PAGE_TITLES: Record<PageKey, string> = {
  home: "Overview",
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
  const [session, setSession] = useState<DemoSession | null>(() => loadSession());
  const [mode, setMode] = useState<"landing" | "auth" | "onboarding" | "dashboard">(loadSession() ? "dashboard" : "landing");
  const authenticated = Boolean(session?.authenticated);

  useEffect(() => {
    api.businesses().then((list) => setBusiness(list[0])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!business || !authenticated) return;
    const ws = openDashboardSocket(business.id, (e: WsEvent) => handleEvent(e));
    ws.onopen = () => setLive(true);
    ws.onclose = () => setLive(false);
    return () => ws.close();
  }, [business, authenticated]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  function pushFeed(line: string) {
    setFeed((current) => [line, ...current].slice(0, 25));
  }

  function handleEvent(e: WsEvent) {
    switch (e.type) {
      case "new_message":
        pushFeed(`${e.data.direction === "in" ? "Chat" : "Bot"}: ${e.data.text}`);
        break;
      case "new_order":
        pushFeed(`New order ₹${e.data.total} for ${e.data.customer_name || e.data.customer_no}`);
        refresh();
        break;
      case "order_update":
        pushFeed(`Order #${e.data.id.slice(0, 4)} -> ${e.data.status}`);
        refresh();
        break;
      case "stock_update":
        pushFeed(`${e.data.name}: stock -> ${e.data.stock_qty}`);
        setHighlight(e.data.product_id);
        setTimeout(() => setHighlight(undefined), 1500);
        refresh();
        break;
      case "low_stock":
        pushFeed(`Low stock: ${e.data.name} (${e.data.stock_qty} left)`);
        break;
    }
  }

  function startDemoAuth() {
    setMode(authenticated ? "dashboard" : "auth");
  }

  function completeAuth(next: { email: string; shopName: string; role: "owner" | "manager" }) {
    const nextSession: DemoSession = {
      authenticated: true,
      email: next.email,
      role: next.role,
      shopName: next.shopName,
      grantedAt: new Date().toISOString(),
    };
    setSession(nextSession);
    saveSession(nextSession);
    setMode("onboarding");
  }

  function completeOnboarding() {
    setMode("dashboard");
  }

  function signOut() {
    clearSession();
    setSession(null);
    setMode("landing");
    setPage("home");
    setFeed([]);
    setLive(false);
  }

  if (mode === "landing") {
    return <Landing onSignIn={startDemoAuth} onDashboard={startDemoAuth} />;
  }

  if (mode === "auth") {
    return (
      <Auth
        onDone={() => {
          completeAuth({ email: "owner@munim.ai", shopName: "My Shop", role: "owner" });
        }}
      />
    );
  }

  if (mode === "onboarding") {
    return <Onboarding onComplete={completeOnboarding} onBack={() => setMode("auth")} />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar page={page} onNav={(p: string) => setPage(p as PageKey)} business={business ?? null} live={live} onLogout={signOut} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden md:ml-64">
        <header className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-touch-target-min bg-surface shadow-sm z-10 md:hidden">
          <h1 className="font-display text-display-lg-mobile font-bold text-primary">Munim.ai</h1>
          <div className="flex gap-4">
            <button className="text-on-surface-variant hover:bg-surface-container p-2 rounded-full transition-all">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="text-on-surface-variant hover:bg-surface-container p-2 rounded-full transition-all">
              <span className="material-symbols-outlined">storefront</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop pb-[100px] md:pb-margin-desktop">
          {!business && (
            <div className="max-w-5xl mx-auto">
              <Card className="p-6 text-sm text-on-surface-variant">
                Connecting to backend... make sure it is running on :8000.
              </Card>
            </div>
          )}

          {business && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
              <div className="min-w-0 space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-label-caps text-label-caps text-primary-container">
                      {session?.shopName || business.name}
                    </div>
                    <div className="font-display text-display-lg-mobile font-bold tracking-tight text-on-surface">
                      {PAGE_TITLES[page]}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        live ? "bg-secondary-container/30 text-secondary" : "bg-surface-container-low text-on-surface-variant"
                      }`}
                    >
                      <span className="relative flex h-2 w-2 mr-2">
                        <span className={`absolute inline-flex h-full w-full animate-pulse-ring rounded-full ${live ? "bg-secondary-fixed" : "bg-outline"} opacity-75`} />
                        <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? "bg-secondary-fixed" : "bg-outline"}`} />
                      </span>
                      {live ? "Live" : "Connecting"}
                    </span>
                  </div>
                </div>

                {page === "home" && <Home />}
                {page === "inventory" && <Inventory />}
                {page === "orders" && <Orders />}
                {page === "crm" && <CRM />}
                {page === "analytics" && <Analytics />}
                {page === "settings" && <Settings />}
              </div>

              <div className="lg:sticky lg:top-24">
                <WhatsappSimulator />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
