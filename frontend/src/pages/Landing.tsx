import { useEffect, useState } from "react";
import Lenis from "lenis";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "Story", href: "#story" },
  { label: "How It Works", href: "#how-it-works" },
];

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.classList.add("animate-slide-up");
            el.style.opacity = "1";
            observer.unobserve(el);
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.1 }
    );

    document.querySelectorAll(".reveal-on-scroll").forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.opacity = "0";
      observer.observe(htmlEl);
    });

    return () => observer.disconnect();
  }, []);
}

function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.8,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    document.documentElement.classList.add("lenis");

    return () => {
      lenis.destroy();
      document.documentElement.classList.remove("lenis");
    };
  }, []);
}

export default function Landing({ onSignIn, onDashboard }: { onSignIn: () => void; onDashboard: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useLenis();
  useScrollReveal();

  return (
    <div className="relative overflow-hidden bg-background">
      <header className="fixed top-0 w-full bg-surface/90 backdrop-blur-md z-50 shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center h-20 px-margin-mobile md:px-margin-desktop w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="font-headline-md text-headline-md text-primary">Munim.ai</span>
          </div>
          <nav className="hidden md:flex gap-8 items-center">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-body-lg text-body-lg text-on-surface-variant hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button
              onClick={onSignIn}
              className="hidden md:inline-flex bg-primary-container text-white px-6 py-3 rounded-full font-body-lg text-body-lg shadow-float-depth hover:scale-95 transition-transform duration-150 min-h-touch-target-min items-center justify-center"
            >
              Sign in
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-on-surface min-h-touch-target-min min-w-touch-target-min flex items-center justify-center"
            >
              <span className="material-symbols-outlined">{mobileOpen ? "close" : "menu"}</span>
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden bg-surface border-t border-outline-variant/20 px-margin-mobile pb-6 pt-2 flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="font-body-lg text-body-lg text-on-surface-variant hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={onDashboard}
              className="bg-primary-container text-white px-6 py-3 rounded-full font-body-lg text-body-lg shadow-float-depth hover:scale-95 transition-transform duration-150 min-h-touch-target-min"
            >
              Go live free
            </button>
          </div>
        )}
      </header>

      <main className="relative">
        {/* HOME / HERO */}
        <section id="home" className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12 reveal-on-scroll">
            <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest block mb-4">FOR CUSTOMERS AND SHOP OWNERS</span>
            <h2 className="font-display text-display-lg-mobile md:text-display-lg text-primary mb-6">
              One WhatsApp number. However they ask, it understands.
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Customers don't search anymore — they point, screenshot, and speak.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-surface rounded-2xl p-card-padding shadow-soft-depth flex flex-col gap-8 h-full border border-outline-variant/30 relative overflow-hidden group reveal-on-scroll">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-fixed/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="relative z-10 flex flex-col gap-2">
                <h3 className="font-headline-md text-headline-md text-on-surface">1. Text Context</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Natural language understanding in Hinglish, Marathi, and pure Hindi.</p>
              </div>
              <div className="mt-auto relative z-10 bg-surface-container-low rounded-xl p-4 flex flex-col gap-3">
                <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm w-3/4 text-sm text-on-surface border border-outline-variant/20">
                  Nike shoes size 9 available?
                </div>
                <div className="bg-primary-container p-3 rounded-lg rounded-tr-none shadow-sm w-[85%] self-end text-sm text-on-primary-container">
                  Haan, 2 designs available hain. ₹<span className="font-numeral-md">2,499</span> and ₹<span className="font-numeral-md">3,199</span>. Send karu pictures?
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-2xl p-card-padding shadow-soft-depth flex flex-col gap-8 h-full border border-outline-variant/30 relative overflow-hidden group reveal-on-scroll">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-fixed/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="relative z-10 flex flex-col gap-2">
                <h3 className="font-headline-md text-headline-md text-on-surface">2. Visual Search</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Visual recognition like a shopkeeper's eye.</p>
              </div>
              <div className="mt-auto relative z-10 flex flex-col gap-4">
                <div className="relative rounded-xl overflow-hidden shadow-sm h-32 w-full border border-outline-variant/20 bg-surface-container-lowest flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-primary/30">image</span>
                </div>
                <div className="bg-primary-container p-3 rounded-lg rounded-tr-none shadow-sm w-full text-sm text-on-primary-container">
                  3 similar milte-julte hain.
                </div>
                <div className="flex items-start gap-2 bg-secondary-container/20 p-3 rounded-lg border border-secondary-container/50">
                  <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                  <p className="font-label-caps text-label-caps text-on-surface-variant normal-case">We always say "closest match" — never "exact".</p>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-2xl p-card-padding shadow-soft-depth flex flex-col gap-8 h-full border border-outline-variant/30 relative overflow-hidden group reveal-on-scroll">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-fixed/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="relative z-10 flex flex-col gap-2">
                <h3 className="font-headline-md text-headline-md text-on-surface">3. Voice Notes</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Instant transcription and intent extraction from messy audio.</p>
              </div>
              <div className="mt-auto relative z-10 flex flex-col gap-4">
                <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm w-[90%] text-sm text-on-surface border border-outline-variant/20 flex items-center gap-3">
                  <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0 shadow-soft-depth">
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  </button>
                  <div className="flex-grow h-1.5 bg-surface-container-high rounded-full overflow-hidden flex items-center gap-0.5">
                    <div className="w-1 h-full bg-primary/30" /><div className="w-1 h-3/4 bg-primary/50" /><div className="w-1 h-full bg-primary/80" /><div className="w-1 h-1/2 bg-primary" /><div className="w-1 h-3/4 bg-primary/80" /><div className="w-1 h-1/4 bg-primary/30" /><div className="w-1 h-full bg-primary/50" />
                  </div>
                  <span className="text-xs text-on-surface-variant ml-1 font-numeral-md">0:04</span>
                </div>
                <div className="bg-primary-container p-4 rounded-lg rounded-tr-none shadow-sm w-full text-sm text-on-primary-container flex flex-col gap-2">
                  <div className="flex justify-between items-center border-b border-white/20 pb-2">
                    <span>Cart Summary</span>
                    <span className="font-numeral-md font-bold">#ORD-992</span>
                  </div>
                  <div className="flex justify-between items-center py-1"><span>2kg Tandul</span><span className="font-numeral-md">₹110</span></div>
                  <div className="flex justify-between items-center py-1"><span>1 Maggi</span><span className="font-numeral-md">₹38</span></div>
                  <div className="flex justify-between items-center border-t border-white/20 pt-2 font-bold mt-1"><span>Total</span><span className="font-numeral-md">₹148</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto w-full bg-white rounded-2xl p-card-padding shadow-soft-depth border border-outline-variant/30 flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:p-8 mt-section-gap reveal-on-scroll">
            <div className="flex flex-col gap-2 md:w-1/3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary animate-breathe" />
                <h2 className="font-headline-md text-headline-md text-on-surface">The "Yes" Trigger</h2>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">When the customer confirms, the system takes over instantly.</p>
            </div>
            <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["Order created", "Stock updates", "Payment link sent", "Profile updates", "Dashboard updates"].map((item) => (
                <div key={item} className={`flex items-center gap-3 bg-surface-container-low p-3 rounded-lg ${item === "Dashboard updates" ? "sm:col-span-2 sm:mx-auto sm:w-1/2" : ""}`}>
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="font-body-sm text-body-sm text-on-surface font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* STORY */}
        <section id="story" className="pb-section-gap px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center mb-12 md:mb-24">
            <span className="font-label-caps text-label-caps text-outline tracking-widest uppercase mb-4 block reveal-on-scroll">WHY WE BUILT THIS</span>
            <h2 className="font-display text-display-lg-mobile md:text-display-lg text-primary mb-6 reveal-on-scroll">
              Every shop deserves a munim.
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto reveal-on-scroll">
              The trusted clerk who knew the accounts, the stock, and every customer by name. We built that clerk again — as an AI that lives on WhatsApp.
            </p>
          </div>

          <div className="max-w-5xl mx-auto mb-section-gap md:mb-32">
            <div className="flex flex-col md:flex-row gap-gutter md:gap-16 items-center">
              <div className="w-full md:w-1/2 reveal-on-scroll">
                <div className="rounded-2xl overflow-hidden shadow-soft-depth relative bg-surface-container-high">
                  <div className="w-full aspect-[4/3] relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-container-high" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                      <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-5xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
                      </div>
                      <div className="text-center">
                        <div className="font-headline-md text-headline-md text-on-surface">Ramesh General Store</div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">Kolhapur, Maharashtra</div>
                      </div>
                      <div className="flex gap-6 mt-2">
                        <div className="text-center">
                          <div className="font-numeral-lg text-numeral-md text-primary">300+</div>
                          <div className="font-label-caps text-label-caps text-on-surface-variant">Items</div>
                        </div>
                        <div className="text-center">
                          <div className="font-numeral-lg text-numeral-md text-primary">50+</div>
                          <div className="font-label-caps text-label-caps text-on-surface-variant">Orders/day</div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 bg-surface/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2 shadow-sm border border-outline-variant/20">
                      <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-breathe" />
                      <span className="font-numeral-md text-sm text-on-surface">Live Data</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 flex flex-col justify-center reveal-on-scroll">
                <h3 className="font-headline-md text-headline-md text-primary mb-4">Meet Ramesh.</h3>
                <p className="font-body-lg text-body-lg text-on-surface-variant mb-4">
                  He runs a bustling general store in Kolhapur, managing over 300 different items daily. He doesn't have time to learn complicated software or sit at a computer entering receipts.
                </p>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  For Ramesh, his storefront isn't just a physical space; it's heavily reliant on WhatsApp. Orders come in via voice notes, suppliers send bills as blurry photos, and customers promise payment over text. It's a digital business disguised as a traditional shop.
                </p>
              </div>
            </div>
          </div>





          <div className="max-w-3xl mx-auto text-center pb-12 reveal-on-scroll">
            <h2 className="font-display text-display-lg-mobile md:text-display-lg text-primary mb-8">
              We're not building software for shops. We're building the memory they never had time to keep.
            </h2>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="pb-section-gap px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-12 reveal-on-scroll">
            <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase block mb-4">The Full Journey</span>
            <h2 className="font-display text-display-lg-mobile md:text-display-lg text-primary mb-6">
              From a WhatsApp message to a number on your dashboard.
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Here's exactly what happens, start to finish.
            </p>
          </div>

          <div className="bg-surface-container-lowest py-16 px-margin-mobile md:px-margin-desktop border-y border-surface-variant rounded-2xl mb-section-gap reveal-on-scroll">
            <div className="max-w-7xl mx-auto w-full">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative gap-8 md:gap-4 z-10">
                {["Message", "Detect", "Intent", "Shelf", "Action", "Reply", "Dashboard"].map((step, i) => {
                  const subLabels = ["Arrives", "Lang/Type", "Mapping", "Check", "Execute", "Send", "Update"];
                  return (
                    <div key={step} className="flex-1 flex flex-row md:flex-col items-center gap-4 relative w-full">
                      <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-numeral-md text-numeral-md flex-shrink-0 z-10 border-4 border-surface-container-lowest">
                        {i + 1}
                      </div>
                      <div className="text-left md:text-center">
                        <div className="font-headline-md text-body-lg text-on-surface">{step}</div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant hidden md:block">{subLabels[i]}</div>
                      </div>
                      {i < 6 && <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-0.5 bg-outline-variant -z-10" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-section-gap reveal-on-scroll">
            <div className="bg-surface-container-lowest rounded-xl shadow-soft-depth p-card-padding relative flex flex-col gap-4 border border-surface-variant">
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-numeral-md text-body-sm border-2 border-surface">1</div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div className="bg-surface-container rounded-2xl rounded-tl-none p-3 text-body-sm text-on-surface">
                  Bhai, 5 peti Maggi bhej dena kal subah.
                </div>
              </div>
              <div className="flex items-end gap-3 justify-end mt-4 relative">
                <div className="absolute -left-4 top-2 w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-numeral-md text-label-caps border border-surface">3</div>
                <div className="bg-primary-container text-on-primary-container rounded-2xl rounded-tr-none p-3 text-body-sm">
                  Order confirmed. 5 boxes Maggi scheduled for tomorrow morning.
                </div>
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shrink-0">
                  <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl shadow-soft-depth p-card-padding relative flex flex-col gap-4 border border-surface-variant">
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-numeral-md text-body-sm border-2 border-surface">4</div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined">storefront</span>
                </div>
                <div className="bg-surface-container rounded-2xl rounded-tl-none p-3 text-body-sm text-on-surface w-40 h-32 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary/40">receipt_long</span>
                </div>
              </div>
              <div className="flex items-end gap-3 justify-end mt-4 relative">
                <div className="absolute -left-4 top-2 w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-numeral-md text-label-caps border border-surface">5</div>
                <div className="bg-primary-container text-on-primary-container rounded-2xl rounded-tr-none p-3 text-body-sm">
                  Invoice scanned. Added ₹12,450 to pending payables for Sharma Distributors.
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl shadow-soft-depth p-card-padding relative flex flex-col gap-4 border border-surface-variant">
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-numeral-md text-body-sm border-2 border-surface">2</div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div className="bg-surface-container rounded-full rounded-tl-none py-2 px-4 flex items-center gap-2 w-48 text-primary">
                  <span className="material-symbols-outlined">play_arrow</span>
                  <div className="h-1 flex-grow bg-outline-variant rounded-full overflow-hidden">
                    <div className="w-1/3 h-full bg-primary" />
                  </div>
                  <span className="text-[10px] font-numeral-md">0:14</span>
                </div>
              </div>
              <div className="flex items-end gap-3 justify-end mt-4 relative">
                <div className="absolute -left-4 top-2 w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-numeral-md text-label-caps border border-surface">7</div>
                <div className="bg-primary-container text-on-primary-container rounded-2xl rounded-tr-none p-3 text-body-sm">
                  Recorded expense: ₹500 for transport. Dashboard updated.
                </div>
              </div>
            </div>
          </div>



          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-section-gap reveal-on-scroll">
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="font-display text-display-lg-mobile md:text-display-lg text-primary mb-4">Ready when you are.</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">Three steps to a living ledger. No IT team required.</p>
              </div>
              <div className="flex flex-col gap-6 border-l-2 border-surface-variant pl-6 ml-3">
                {[
                  { num: 1, title: "Connect WhatsApp", desc: "Scan a QR code to link your business number.", active: false },
                  { num: 2, title: "Add Inventory", desc: "Upload an excel sheet or snap a photo of your register.", active: false },
                  { num: 3, title: "Go Live", desc: "Start chatting. The dashboard builds itself.", active: true },
                ].map((step) => (
                  <div key={step.num} className="relative">
                    <div className={`absolute -left-[35px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center ${step.active ? "bg-primary border-2 border-primary text-on-primary" : "bg-surface-container border-2 border-primary"}`}>
                      {step.active ? (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      ) : (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                    <h4 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                      {step.num}. {step.title}
                      {step.active && <span className="w-2 h-2 rounded-full bg-secondary-container animate-breathe inline-block" />}
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl shadow-soft-depth p-6 md:p-8 border border-surface-variant flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-surface-variant pb-4">
                <div className="font-headline-md text-headline-md text-on-surface">Dashboard Modules</div>
                <span className="material-symbols-outlined text-outline">tune</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { icon: "space_dashboard", label: "Home" },
                  { icon: "inventory_2", label: "Inventory" },
                  { icon: "receipt_long", label: "Orders", pulse: true },
                  { icon: "group", label: "CRM" },
                  { icon: "bar_chart", label: "Analytics" },
                  { icon: "settings", label: "Settings" },
                ].map((mod) => (
                  <div key={mod.label} className="aspect-square rounded-xl bg-surface-container-low flex flex-col items-center justify-center gap-2 hover:bg-surface-container transition-colors cursor-pointer border border-transparent hover:border-surface-variant relative">
                    <span className="material-symbols-outlined text-primary text-[32px]">{mod.icon}</span>
                    <span className="font-body-sm text-body-sm font-medium">{mod.label}</span>
                    {mod.pulse && <div className="absolute top-2 right-2 w-2 h-2 bg-secondary-container rounded-full" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center reveal-on-scroll">
            <button
              onClick={onDashboard}
              className="bg-primary text-on-primary px-8 py-4 rounded-xl font-body-lg text-body-lg min-h-touch-target-min hover:opacity-90 transition-all active:scale-95 shadow-float-depth inline-flex items-center gap-2"
            >
              Go live in 10 minutes
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-surface-container-low w-full py-12 border-t border-outline-variant/20">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 px-margin-mobile md:px-margin-desktop w-full max-w-7xl mx-auto">
            <div className="flex flex-col gap-2">
              <div className="font-headline-md text-headline-md text-primary">Munim.ai</div>
              <p className="font-body-sm text-body-sm text-on-surface max-w-sm">
                &copy; 2026 Munim.ai. Modern bookkeeping for the living ledger.
              </p>
            </div>
            <div className="flex flex-wrap gap-6">
              <a href="#" className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors">Contact Us</a>
              <a href="#" className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors">Documentation</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
