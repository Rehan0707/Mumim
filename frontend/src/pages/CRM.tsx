import { useEffect, useState } from "react";
import { api } from "../api";
import type { Customer, Order } from "../types";
import { Badge, Card, formatINR, timeAgo } from "../components/ui";

export function CRM({ bid, refreshKey }: { bid: string; refreshKey: number }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, Order[]>>({});

  useEffect(() => {
    if (!bid) return;
    api.customers(bid).then(setCustomers).catch(() => {});
  }, [bid, refreshKey]);

  async function toggle(c: Customer) {
    if (open === c.id) return setOpen(null);
    setOpen(c.id);
    if (!history[c.id]) {
      const full = await api.customer(bid, c.whatsapp_no).catch(() => null);
      if (full) setHistory((h) => ({ ...h, [c.id]: full.history }));
    }
  }

  return (
    <Card className="p-5">
      <h3 className="font-bold text-slate-800 mb-4">Customers · {customers.length}</h3>
      <div className="space-y-2">
        {customers.map((c) => (
          <div key={c.id} className="border border-slate-100 rounded-xl overflow-hidden">
            <button onClick={() => toggle(c)} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-bold">
                {(c.name || "?")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800">{c.name || c.whatsapp_no}</div>
                <div className="text-xs text-slate-400">{c.whatsapp_no} · last order {timeAgo(c.last_order)}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-800">{formatINR(c.total_spend)}</div>
                <div className="text-xs text-slate-400">{c.order_count} orders</div>
              </div>
              <Badge kind="segment" value={c.segment} />
            </button>
            {open === c.id && (
              <div className="bg-slate-50 px-4 py-3 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-500 mb-2">Order history</div>
                {(history[c.id] || []).length === 0 && <div className="text-xs text-slate-400">No orders.</div>}
                {(history[c.id] || []).map((o) => (
                  <div key={o.id} className="flex justify-between text-sm py-1">
                    <span className="text-slate-600">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</span>
                    <span className="text-slate-500">{formatINR(o.total)} · <Badge kind="status" value={o.status} /></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
