const stats = [
  { label: "Today's Orders", value: "14", color: "text-primary" },
  { label: "Today's Revenue", value: "₹18,240", color: "text-primary", pulse: true },
  { label: "Pending Payments", value: "3", color: "text-[#F57C00]" },
  { label: "Low Stock Alerts", value: "2", color: "text-error" },
];

const feedItems = [
  { icon: "payments", bg: "bg-secondary-container", iconColor: "text-on-secondary-container", title: "Order #1042 paid", meta: "10:24 AM", amount: "+₹2,499", amountColor: "text-secondary-container" },
  { icon: "inventory_2", bg: "bg-[#FFF8E1]", iconColor: "text-[#F57C00]", title: "Nike Air size 9 - stock updated", meta: "09:45 AM", amount: "4 → 3", amountColor: "text-on-surface-variant" },
  { icon: "person_add", bg: "bg-surface-container-high", iconColor: "text-primary", title: "New customer: Anjali", meta: "09:12 AM", amount: "View Profile", amountColor: "text-body-sm text-on-surface-variant" },
];

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto space-y-section-gap">
      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface">Good Morning, Shop Owner</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Today is Tuesday, Oct 24</p>
      </div>

      <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-soft-depth">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#F57C00]">warning</span>
          <div>
            <p className="font-body-lg text-body-lg font-semibold text-[#E65100]">Low Stock Alert</p>
            <p className="font-body-sm text-body-sm text-[#E65100]/80">Nike Air size 9, stock 2</p>
          </div>
        </div>
        <button className="min-h-touch-target-min px-6 rounded-xl bg-primary text-on-primary font-body-lg text-body-lg flex items-center gap-2 w-full sm:w-auto justify-center hover:bg-primary/90 transition-colors">
          <span className="material-symbols-outlined">shopping_cart</span>
          Reorder reminder
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface rounded-xl p-card-padding shadow-soft-depth relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <p className="font-body-sm text-body-sm text-on-surface-variant">{stat.label}</p>
              {stat.pulse && (
                <div className="relative w-3 h-3">
                  <div className="absolute inset-0 bg-secondary-fixed rounded-full animate-pulse-ring" />
                  <div className="absolute inset-[2px] bg-secondary-fixed rounded-full" />
                </div>
              )}
            </div>
            <div className="flex justify-end border-b border-surface-variant pb-2">
              <span className={`font-numeral-lg text-numeral-lg ${stat.color}`}>{stat.value}</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 bg-surface rounded-xl p-card-padding shadow-soft-depth">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-on-surface">Recent Activity</h3>
            <button className="text-primary font-body-sm text-body-sm hover:underline">View All</button>
          </div>
          <div className="space-y-0">
            {feedItems.map((item, i) => (
              <div key={i} className="min-h-[64px] flex items-center justify-between border-b border-surface-variant last:border-0 py-3">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center ${item.iconColor}`}>
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  </div>
                  <div>
                    <p className="font-body-lg text-body-lg text-on-surface">{item.title}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{item.meta}</p>
                  </div>
                </div>
                <span className={`font-numeral-md text-numeral-md font-semibold ${item.amountColor}`}>{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary-container text-on-primary-container rounded-xl p-card-padding shadow-soft-depth flex flex-col justify-center">
          <div className="mb-4">
            <span className="material-symbols-outlined text-4xl mb-2">insights</span>
            <h3 className="font-headline-md text-headline-md">Daily Summary</h3>
          </div>
          <p className="font-body-lg text-body-lg mb-6 leading-relaxed">
            Today you've processed <strong className="font-semibold">14 orders</strong> generating <strong className="font-semibold text-secondary-container">₹18,240</strong> in revenue. Don't forget, there are <strong className="font-semibold text-[#FFB74D]">2 items</strong> that need restocking soon.
          </p>
          <button className="min-h-touch-target-min w-full border-2 border-on-primary-container rounded-xl font-body-lg text-body-lg font-semibold hover:bg-on-primary-container hover:text-primary-container transition-colors">
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
