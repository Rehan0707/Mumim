import { useEffect, useState } from "react";
import { api } from "../api";
import type { Analytics, DailySummary, Order } from "../types";
import { Badge, Card, StatCard, formatINR, timeAgo } from "../components/ui";

export function Home({ bid, refreshKey, feed }: { bid: string; refreshKey: number; feed: string[] }) {
  const [a, setA] = useState<Analytics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);

  useEffect(() => {
    if (!bid) return;
    api.analytics(bid).then(setA).catch(() => {});
    api.orders(bid).then((o) => setOrders(o.slice(0, 6))).catch(() => {});
    api.dailySummary(bid).then(setSummary).catch(() => {});
  }, [bid, refreshKey]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={a ? formatINR(a.kpis.revenue_total) : "…"} sub="all-time (paid)" accent />
        <StatCard label="Orders today" value={a ? String(a.kpis.orders_today) : "…"} sub={`${a?.kpis.orders_total ?? 0} total`} />
        <StatCard label="Pending" value={a ? String(a.kpis.pending) : "…"} sub="awaiting payment" />
        <StatCard label="Customers" value={a ? String(a.kpis.customers) : "…"} sub={`${a?.kpis.low_stock_count ?? 0} low-stock items`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-bold text-slate-800 mb-3">Recent orders</h3>
          <div className="divide-y divide-slate-100">
            {orders.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">No orders yet — send one from the WhatsApp simulator →</p>}
            {orders.map((o) => (
              <div key={o.id} className="flex items-center gap-3 py-2.5">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-bold">
                  {(o.customer_name || "?")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {o.customer_name || o.customer_no} · {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                  </div>
                  <div className="text-xs text-slate-400">#{o.id.slice(0, 4)} · {timeAgo(o.created_at)}</div>
                </div>
                <div className="text-sm font-bold text-slate-800">{formatINR(o.total)}</div>
                <Badge kind="status" value={o.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-3">Live activity</h3>
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {feed.length === 0 && <p className="text-sm text-slate-400">Waiting for events…</p>}
            {feed.map((f, i) => (
              <div key={i} className={`text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 ${i === 0 ? "flash" : ""}`}>
                {f}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {summary && (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-bold text-slate-800 mb-1">Daily WhatsApp summary</h3>
              <p className="text-xs text-slate-400">Owner-ready message generated from live orders and stock.</p>
            </div>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
              F10 ready
            </span>
          </div>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700 font-sans">
            {summary.message}
          </pre>
        </Card>
      )}

      {a && a.low_stock.length > 0 && (
        <Card className="p-5 border-l-4 border-l-amber-400">
          <h3 className="font-bold text-slate-800 mb-2">⚠️ Restock alerts</h3>
          <div className="flex flex-wrap gap-2">
            {a.low_stock.map((l) => (
              <span key={l.name} className="text-sm bg-amber-50 text-amber-700 px-3 py-1 rounded-full">
                {l.name} · {l.stock_qty} left
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
