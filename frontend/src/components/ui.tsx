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

export function Badge({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <span className={`rounded-full bg-primary-fixed/30 px-3 py-1 text-xs font-semibold text-primary ${className ?? ""}`}>
      {children}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  accent?: boolean;
}

export function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <Card className={`flex flex-col gap-1 ${accent ? "bg-primary-container text-white" : ""}`}>
      <span className="font-label-caps text-label-caps text-on-surface-variant">{label}</span>
      <span className="font-numeral-lg text-numeral-lg text-on-surface">{value}</span>
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

export function timeAgo(date: string | Date) {
  const now = new Date();
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
