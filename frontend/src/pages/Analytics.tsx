import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import type { Analytics as A } from "../types";
import { Card, formatINR } from "../components/ui";

export function Analytics({ bid, refreshKey }: { bid: string; refreshKey: number }) {
  const [a, setA] = useState<A | null>(null);

  useEffect(() => {
    if (!bid) return;
    api.analytics(bid).then(setA).catch(() => {});
  }, [bid, refreshKey]);

  if (!a) return <Card className="p-8 text-center text-slate-400">Loading analytics…</Card>;

  // stitch history + forecast for one continuous chart
  const trend = [
    ...a.revenue_trend.map((d) => ({ ...d, kind: "actual" as const })),
    ...a.forecast.map((d) => ({ ...d, forecast: d.revenue, revenue: undefined, kind: "forecast" as const })),
  ];

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-bold text-slate-800 mb-1">Revenue trend & 7-day forecast</h3>
        <p className="text-xs text-slate-400 mb-4">Solid = actual · dashed = forecast (moving average; LightGBM swap-in later)</p>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={trend} margin={{ left: -10, right: 10, top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f1" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
            <Tooltip formatter={(v: any) => (v == null ? "—" : formatINR(v))} />
            <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3 }} name="Actual" />
            <Line type="monotone" dataKey="forecast" stroke="#0d9488" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Forecast" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4">Top selling items</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={a.top_items} layout="vertical" margin={{ left: 20, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any, n) => (n === "qty" ? `${v} sold` : formatINR(v))} />
              <Bar dataKey="qty" fill="#10b981" radius={[0, 6, 6, 0]} name="qty" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4">Recommendations</h3>
          <div className="space-y-3">
            {a.recommendations.length === 0 && <p className="text-sm text-slate-400">No recommendations yet.</p>}
            {a.recommendations.slice(0, 5).map((r) => (
              <div key={r.product_id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <div className="h-10 w-10 overflow-hidden rounded-md bg-slate-100 shrink-0">
                  {r.image_url && <img src={r.image_url} alt={r.name} className="h-full w-full object-cover" loading="lazy" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-800">{r.name}</div>
                  <div className="text-xs text-slate-400">{r.reason} · {r.stock_qty} in stock</div>
                </div>
                <div className="text-sm font-bold text-slate-800">{formatINR(r.price)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4">Restock forecast</h3>
          <div className="space-y-2">
            {a.low_stock.length === 0 && <p className="text-sm text-slate-400">Everything well-stocked ✅</p>}
            {a.low_stock.map((l) => (
              <div key={l.name} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-700">{l.name}</span>
                <span className="text-xs font-semibold text-amber-700">{l.stock_qty} left · reorder soon</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
