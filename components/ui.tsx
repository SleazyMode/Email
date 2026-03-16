import Link from "next/link";

import { cn, formatDate, titleCase } from "@/lib/utils";

export function PageShell({
  title,
  subtitle,
  children,
  actions
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-civic">
              Municipal Notice System
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-ink">{title}</h1>
            {subtitle ? <p className="mt-3 max-w-3xl text-sm text-slate-700">{subtitle}</p> : null}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Card({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-white p-6 shadow-panel", className)}>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value
}: {
  label: string;
  value: number | string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
    </Card>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const palette =
    normalized === "anchored" || normalized === "passed" || normalized === "verified" || normalized === "confirmed"
      ? "border-success/20 bg-success/10 text-success"
      : normalized === "failed"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : normalized === "pending" || normalized === "not run"
          ? "border-slate-300 bg-slate-100 text-slate-700"
          : normalized === "acknowledged"
            ? "border-civic/20 bg-civic/10 text-civic"
            : normalized === "viewed"
              ? "border-warning/20 bg-warning/10 text-warning"
              : normalized === "draft"
                ? "border-slate-300 bg-slate-100 text-slate-700"
                : "border-border bg-slate-50 text-ink";

  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide", palette)}>
      {titleCase(value)}
    </span>
  );
}

export function AnchorStatusBadge({
  status,
  receiptId,
  anchoredAt
}: {
  status?: string | null;
  receiptId?: string | null;
  anchoredAt?: Date | string | null;
}) {
  const normalizedStatus = status?.toLowerCase() ?? "not_anchored";
  const isAnchored = normalizedStatus === "anchored";
  const palette = isAnchored
    ? "border-success/20 bg-success/10 text-success"
    : "border-slate-300 bg-slate-100 text-slate-700";
  const dot = isAnchored ? "bg-success" : "bg-slate-400";
  const label = isAnchored ? "Anchor Confirmed" : "Pending Anchor";

  return (
    <div className="space-y-2">
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
          palette
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        {label}
      </span>
      <div className="text-xs text-slate-500">
        <p>{receiptId ?? "Receipt not issued yet"}</p>
        {isAnchored && anchoredAt ? <p>Anchored {formatDate(anchoredAt)}</p> : null}
      </div>
    </div>
  );
}

export function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 md:grid-cols-[180px_minmax(0,1fr)]">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="min-w-0 text-sm text-ink">{value}</dd>
    </div>
  );
}

export function Timeline({
  items
}: {
  items: Array<{
    id: string;
    title: string;
    summary: string;
    at: Date | string;
    actor?: string;
  }>;
}) {
  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="relative rounded-xl border border-border bg-slate-50 p-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <p className="font-semibold text-ink">{item.title}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">{formatDate(item.at)}</p>
          </div>
          <p className="mt-2 text-sm text-slate-700">{item.summary}</p>
          {item.actor ? <p className="mt-2 text-xs text-slate-500">Actor: {item.actor}</p> : null}
        </li>
      ))}
    </ol>
  );
}

export function AppNav({
  role,
  onLogout
}: {
  role: "admin" | "recipient";
  onLogout: React.ReactNode;
}) {
  const links =
    role === "admin"
      ? [
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/notices/new", label: "Create Notice" }
        ]
      : [
          { href: "/recipient", label: "Inbox" },
          { href: "/recipient-login", label: "Recipient Login" }
        ];

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {links.map((link) => (
        <Link
          className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-civic hover:text-civic"
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
      <div className="ml-auto">{onLogout}</div>
    </div>
  );
}
