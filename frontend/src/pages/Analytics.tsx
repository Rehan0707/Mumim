const days = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 8, 1 + i);
  return {
    label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    value: Math.floor(Math.random() * 30000) + 5000,
  };
});

const maxRevenue = Math.max(...days.map((d) => d.value));

const topMovers = [
  { rank: 1, name: "Nike Air Max", detail: "Size 9, White", sold: 42 },
  { rank: 2, name: "Linen Shirt", detail: "Medium, Beige", sold: 28 },
  { rank: 3, name: "Filter Roast", detail: "250g bag", sold: 15 },
];

export default function Analytics() {
  return (
    <div className="max-w-5xl mx-auto space-y-section-gap">
      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface">Analytics</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Proof it's working.</p>
      </div>

      <div className="flex gap-3">
        {["30 Days", "Custom"].map((period) => (
          <button
            key={period}
            className={`px-5 py-2 rounded-full font-body-sm text-body-sm min-h-touch-target-min ${
              period === "30 Days"
                ? "bg-primary-container text-on-primary-container"
                : "bg-surface-container-low text-on-surface-variant"
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 bg-surface rounded-xl p-card-padding shadow-soft-depth">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-6">Revenue Trend</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Last 30 Days</p>
          <div className="flex items-end justify-between gap-0.5 h-64">
            {days.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                <div
                  className="w-full bg-gradient-to-t from-primary to-primary-container/70 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer"
                  style={{ height: `${(d.value / maxRevenue) * 100}%` }}
                />
                {(i === 0 || i === 14 || i === 29) && (
                  <span className="font-body-sm text-body-sm text-on-surface-variant text-[10px] -rotate-45 origin-left whitespace-nowrap">
                    {d.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-gutter">
          <div className="bg-surface rounded-xl p-card-padding shadow-soft-depth">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[24px]">insights</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                At this pace, <strong className="text-on-surface">Nike Air (size 9)</strong> runs out in <strong className="text-error">4 days</strong>.
              </p>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-card-padding shadow-soft-depth">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Top Movers</h3>
            <div className="space-y-4">
              {topMovers.map((item) => (
                <div key={item.rank} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-surface-container-low flex items-center justify-center font-numeral-md text-sm text-on-surface-variant">
                      {item.rank}
                    </span>
                    <div>
                      <p className="font-body-sm text-body-sm text-on-surface">{item.name}</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{item.detail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-numeral-md text-numeral-md text-primary">{item.sold}</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">sold</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
