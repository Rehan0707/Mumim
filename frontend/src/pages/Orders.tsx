import { useEffect, useState } from "react";
import { api } from "../api";
import type { Order } from "../types";
import { Badge, Card, formatINR, timeAgo } from "../components/ui";

export function Orders({ bid, refreshKey, onChange }: { bid: string; refreshKey: number; onChange: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!bid) return;
    api.orders(bid).then(setOrders).catch(() => {});
  }, [bid, refreshKey]);

  async function markPaid(o: Order) {
    await api.markPaid(o.id);
    onChange();
  }
  async function fulfill(o: Order) {
    await api.fulfill(o.id);
    onChange();
  }
  async function cancel(o: Order) {
    if (!confirm("Are you sure you want to cancel this order and restore stock?")) return;
    await api.cancelOrder(o.id);
    onChange();
  }

  return (
    <Card className="p-5">
      <h3 className="font-bold text-slate-800 mb-4">Orders · {orders.length}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b border-slate-100">
              <th className="py-2 font-semibold">Order</th>
              <th className="py-2 font-semibold">Customer</th>
              <th className="py-2 font-semibold">Items</th>
              <th className="py-2 font-semibold">Total</th>
              <th className="py-2 font-semibold">Status</th>
              <th className="py-2 font-semibold">When</th>
              <th className="py-2 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50/60">
                <td className="py-3 font-mono text-xs text-slate-500">#{o.id.slice(0, 6)}</td>
                <td className="py-3 font-medium text-slate-700">{o.customer_name || o.customer_no}</td>
                <td className="py-3 text-slate-600">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                <td className="py-3 font-bold text-slate-800">{formatINR(o.total)}</td>
                <td className="py-3"><Badge kind="status" value={o.status} /></td>
                <td className="py-3 text-slate-400 text-xs">{timeAgo(o.created_at)}</td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {o.status === "reserved" && (
                      <>
                        {o.payment_link && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(o.payment_link!);
                              alert("Payment link copied!");
                            }}
                            className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                            title="Copy payment link"
                          >
                            🔗 Link
                          </button>
                        )}
                        <button onClick={() => markPaid(o)} className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700">
                          Mark paid
                        </button>
                        <button onClick={() => cancel(o)} className="text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg">
                          Cancel
                        </button>
                      </>
                    )}
                    {o.status === "paid" && (
                      <>
                        <button onClick={() => fulfill(o)} className="text-xs font-semibold bg-brand-700 text-white px-3 py-1.5 rounded-lg hover:bg-brand-800">
                          Fulfill
                        </button>
                        <button onClick={() => cancel(o)} className="text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg">
                          Cancel
                        </button>
                      </>
                    )}
                    {(o.status === "fulfilled" || o.status === "cancelled") && <span className="text-xs text-slate-300">—</span>}
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
