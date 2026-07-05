import { useState } from "react";

interface Customer {
  id: string;
  name: string;
  initials: string;
  phone: string;
  segment: "vip" | "regular" | "new";
  totalSpend: number;
  lastOrder: string;
  lastOrderAmount: number;
}

interface OrderHistory {
  date: string;
  amount: number;
  label: string;
}

const customers: Customer[] = [
  { id: "1", name: "Anjali", initials: "A", phone: "+91 98765 43210", segment: "vip", totalSpend: 12500, lastOrder: "Today, 10:30 AM", lastOrderAmount: 1200 },
  { id: "2", name: "Rahul Kumar", initials: "R", phone: "+91 91234 56789", segment: "regular", totalSpend: 4200, lastOrder: "2 days ago", lastOrderAmount: 850 },
  { id: "3", name: "Sneha P.", initials: "S", phone: "+91 99887 76655", segment: "new", totalSpend: 850, lastOrder: "Yesterday", lastOrderAmount: 850 },
];

const orderHistory: Record<string, OrderHistory[]> = {
  "1": [
    { date: "Today, 10:30 AM", amount: 1200, label: "Groceries & Dairy" },
    { date: "12 Oct, 04:15 PM", amount: 3450, label: "Festival Supplies" },
    { date: "01 Oct, 09:00 AM", amount: 800, label: "Monthly Staples" },
  ],
};

const segmentColors: Record<string, string> = {
  vip: "bg-[#FFF8E1] text-[#F57C00]",
  regular: "bg-secondary-container/30 text-secondary",
  new: "bg-primary-container/20 text-primary",
};

const segmentIcons: Record<string, string> = {
  vip: "star",
  regular: "person",
  new: "fiber_new",
};

function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export default function CRM() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-section-gap">
      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface">Customer CRM</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Manage relationships, track balances, and connect on WhatsApp.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">search</span>
          <input
            type="text"
            placeholder="Search customers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-outline-variant bg-surface px-10 py-3 text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 min-h-touch-target-min"
          />
        </div>
        <button className="px-4 py-3 rounded-xl border border-outline-variant bg-surface flex items-center gap-2 min-h-touch-target-min text-on-surface-variant hover:bg-surface-container-low transition-colors">
          <span className="material-symbols-outlined text-[20px]">filter_list</span>
          <span className="font-body-sm text-body-sm">Filter</span>
        </button>
      </div>

      <div className="bg-surface rounded-xl shadow-soft-depth overflow-hidden">
        <div className="divide-y divide-outline-variant/20">
          {filtered.map((customer) => (
            <div
              key={customer.id}
              onClick={() => setSelected(customer)}
              className="p-card-padding hover:bg-surface-container-low/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                    <span className="font-headline-md text-headline-md">{customer.initials}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline-md text-headline-md text-on-surface">{customer.name}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1 ${segmentColors[customer.segment]}`}>
                        <span className="material-symbols-outlined text-[12px]">{segmentIcons[customer.segment]}</span>
                        {customer.segment.charAt(0).toUpperCase() + customer.segment.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px]">phone_iphone</span>
                        <span className="font-body-sm text-body-sm">{customer.phone}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-body-sm text-on-surface-variant">
                      <span>Last Order: {customer.lastOrder}</span>
                      <span className="font-numeral-md text-numeral-md text-on-surface">Total Spend: {formatINR(customer.totalSpend)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-full border border-secondary-container/50 text-secondary font-body-sm text-body-sm flex items-center gap-1.5 min-h-touch-target-min hover:bg-secondary-container/10 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-20" onClick={() => setSelected(null)}>
          <div className="bg-surface rounded-2xl shadow-float-depth max-w-lg w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-card-padding border-b border-outline-variant/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="font-headline-md text-headline-md">{selected.initials}</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">{selected.name}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${segmentColors[selected.segment]}`}>
                    {selected.segment.charAt(0).toUpperCase() + selected.segment.slice(1)}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-card-padding space-y-6">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">phone_iphone</span>
                <span className="font-body-sm text-body-sm">{selected.phone}</span>
              </div>

              <div className="bg-surface-container-low rounded-xl p-4">
                <p className="font-body-sm text-body-sm text-on-surface-variant">Lifetime Spend</p>
                <p className="font-numeral-lg text-numeral-lg text-primary mt-1">{formatINR(selected.totalSpend)}</p>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 min-h-touch-target-min rounded-xl bg-primary text-on-primary font-body-lg text-body-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                  Message
                </button>
                <button className="flex-1 min-h-touch-target-min rounded-xl border-2 border-primary text-primary font-body-lg text-body-lg flex items-center justify-center gap-2 hover:bg-primary/5 transition-all">
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                  New Bill
                </button>
              </div>

              <div className="border-t border-outline-variant/20 pt-4">
                <h4 className="font-headline-md text-headline-md text-on-surface mb-4">Order History</h4>
                <div className="space-y-3">
                  {(orderHistory[selected.id] || []).map((order, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-outline-variant/10 last:border-0">
                      <div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">{order.date}</p>
                        <p className="font-body-sm text-body-sm text-on-surface">{order.label}</p>
                      </div>
                      <span className="font-numeral-md text-numeral-md text-on-surface">{formatINR(order.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
