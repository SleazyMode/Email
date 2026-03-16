import Link from "next/link";

import { logoutAction, sendNoticeAction } from "@/app/actions";
import { AppNav, Card, DataRow, PageShell, StatusBadge, Timeline } from "@/components/ui";
import { requireMunicipalUser } from "@/lib/auth/session";
import { noticeService } from "@/lib/services/notice-service";
import { formatDate, titleCase } from "@/lib/utils";

export default async function NoticeDetailPage({
  params
}: {
  params: Promise<{ publicId: string }>;
}) {
  await requireMunicipalUser();
  const { publicId } = await params;
  const notice = await noticeService.getNoticeDetail(publicId);

  return (
    <PageShell
      title={`Notice ${notice.publicId}`}
      subtitle="Operational detail for sending, notifying, viewing, acknowledging, and anchoring this official notice to Solana-style receipt metadata."
      actions={
        <div className="flex flex-wrap gap-3">
          {notice.sentAt ? null : (
            <form action={sendNoticeAction}>
              <input name="publicId" type="hidden" value={notice.publicId} />
              <button className="button-primary" type="submit">
                Send Notice
              </button>
            </form>
          )}
          <Link className="button-secondary" href={`/admin/evidence/${notice.publicId}`}>
            Open Evidence
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
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{notice.subject}</h2>
            <StatusBadge value={notice.status} />
          </div>
          <dl>
            <DataRow label="Recipient" value={`${notice.recipient.name} (${notice.recipient.email})`} />
            <DataRow label="Sender" value={`${notice.createdBy.name} (${notice.createdBy.email})`} />
            <DataRow label="Category" value={titleCase(notice.noticeCategory)} />
            <DataRow label="Created At" value={formatDate(notice.createdAt)} />
            <DataRow label="Sent At" value={formatDate(notice.sentAt)} />
            <DataRow label="Notified At" value={formatDate(notice.notifiedAt)} />
            <DataRow label="Viewed At" value={formatDate(notice.viewedAt)} />
            <DataRow label="Acknowledged At" value={formatDate(notice.acknowledgedAt)} />
            <DataRow label="Anchored At" value={formatDate(notice.anchorTimestamp)} />
          </dl>
          <div className="mt-6 rounded-2xl border border-border bg-slate-50 p-5">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Body Snapshot
            </p>
            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{notice.body}</div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-civic/20 bg-civic/5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-civic">
              Solana Anchor
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="font-semibold">Anchor status:</span>{" "}
                {notice.anchorReceiptId ? "Receipt confirmed" : "Created automatically when sent"}
              </p>
              <p>
                <span className="font-semibold">Anchor receipt ID:</span>{" "}
                {notice.anchorReceiptId ?? "Pending"}
              </p>
              <p>
                <span className="font-semibold">Anchored at:</span>{" "}
                {formatDate(notice.anchorTimestamp)}
              </p>
              <p className="text-slate-600">
                The portal record is hashed, logged, and anchored to Solana-style receipt metadata. No notice content or PII is placed on the anchored record.
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">Attachments</h2>
            <div className="mt-4 space-y-3">
              {notice.attachments.length === 0 ? (
                <p className="text-sm text-slate-500">No attachments.</p>
              ) : (
                notice.attachments.map((attachment: (typeof notice.attachments)[number]) => (
                  <div className="rounded-xl border border-border p-4" key={attachment.id}>
                    <p className="font-medium text-ink">{attachment.originalName}</p>
                    <p className="mt-1 text-xs text-slate-500">{attachment.mimeType}</p>
                    <div className="mt-3">
                      <a
                        className="button-secondary inline-block"
                        href={`/api/attachments/${attachment.id}`}
                      >
                        Download
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">Evidence Timeline</h2>
            <div className="mt-4">
              <Timeline
                items={notice.events.map((event: (typeof notice.events)[number]) => ({
                  id: event.id,
                  title: titleCase(event.eventType),
                  summary: event.summary,
                  at: event.createdAt,
                  actor: event.actorLabel
                }))}
              />
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
