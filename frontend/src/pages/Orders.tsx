import { useState } from "react";

type FilterKey = "all" | "created" | "reserved" | "paid" | "fulfilled" | "cancelled";
type OrderStatus = "created" | "reserved" | "paid" | "fulfilled" | "cancelled";

interface MockOrder {
  id: string;
  status: OrderStatus;
  customerName: string;
  initials: string;
  phone: string;
  total: number;
  items: { name: string; detail: string; qty: number; price: number }[];
  createdAt: string;
}

const ORDERS: MockOrder[] = [
  {
    id: "ORD-9021", status: "paid", customerName: "Anjali Sharma", initials: "AS", phone: "+91 98765 43210",
    total: 2499,
    items: [
      { name: "Nike Air", detail: "Size: 9 | Qty: 1", qty: 1, price: 2000 },
      { name: "Sports Socks", detail: "Color: White | Qty: 2", qty: 2, price: 499 },
    ],
    createdAt: "2026-07-05T10:42:00Z",
  },
  {
    id: "ORD-9020", status: "created", customerName: "Rahul Desai", initials: "RD", phone: "+91 91234 56789",
    total: 1850,
    items: [
      { name: "Puma Classic", detail: "Qty: 1", qty: 1, price: 1850 },
    ],
    createdAt: "2026-07-05T09:15:00Z",
  },
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  created: "Created",
  reserved: "Reserved",
  paid: "Paid",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  created: "bg-[#FFF8E1] text-[#F57C00]",
  reserved: "bg-surface-container-high text-on-surface-variant",
  paid: "bg-secondary-container/30 text-secondary",
  fulfilled: "bg-primary-container/20 text-primary",
  cancelled: "bg-error-container/30 text-error",
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "created", label: "Created" },
  { key: "reserved", label: "Reserved" },
  { key: "paid", label: "Paid" },
  { key: "fulfilled", label: "Fulfilled" },
  { key: "cancelled", label: "Cancelled" },
];

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export default function Orders() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<MockOrder | null>(null);

  const filtered = filter === "all" ? ORDERS : ORDERS.filter((o) => o.status === filter);

  return (
    <div className="max-w-5xl mx-auto space-y-section-gap">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Orders Pipeline</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Manage and track customer orders in real-time.</p>
        </div>
        <button className="bg-primary-container text-white px-6 py-3 rounded-full font-body-lg text-body-lg flex items-center gap-2 min-h-touch-target-min shadow-float-depth hover:scale-95 transition-transform">
          <span className="material-symbols-outlined text-[20px]">add</span>
          New Order
        </button>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full font-body-sm text-body-sm transition-all duration-200 min-h-touch-target-min ${
                filter === f.key
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-breathe" />
          <span className="font-body-sm text-body-sm">Live Sync</span>
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-soft-depth overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_1.5fr_1fr_0.5fr_1fr] gap-4 px-card-padding py-4 bg-surface-container-low border-b border-outline-variant/30">
          <span className="font-label-caps text-label-caps text-on-surface-variant">Order ID</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant">Customer</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant">Items</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant">Status</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant text-right">Amount</span>
        </div>
        <div className="divide-y divide-outline-variant/20">
          {filtered.map((order) => (
            <div
              key={order.id}
              onClick={() => setSelected(order)}
              className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_0.5fr_1fr] gap-2 md:gap-4 px-card-padding py-4 items-center hover:bg-surface-container-low/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="font-numeral-md text-numeral-md text-primary">{order.id}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span className="font-body-lg text-body-lg font-semibold">{order.initials}</span>
                </div>
                <p className="font-body-lg text-body-lg text-on-surface">{order.customerName}</p>
              </div>
              <div className="text-body-sm text-on-surface-variant">
                {order.items.map((item) => item.name).join(", ")}
              </div>
              <div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
              <div className="font-numeral-md text-numeral-md text-on-surface text-right">
                {formatINR(order.total)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-20" onClick={() => setSelected(null)}>
          <div className="bg-surface rounded-2xl shadow-float-depth max-w-lg w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-card-padding border-b border-outline-variant/20">
              <h3 className="font-headline-md text-headline-md text-on-surface">Order Details</h3>
              <button onClick={() => setSelected(null)} className="p-2 text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-card-padding space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="font-headline-md text-headline-md">{selected.initials}</span>
                </div>
                <div>
                  <h4 className="font-headline-md text-headline-md text-on-surface">{selected.customerName}</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{selected.phone}</p>
                </div>
              </div>

              <div className="border-t border-outline-variant/20 pt-4">
                <h5 className="font-label-caps text-label-caps text-on-surface-variant mb-3">Items</h5>
                <div className="space-y-3">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div>
                        <p className="font-body-sm text-body-sm text-on-surface">{item.name}</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">{item.detail}</p>
                      </div>
                      <span className="font-numeral-md text-numeral-md text-on-surface">₹{item.price.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-outline-variant/20 pt-4 space-y-2">
                <div className="flex justify-between text-body-sm text-on-surface-variant">
                  <span>Subtotal</span>
                  <span className="font-numeral-md">{formatINR(selected.total)}</span>
                </div>
                <div className="flex justify-between text-body-sm text-on-surface-variant">
                  <span>Tax</span>
                  <span className="font-numeral-md">₹0</span>
                </div>
                <div className="flex justify-between font-headline-md text-headline-md text-on-surface border-t border-outline-variant/20 pt-2">
                  <span>Total</span>
                  <span className="font-numeral-md">{formatINR(selected.total)}</span>
                </div>
              </div>

              <button className="w-full min-h-touch-target-min rounded-xl bg-primary text-on-primary font-body-lg text-body-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                <span className="material-symbols-outlined">check_circle</span>
                Mark as Fulfilled
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
