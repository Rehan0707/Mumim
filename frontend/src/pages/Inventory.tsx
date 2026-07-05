import { useEffect, useState } from "react";
import { api } from "../api";
import type { Product } from "../types";
import { Card, formatINR } from "../components/ui";

export function Inventory({ bid, refreshKey, highlight }: { bid: string; refreshKey: number; highlight?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!bid) return;
    api.products(bid).then(setProducts).catch(() => {});
  }, [bid, refreshKey]);

  const filtered = products.filter((p) =>
    `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800">Inventory · {products.length} products</h3>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-brand-500"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => {
          const low = p.stock_qty <= 3;
          const hl = highlight === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-3 transition ${hl ? "flash border-brand-400" : "border-slate-100"} ${
                low ? "bg-amber-50/50" : "bg-white"
              }`}
            >
              <div className="h-28 rounded-lg bg-slate-100 mb-2 overflow-hidden grid place-items-center">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-slate-300 text-3xl">📦</span>
                )}
              </div>
              <div className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">{p.name}</div>
              <div className="text-xs text-slate-400 mb-1">
                {p.brand}
                {p.attributes.size ? ` · size ${p.attributes.size}` : ""}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{formatINR(p.price)}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${low ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {p.stock_qty} in stock
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
