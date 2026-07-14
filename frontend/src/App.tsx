import { lazy, Suspense, useEffect, useState } from "react";
import { api, openDashboardSocket } from "./api";
import Sidebar, { type PageKey } from "./components/Sidebar";
import { WhatsappSimulator } from "./components/WhatsappSimulator";
import { Home } from "./pages/Home";
import { Inventory } from "./pages/Inventory";
import { Orders } from "./pages/Orders";
import { CRM } from "./pages/CRM";
import { Settings } from "./pages/Settings";
import { Invoice } from "./pages/Invoice";
import Landing from "./pages/Landing";
import { Auth } from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import type { Business, WsEvent } from "./types";
import { Card } from "./components/ui";
import { clearSession, loadSession, saveSession, type DemoSession } from "./lib/session";

const Analytics = lazy(async () => {
  const module = await import("./pages/Analytics");
  return { default: module.Analytics };
});

type View = "landing" | "auth" | "onboarding" | "dashboard";

// Front-door router: Landing → Auth → Onboarding → the live Dashboard.
export default function App() {
  const [session, setSession] = useState<DemoSession | null>(() => loadSession());
  const [view, setView] = useState<View>(() => {
    const path = window.location.pathname;
    if (path === "/auth") return "auth";
    if (path === "/onboarding") return "onboarding";
    if (path.startsWith("/dashboard")) {
      return loadSession()?.authenticated ? "dashboard" : "auth";
    }
    return "landing";
  });
  const [page, setPage] = useState<PageKey>(() => {
    const path = window.location.pathname;
    if (path.startsWith("/dashboard/")) {
      const sub = path.substring("/dashboard/".length) as PageKey;
      const validPages: PageKey[] = ["home", "inventory", "orders", "crm", "analytics", "settings"];
      if (validPages.includes(sub)) {
        return sub;
      }
    }
    return "home";
  });

  const authenticated = Boolean(session?.authenticated);

  // Sync view and page state to browser URL path
  useEffect(() => {
    const currentPath = window.location.pathname;
    let targetPath = "/";
    if (view === "auth") {
      targetPath = "/auth";
    } else if (view === "onboarding") {
      targetPath = "/onboarding";
    } else if (view === "dashboard") {
      targetPath = page === "home" ? "/dashboard" : `/dashboard/${page}`;
    }

    if (currentPath !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
  }, [view, page]);

  // Sync browser back/forward buttons back to React state
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === "/auth") {
        setView("auth");
      } else if (path === "/onboarding") {
        setView("onboarding");
      } else if (path.startsWith("/dashboard")) {
        const authOk = Boolean(loadSession()?.authenticated);
        setView(authOk ? "dashboard" : "auth");
        
        const sub = path.substring("/dashboard/".length) as PageKey;
        const validPages: PageKey[] = ["home", "inventory", "orders", "crm", "analytics", "settings"];
        if (validPages.includes(sub)) {
          setPage(sub);
        } else {
          setPage("home");
        }
      } else {
        setView("landing");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (view === "landing") {
    return (
      <Landing
        onSignIn={() => setView(authenticated ? "dashboard" : "auth")}
        onDashboard={() => setView(authenticated ? "dashboard" : "auth")}
      />
    );
  }

  if (view === "auth") {
    return (
      <Auth
        onDone={({ phone, accessToken }) => {
          const nextSession: DemoSession = {
            authenticated: true,
            accessToken,
            email: "owner@munim.ai",
            phone,
            shopName: "Ramesh Vastralaya",
            role: "owner",
            grantedAt: new Date().toISOString(),
          };
          setSession(nextSession);
          saveSession(nextSession);
          setView("onboarding");
        }}
      />
    );
  }

  if (view === "onboarding") {
    return (
      <Onboarding
        phone={session?.phone || ""}
        onBack={() => setView("auth")}
        onComplete={(business) => {
          const nextSession: DemoSession = {
            ...session!,
            businessId: business.id,
            shopName: business.name,
          };
          setSession(nextSession);
          saveSession(nextSession);
          setView("dashboard");
        }}
      />
    );
  }

  return (
    <Dashboard
      session={session}
      page={page}
      setPage={setPage}
      onSignOut={() => {
        clearSession();
        setSession(null);
        setView("landing");
        setPage("home");
      }}
      onLanding={() => setView("landing")}
    />
  );
}

const PAGE_TITLES: Record<PageKey, string> = {
  home: "Overview",
  inventory: "Inventory",
  orders: "Orders",
  invoice: "Invoices",
  crm: "Customers",
  analytics: "Analytics",
  settings: "Settings",
};

interface DashboardProps {
  session: DemoSession | null;
  page: PageKey;
  setPage: (p: PageKey) => void;
  onSignOut: () => void;
  onLanding: () => void;
}

function Dashboard({ session, page, setPage, onSignOut, onLanding }: DashboardProps) {
  const [business, setBusiness] = useState<Business | undefined>();
  const [live, setLive] = useState(false);
  const [polling, setPolling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [feed, setFeed] = useState<string[]>([]);
  const [highlight, setHighlight] = useState<string | undefined>();
  const authenticated = Boolean(session?.authenticated);

  useEffect(() => {
    if (session?.businessId) {
      api.getBusiness(session.businessId).then(setBusiness).catch(() => {
        api.businesses().then((list) => setBusiness(list[0])).catch(() => {});
      });
    } else {
      api.businesses().then((list) => setBusiness(list[0])).catch(() => {});
    }
  }, [session]);

  // Websocket when available; polling fallback for serverless production deploys.
  useEffect(() => {
    if (!business || !authenticated) return;
    
    const businessId = business.id;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let pollInterval: any = null;
    let isCleanup = false;

    function startPolling() {
      setPolling(true);
      setLive(false);
      refresh();
      pollInterval = setInterval(refresh, 5000);
    }

    function connect() {
      if (isCleanup) return;
      ws = openDashboardSocket(businessId, (e: WsEvent) => handleEvent(e), session?.accessToken);
      if (!ws) {
        startPolling();
        return;
      }
      
      ws.onopen = () => {
        setPolling(false);
        setLive(true);
      };
      
      ws.onclose = () => {
        setLive(false);
        if (!isCleanup) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
      
      ws.onerror = () => {
        setLive(false);
      };
    }

    connect();

    return () => {
      isCleanup = true;
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [business, authenticated, session?.accessToken]);

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

  function signOut() {
    onSignOut();
    setPage("home");
    setFeed([]);
    setLive(false);
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar page={page} onNav={(p: string) => setPage(p as PageKey)} business={business ?? null} live={live} onLogout={signOut} onLanding={onLanding} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden md:ml-64">
        <header className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-touch-target-min bg-surface shadow-sm z-10 md:hidden">
          <h1 onClick={onLanding} className="font-display text-display-lg-mobile font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity">Munim.ai</h1>
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
                {import.meta.env.VITE_API_URL 
                  ? "Connecting to deployed backend... (If this is the first load, the server may take up to 1 minute to wake up)."
                  : "Connecting to backend... make sure it is running on :8000."}
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
                      {live ? "Live" : polling ? "Polling" : "Connecting"}
                    </span>
                  </div>
                </div>

                {page === "home" && <Home bid={business.id} refreshKey={refreshKey} feed={feed} />}
                {page === "inventory" && <Inventory bid={business.id} refreshKey={refreshKey} highlight={highlight} />}
                {page === "orders" && <Orders bid={business.id} business={business} refreshKey={refreshKey} onChange={refresh} />}
                {page === "invoice" && <Invoice bid={business.id} />}
                {page === "crm" && <CRM bid={business.id} refreshKey={refreshKey} />}
                {page === "analytics" && (
                  <Suspense fallback={<Card className="p-8 text-center text-on-surface-variant">Loading analytics...</Card>}>
                    <Analytics bid={business.id} refreshKey={refreshKey} />
                  </Suspense>
                )}
                {page === "settings" && <Settings business={business} onSaved={() => api.getBusiness(business.id).then(setBusiness)} />}
              </div>

              <div className="lg:sticky lg:top-24">
                <WhatsappSimulator businessId={business.id} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
