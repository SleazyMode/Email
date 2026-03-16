import Link from "next/link";

import { logoutAction } from "@/app/actions";
import { AppNav, Card, PageShell, StatCard, StatusBadge } from "@/components/ui";
import { requireMunicipalUser } from "@/lib/auth/session";
import { noticeService } from "@/lib/services/notice-service";
import { formatDate } from "@/lib/utils";

function getLifecycleStatus(notice: {
  acknowledgedAt?: Date | string | null;
  viewedAt?: Date | string | null;
  notifiedAt?: Date | string | null;
  sentAt?: Date | string | null;
  status: string;
}) {
  if (notice.acknowledgedAt) {
    return "Acknowledged";
  }

  if (notice.viewedAt) {
    return "Viewed";
  }

  if (notice.notifiedAt) {
    return "Notified";
  }

  if (notice.sentAt) {
    return "Sent";
  }

  return notice.status;
}

function getSolanaAnchorStatus(notice: {
  anchorStatus?: string | null;
  anchorReceiptId?: string | null;
}) {
  if (notice.anchorStatus?.toLowerCase() === "failed") {
    return "Failed";
  }

  if (notice.anchorReceiptId || notice.anchorStatus?.toLowerCase() === "anchored") {
    return "Confirmed";
  }

  return "Pending";
}

export default async function AdminDashboard({
  searchParams: _searchParams
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const user = await requireMunicipalUser();
  const { notices, totals } = await noticeService.getDashboardData();
  await _searchParams;

  return (
    <PageShell
      title="Municipal Notice Dashboard"
      subtitle="Track notice delivery, evidence generation, and Solana anchor receipts across the full notice lifecycle."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link className="button-primary" href="/admin/notices/new">
            Create Notice
          </Link>
          <Link className="button-secondary" href="/admin/evidence/NTC-20260317-DEMO01">
            Open Seeded Evidence
          </Link>
        </div>
      }
    >
      <AppNav
        role="admin"
        onLogout={
          <form action={logoutAction}>
            <button className="button-secondary" type="submit">
              Sign Out
            </button>
          </form>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <StatCard label="All Notices" value={totals.all} />
        <StatCard label="Draft" value={totals.draft} />
        <StatCard label="Sent" value={totals.sent} />
        <StatCard label="Notified" value={totals.notified} />
        <StatCard label="Viewed" value={totals.viewed} />
        <StatCard label="Acknowledged" value={totals.acknowledged} />
        <StatCard label="Anchored" value={totals.anchored} />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Operational Queue</h2>
            <p className="text-sm text-slate-500">
              Signed in as {user.name}. Notices are anchored automatically when sent.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-slate-500">
              <tr>
                <th className="py-3 pr-4">Notice</th>
                <th className="py-3 pr-4">Recipient</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Sent At</th>
                <th className="py-3 pr-4">Solana Anchor</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((notice: (typeof notices)[number]) => (
                <tr className="border-b border-slate-100" key={notice.id}>
                  <td className="py-4 pr-4">
                    <p className="font-semibold">{notice.publicId}</p>
                    <p className="text-slate-500">{notice.subject}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p>{notice.recipient.name}</p>
                    <p className="text-slate-500">{notice.recipient.email}</p>
                  </td>
                  <td className="py-4 pr-4">{notice.noticeCategory}</td>
                  <td className="py-4 pr-4">
                    <StatusBadge value={getLifecycleStatus(notice)} />
                  </td>
                  <td className="py-4 pr-4">{formatDate(notice.sentAt)}</td>
                  <td className="py-4 pr-4">
                    <div className="space-y-2">
                      <StatusBadge value={getSolanaAnchorStatus(notice)} />
                      <div className="text-xs text-slate-500">
                        <p>{notice.anchorReceiptId ?? "Receipt pending"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link className="button-secondary" href={`/admin/notices/${notice.publicId}`}>
                        Open
                      </Link>
                      <Link className="button-secondary" href={`/admin/evidence/${notice.publicId}`}>
                        Evidence
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
}
