import Link from "next/link";

import { logoutAction } from "@/app/actions";
import { AppNav, Card, PageShell, StatusBadge } from "@/components/ui";
import { requireRecipient } from "@/lib/auth/session";
import { noticeService } from "@/lib/services/notice-service";
import { formatDate } from "@/lib/utils";

export default async function RecipientInboxPage() {
  const user = await requireRecipient();
  const notices = await noticeService.listRecipientNotices(user.id);

  return (
    <PageShell
      title="Recipient Inbox"
      subtitle="Official notices are accessed here, with evidence timestamps showing when you were notified, viewed, and acknowledged."
    >
      <AppNav
        role="recipient"
        onLogout={
          <form action={logoutAction}>
            <button className="button-secondary" type="submit">
              Sign Out
            </button>
          </form>
        }
      />
      <Card>
        <div className="space-y-4">
          {notices.map((notice: (typeof notices)[number]) => (
            <div className="rounded-2xl border border-border p-5" key={notice.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold text-ink">{notice.subject}</p>
                  <p className="text-sm text-slate-500">{notice.publicId}</p>
                </div>
                <StatusBadge value={notice.status} />
              </div>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <p>
                  <span className="font-semibold">Notified at:</span> {formatDate(notice.notifiedAt)}
                </p>
                <p>
                  <span className="font-semibold">Viewed at:</span> {formatDate(notice.viewedAt)}
                </p>
                <p>
                  <span className="font-semibold">Acknowledged at:</span> {formatDate(notice.acknowledgedAt)}
                </p>
              </div>
              <div className="mt-4">
                <Link className="button-primary inline-block" href={`/recipient/notices/${notice.publicId}`}>
                  Open Notice
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
