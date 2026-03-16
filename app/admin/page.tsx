import Link from "next/link";

import { logoutAction, verifyEvidenceAction } from "@/app/actions";
import { AnchorStatusBadge, AppNav, Card, PageShell, StatCard, StatusBadge } from "@/components/ui";
import { requireMunicipalUser } from "@/lib/auth/session";
import { evidenceService } from "@/lib/services/evidence-service";
import { noticeService } from "@/lib/services/notice-service";
import { formatDate } from "@/lib/utils";

function getDashboardVerificationLabel(
  notice: {
    anchorStatus: string | null;
  },
  verification: {
    passed: boolean;
  }
) {
  if (notice.anchorStatus !== "anchored") {
    return "Pending anchor";
  }

  return verification.passed ? "Verified" : "Verification failed";
}

export default async function AdminDashboard({
  searchParams
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const user = await requireMunicipalUser();
  const { notices, totals } = await noticeService.getDashboardData();
  const query = await searchParams;
  const verifiedPublicId = query.verified;
  const verifiedNotice = verifiedPublicId ? notices.find((notice) => notice.publicId === verifiedPublicId) : null;
  const inlineVerification = verifiedNotice ? await evidenceService.verifyNoticeIntegrity(verifiedNotice.id) : null;

  return (
    <PageShell
      title="Municipal Notice Dashboard"
      subtitle="Track notice delivery, evidence generation, and blockchain-style anchor receipts across the full notice lifecycle."
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
                <th className="py-3 pr-4">Blockchain Receipt</th>
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
                    <StatusBadge value={notice.status} />
                  </td>
                  <td className="py-4 pr-4">{formatDate(notice.sentAt)}</td>
                  <td className="py-4 pr-4">
                    <AnchorStatusBadge
                      status={notice.anchorStatus}
                      receiptId={notice.anchorReceiptId}
                      anchoredAt={notice.anchorTimestamp}
                    />
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link className="button-secondary" href={`/admin/notices/${notice.publicId}`}>
                        Open
                      </Link>
                      <Link className="button-secondary" href={`/admin/evidence/${notice.publicId}`}>
                        Evidence
                      </Link>
                      <form action={verifyEvidenceAction}>
                        <input name="publicId" type="hidden" value={notice.publicId} />
                        <input name="source" type="hidden" value="dashboard" />
                        <button className="button-secondary" type="submit">
                          Verify Evidence
                        </button>
                      </form>
                      {verifiedPublicId === notice.publicId && inlineVerification ? (
                        <span className="self-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                          {getDashboardVerificationLabel(notice, inlineVerification)}
                        </span>
                      ) : null}
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
