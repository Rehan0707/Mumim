import { type ReactNode } from "react";

export function Card({ className, children, ...rest }: { className?: string; children?: ReactNode; [key: string]: unknown }) {
  return (
    <div
      className={`rounded-2xl bg-surface p-card-padding shadow-soft-depth ${className ?? ""}`}
      {...rest}
    >
      {children}
    </div>
  );
}

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
  const base = "inline-flex items-center justify-center min-h-[48px] rounded-xl font-body-lg text-body-lg transition-all duration-150";
  const styles = {
    primary: "bg-primary-container text-white shadow-float-depth hover:scale-95",
    secondary: "border border-primary-container text-primary-container bg-transparent hover:bg-primary-container/10",
    ghost: "text-primary hover:bg-primary-container/10",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className ?? ""}`} {...rest}>
      {children}
    </button>
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

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
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

export function Input({ className, ...rest }: { className?: string; [key: string]: unknown }) {
  return (
    <input
      className={`rounded-xl border border-outline-variant bg-surface px-4 py-3 text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 ${className ?? ""}`}
      {...rest}
    />
  );
}

export function SectionHeading({ label, title, className }: { label?: string; title: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {label && <span className="font-label-caps text-label-caps text-secondary">{label}</span>}
      <h2 className="font-display text-display-lg-mobile md:text-headline-md text-primary">{title}</h2>
    </div>
  );
}

export function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export function timeAgo(iso?: string | Date): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z") : iso;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
