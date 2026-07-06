import type { ReactNode } from "react";

export function formatINR(n: number): string {
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl shadow-card border border-slate-100 ${className}`}>{children}</div>;
}

export function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card className={`p-5 ${accent ? "bg-brand-900 border-brand-900" : ""}`}>
      <div className={`text-xs font-semibold uppercase tracking-wide ${accent ? "text-brand-100/70" : "text-slate-400"}`}>
        {label}
      </div>
      <div className={`mt-2 text-3xl font-extrabold ${accent ? "text-white" : "text-slate-800"}`}>{value}</div>
      {sub && <div className={`mt-1 text-sm ${accent ? "text-brand-100/80" : "text-slate-400"}`}>{sub}</div>}
    </Card>
  );
}

const SEGMENT_STYLES: Record<string, string> = {
  vip: "bg-amber-100 text-amber-700",
  regular: "bg-emerald-100 text-emerald-700",
  new: "bg-sky-100 text-sky-700",
  churning: "bg-rose-100 text-rose-700",
};

const STATUS_STYLES: Record<string, string> = {
  created: "bg-slate-100 text-slate-600",
  reserved: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  fulfilled: "bg-brand-100 text-brand-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export function Badge({ kind, value }: { kind: "segment" | "status"; value: string }) {
  const styles = kind === "segment" ? SEGMENT_STYLES : STATUS_STYLES;
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[value] || "bg-slate-100 text-slate-600"}`}>
      {value}
    </span>
  );
}

// --- Material-styled primitives used by the landing / auth / onboarding pages ---
export function Button({
  className,
  variant = "primary",
  children,
  ...rest
}: {
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  children?: ReactNode;
  [key: string]: unknown;
}) {
  const base = "inline-flex items-center justify-center min-h-[48px] rounded-xl font-display font-semibold transition-all duration-150";
  const styles: Record<string, string> = {
    primary: "bg-primary-container text-white shadow-float-depth hover:scale-95",
    secondary: "border border-primary-container text-primary-container bg-transparent hover:bg-primary-container/10",
    ghost: "text-primary hover:bg-primary-container/10",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className ?? ""}`} {...(rest as object)}>
      {children}
    </button>
  );
}

export function Input({ className, ...rest }: { className?: string; [key: string]: unknown }) {
  return (
    <input
      className={`rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 ${className ?? ""}`}
      {...(rest as object)}
    />
  );
}
