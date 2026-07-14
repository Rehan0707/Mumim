import { useEffect, useState } from "react";
import Lenis from "lenis";
import ShaderGradient from "../components/ShaderGradient";
import { SpotlightCard } from "../components/ui/spotlight-card";
import { HoverEffect } from "../components/ui/hover-effect";
import { TextRevealCard } from "../components/ui/text-reveal-card";

/* ── smooth scroll ── */
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

/* ── scroll-reveal ── */
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("animate-slide-up");
            (entry.target as HTMLElement).style.opacity = "1";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal-on-scroll").forEach((el) => {
      (el as HTMLElement).style.opacity = "0";
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
}

/* ────────────────────────────────────────────── */
/*  LANDING PAGE                                  */
/* ────────────────────────────────────────────── */
export default function Landing({
  onSignIn,
  onDashboard,
}: {
  onSignIn: () => void;
  onDashboard: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useLenis();
  useScrollReveal();

  const dashboardModules = [
    { title: "Home", description: "Store stats", link: "#", icon: "space_dashboard" },
    { title: "Inventory", description: "Stock control", link: "#", icon: "inventory_2" },
    { title: "Orders", description: "Track sales", link: "#", icon: "receipt_long", pulse: true },
    { title: "CRM", description: "Customers", link: "#", icon: "group" },
    { title: "Analytics", description: "Growth trends", link: "#", icon: "bar_chart" },
    { title: "Settings", description: "Configuration", link: "#", icon: "settings" },
  ];

  /* header blur on scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative overflow-hidden bg-[#020a07]" style={{ colorScheme: "dark" }}>
      {/* ── FIXED HEADER ── */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#020a07]/80 backdrop-blur-xl border-b border-white/[0.06]"
            : "bg-transparent"
        }`}
      >
        <div className="flex justify-between items-center h-20 px-6 md:px-12 w-full max-w-7xl mx-auto">
          {/* logo */}
          <span
            className="text-white font-display text-[22px] font-bold tracking-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            Munim<span className="text-[#4ae176]">.</span>ai
          </span>

          {/* desktop nav */}
          <nav className="hidden md:flex gap-8 items-center">
            {["Product", "Story", "How It Works"].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-white/50 text-sm font-medium hover:text-white transition-colors duration-200"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              className="hidden md:inline-flex text-white/70 text-sm font-medium hover:text-white transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={onDashboard}
              className="hidden md:inline-flex bg-white text-[#020a07] text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-white/90 transition-all active:scale-[0.97]"
            >
              Get Started
            </button>
            {/* mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-white/70 hover:text-white"
            >
              <span className="material-symbols-outlined">
                {mobileOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden bg-[#020a07]/95 backdrop-blur-xl border-t border-white/[0.06] px-6 pb-6 pt-4 flex flex-col gap-4">
            {["Product", "Story", "How It Works"].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setMobileOpen(false)}
                className="text-white/60 text-sm hover:text-white transition-colors"
              >
                {label}
              </a>
            ))}
            <button
              onClick={() => {
                setMobileOpen(false);
                onDashboard();
              }}
              className="bg-white text-[#020a07] text-sm font-semibold px-5 py-3 rounded-full"
            >
              Get Started
            </button>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════ */}
      {/*  HERO                                         */}
      {/* ══════════════════════════════════════════════ */}
      <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
        {/* Shader Gradient Background */}
        <div className="absolute inset-0 z-0">
          <ShaderGradient className="w-full h-full" />
          {/* soft radial overlay to centre attention */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020a07]" />
        </div>

        {/* content */}
        <div className="relative z-10 text-center max-w-5xl mx-auto px-6 md:px-12 pt-32 pb-24">
          {/* eyebrow */}
          <div className="reveal-on-scroll mb-8">
            <span className="inline-flex items-center gap-2 bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] text-white/70 text-xs font-medium px-4 py-2 rounded-full tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ae176] animate-breathe" />
              WhatsApp-First AI for Indian Shops
            </span>
          </div>

          {/* tagline */}
          <h1
            className="reveal-on-scroll font-display text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[0.95] mb-8"
            style={{ letterSpacing: "-0.04em" }}
          >
            The AI Munim
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4ae176] via-[#8fd5b8] to-[#abf1d4]">
              for every shop.
            </span>
          </h1>

          {/* subtitle */}
          <p className="reveal-on-scroll text-white/50 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-12 font-light">
            Sell products, track stock, and remember every customer — all through
            one WhatsApp number. Zero app install. Zero learning curve.
          </p>

          {/* CTAs */}
          <div className="reveal-on-scroll flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={onDashboard}
              className="bg-white text-[#020a07] text-base font-semibold px-8 py-4 rounded-full hover:bg-white/90 transition-all active:scale-[0.97] shadow-[0_0_40px_rgba(74,225,118,0.15)]"
            >
              Go live in 10 minutes
            </button>
            <button
              onClick={onSignIn}
              className="text-white/60 text-base font-medium hover:text-white transition-colors flex items-center gap-2"
            >
              Sign in
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/*  PRODUCT: Three Columns                       */}
      {/* ══════════════════════════════════════════════ */}
      <section id="product" className="relative py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 reveal-on-scroll">
            <span className="text-[#4ae176] text-xs font-semibold tracking-[0.15em] uppercase block mb-4">
              How Customers Interact
            </span>
            <h2
              className="font-display text-white text-3xl md:text-5xl font-bold leading-tight"
              style={{ letterSpacing: "-0.03em" }}
            >
              One number. However they ask,
              <br className="hidden md:block" /> it understands.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 — Text */}
            <SpotlightCard glowColor="green" customSize={true} className="group p-8 border border-white/[0.08] hover:border-white/[0.12] transition-all duration-300 reveal-on-scroll bg-transparent grid-rows-[auto_1fr]">
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#4ae176]/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[#4ae176] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                </div>
                <h3 className="text-white font-display text-xl font-semibold mb-2">Text Context</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Natural language understanding in Hinglish, Marathi, and pure Hindi.
                </p>
              </div>
              <div className="bg-white/[0.04] rounded-xl p-4 flex flex-col gap-3 mt-auto">
                <div className="bg-white/[0.08] p-3 rounded-lg rounded-tl-none text-white/70 text-sm w-4/5">
                  Nike shoes size 9 available?
                </div>
                <div className="bg-[#0f5c46]/60 p-3 rounded-lg rounded-tr-none text-white/80 text-sm w-[90%] self-end">
                  Haan, 2 designs available hain. ₹2,499 and ₹3,199. Send karu pictures?
                </div>
              </div>
            </SpotlightCard>

            {/* Card 2 — Visual */}
            <SpotlightCard glowColor="green" customSize={true} className="group p-8 border border-white/[0.08] hover:border-white/[0.12] transition-all duration-300 reveal-on-scroll bg-transparent grid-rows-[auto_1fr]">
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#4ae176]/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[#4ae176] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>image_search</span>
                </div>
                <h3 className="text-white font-display text-xl font-semibold mb-2">Visual Search</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Send a photo. We find what matches in your catalog.
                </p>
              </div>
              <div className="flex flex-col gap-3 mt-auto">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] h-28 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white/10 text-5xl">image</span>
                </div>
                <div className="bg-[#0f5c46]/60 p-3 rounded-lg rounded-tr-none text-white/80 text-sm">
                  3 similar milte-julte hain — yeh dekho →
                </div>
              </div>
            </SpotlightCard>

            {/* Card 3 — Voice */}
            <SpotlightCard glowColor="green" customSize={true} className="group p-8 border border-white/[0.08] hover:border-[#4ae176]/20 transition-all duration-300 reveal-on-scroll bg-transparent grid-rows-[auto_1fr]">
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#4ae176]/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[#4ae176] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
                </div>
                <h3 className="text-white font-display text-xl font-semibold mb-2">Voice Notes</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Instant transcription and intent extraction from messy audio.
                </p>
              </div>
              <div className="flex flex-col gap-3 mt-auto">
                {/* waveform */}
                <div className="bg-white/[0.08] p-3 rounded-lg rounded-tl-none flex items-center gap-3 w-full">
                  <button className="w-8 h-8 rounded-full bg-[#4ae176] flex items-center justify-center text-[#020a07] shrink-0">
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  </button>
                  <div className="flex-grow h-1 bg-white/10 rounded-full overflow-hidden flex items-center gap-[2px]">
                    {[40, 70, 100, 50, 80, 30, 90, 60, 40].map((h, i) => (
                      <div key={i} className="w-[3px] bg-white/30 rounded-full" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <span className="text-white/40 text-[11px] font-mono">0:04</span>
                </div>
                {/* cart result */}
                <div className="bg-[#0f5c46]/60 p-4 rounded-lg rounded-tr-none text-white/80 text-sm">
                  <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                    <span>Cart Summary</span>
                    <span className="font-mono text-white/50">#ORD-992</span>
                  </div>
                  <div className="flex justify-between py-0.5"><span>2kg Tandul</span><span className="font-mono">₹110</span></div>
                  <div className="flex justify-between py-0.5"><span>1 Maggi</span><span className="font-mono">₹38</span></div>
                  <div className="flex justify-between border-t border-white/10 pt-2 mt-1 font-semibold"><span>Total</span><span className="font-mono">₹148</span></div>
                </div>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/*  STORY                                        */}
      {/* ══════════════════════════════════════════════ */}
      <section id="story" className="relative py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 reveal-on-scroll">
            <span className="text-white/30 text-xs font-semibold tracking-[0.15em] uppercase block mb-4">
              Why We Built This
            </span>
            <h2
              className="font-display text-white text-3xl md:text-5xl font-bold leading-tight mb-6"
              style={{ letterSpacing: "-0.03em" }}
            >
              Every shop deserves a munim.
            </h2>
            <p className="text-white/40 text-lg leading-relaxed max-w-2xl mx-auto">
              The trusted clerk who knew the accounts, the stock, and every customer by name. We built that clerk again — as an AI that lives on WhatsApp.
            </p>
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center reveal-on-scroll">
            {/* store visual */}
            <div className="relative bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden aspect-[4/3] group shadow-soft-depth">
              <img
                src="/ramesh-store.jpg"
                alt="Ramesh General Store"
                className="w-full h-full object-cover object-center filter brightness-[0.7] contrast-[1.05] group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent p-8 flex flex-col justify-end">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-white font-display text-xl font-bold tracking-tight">Ramesh General Store</span>
                    <span className="text-white/50 text-sm block mt-1">Kolhapur, Maharashtra</span>
                  </div>
                  <div className="flex gap-6 text-right">
                    <div>
                      <div className="text-[#4ae176] font-mono text-xl font-bold">300+</div>
                      <div className="text-white/40 text-[10px] uppercase tracking-wider mt-0.5">Items</div>
                    </div>
                    <div>
                      <div className="text-[#4ae176] font-mono text-xl font-bold">50+</div>
                      <div className="text-white/40 text-[10px] uppercase tracking-wider mt-0.5">Orders/day</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* text */}
            <div>
              <h3 className="text-white font-display text-2xl font-semibold mb-4">Meet Ramesh.</h3>
              <p className="text-white/40 text-base leading-relaxed mb-4">
                He runs a bustling general store in Kolhapur, managing over 300 different items daily. He doesn't have time to learn complicated software or sit at a computer entering receipts.
              </p>
              <p className="text-white/40 text-base leading-relaxed">
                For Ramesh, his storefront isn't just a physical space — it's heavily reliant on WhatsApp. Orders come in via voice notes, suppliers send bills as blurry photos, and customers promise payment over text.
              </p>
            </div>
          </div>

          {/* big quote */}
          <div className="max-w-3xl mx-auto mt-24 reveal-on-scroll flex justify-center w-full">
            <TextRevealCard
              text="We're not building software for shops."
              revealText="We're building the memory they never had time to keep."
              className="bg-[#020a07]/50 border border-white/[0.08]"
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/*  HOW IT WORKS                                 */}
      {/* ══════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 reveal-on-scroll">
            <span className="text-[#4ae176] text-xs font-semibold tracking-[0.15em] uppercase block mb-4">
              The Full Journey
            </span>
            <h2
              className="font-display text-white text-3xl md:text-5xl font-bold leading-tight mb-6"
              style={{ letterSpacing: "-0.03em" }}
            >
              From a WhatsApp message
              <br className="hidden md:block" /> to a number on your dashboard.
            </h2>
          </div>

          {/* pipeline steps */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 md:p-12 mb-20 reveal-on-scroll">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-0">
              {["Message", "Detect", "Intent", "Shelf", "Action", "Reply", "Dashboard"].map((step, i) => {
                const subs = ["Arrives", "Lang/Type", "Mapping", "Check", "Execute", "Send", "Update"];
                return (
                  <div key={step} className="flex-1 flex flex-row md:flex-col items-center gap-3 relative">
                    <div className="w-10 h-10 rounded-full bg-[#4ae176]/10 border border-[#4ae176]/20 text-[#4ae176] flex items-center justify-center font-mono text-sm font-semibold shrink-0">
                      {i + 1}
                    </div>
                    <div className="text-left md:text-center">
                      <div className="text-white text-sm font-semibold">{step}</div>
                      <div className="text-white/30 text-xs hidden md:block">{subs[i]}</div>
                    </div>
                    {i < 6 && (
                      <div className="hidden md:block absolute top-5 left-[60%] w-[80%] h-[1px] bg-white/[0.08]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* setup steps + dashboard modules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start reveal-on-scroll">
            {/* left: 3-step setup */}
            <div>
              <h2
                className="font-display text-white text-3xl md:text-4xl font-bold mb-3"
                style={{ letterSpacing: "-0.03em" }}
              >
                Ready when you are.
              </h2>
              <p className="text-white/40 text-base mb-10">
                Three steps to a living ledger. No IT team required.
              </p>
              <div className="flex flex-col gap-8 border-l border-white/[0.1] pl-8 ml-4">
                {[
                  { num: 1, title: "Connect WhatsApp", desc: "Scan a QR code to link your business number." },
                  { num: 2, title: "Add Inventory", desc: "Upload an excel sheet or snap a photo of your register." },
                  { num: 3, title: "Go Live", desc: "Start chatting. The dashboard builds itself.", active: true },
                ].map((step) => (
                  <div key={step.num} className="relative">
                    <div
                      className={`absolute -left-[41px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                        step.active
                          ? "bg-[#4ae176] text-[#020a07]"
                          : "bg-white/[0.08] border border-white/[0.15] text-white/50"
                      }`}
                    >
                      {step.active ? "✓" : step.num}
                    </div>
                    <h4 className="text-white font-display text-lg font-semibold flex items-center gap-2">
                      {step.title}
                      {step.active && (
                        <span className="w-2 h-2 rounded-full bg-[#4ae176] animate-breathe" />
                      )}
                    </h4>
                    <p className="text-white/40 text-sm mt-1">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* right: dashboard modules preview */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 md:p-8">
              <div className="flex justify-between items-center border-b border-white/[0.08] pb-4 mb-4">
                <span className="text-white font-display text-lg font-semibold">Dashboard Modules</span>
                <span className="material-symbols-outlined text-white/30 text-xl">tune</span>
              </div>
              <HoverEffect items={dashboardModules} className="py-0 grid-cols-2 md:grid-cols-3" />
            </div>
          </div>

          {/* final CTA */}
          <div className="flex justify-center mt-20 reveal-on-scroll">
            <button
              onClick={onDashboard}
              className="bg-white text-[#020a07] text-base font-semibold px-8 py-4 rounded-full hover:bg-white/90 transition-all active:scale-[0.97] inline-flex items-center gap-2 shadow-[0_0_40px_rgba(74,225,118,0.1)]"
            >
              Go live in 10 minutes
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/*  FOOTER                                       */}
      {/* ══════════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.06] py-12 px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 max-w-7xl mx-auto">
          <div>
            <span
              className="text-white font-display text-lg font-bold block mb-2"
              style={{ letterSpacing: "-0.03em" }}
            >
              Munim<span className="text-[#4ae176]">.</span>ai
            </span>
            <p className="text-white/30 text-sm max-w-sm">
              &copy; 2026 Munim.ai. Modern bookkeeping for the living ledger.
            </p>
          </div>
          <div className="flex flex-wrap gap-6">
            {[
              { label: "Privacy Policy", href: "/privacy.html" },
              { label: "Terms of Service", href: "/terms.html" },
              { label: "Contact Us", href: "/contact.html" },
              { label: "Documentation", href: "https://github.com/Rehan0707/Mumim#readme" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-white/30 text-sm hover:text-white/60 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
