import { acknowledgeNoticeAction, logoutAction } from "@/app/actions";
import { AppNav, Card, DataRow, PageShell, Timeline } from "@/components/ui";
import { requireRecipient } from "@/lib/auth/session";
import { noticeService } from "@/lib/services/notice-service";
import { formatDate, titleCase } from "@/lib/utils";

export default async function RecipientNoticePage({
  params
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireRecipient();
  const { publicId } = await params;
  const notice = await noticeService.getNoticeDetail(publicId);

  if (notice.recipientId !== user.id) {
    throw new Error("Unauthorized notice access.");
  }

  await noticeService.markPortalAccess(notice.id, user.id, user.name);
  await noticeService.markViewed(publicId, user.id, user.name);

  return (
    <PageShell
      title={notice.subject}
      subtitle="View the official notice, download attachments, and acknowledge receipt to complete the notice evidence trail."
      actions={
        notice.acknowledgedAt ? null : (
          <form action={acknowledgeNoticeAction}>
            <input name="publicId" type="hidden" value={notice.publicId} />
            <button className="button-primary" type="submit">
              Acknowledge Receipt
            </button>
          </form>
        )
      }
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
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <dl>
            <DataRow label="Notice ID" value={notice.publicId} />
            <DataRow label="Sent At" value={formatDate(notice.sentAt)} />
            <DataRow label="Notified At" value={formatDate(notice.notifiedAt)} />
            <DataRow label="Viewed At" value={formatDate(notice.viewedAt ?? new Date())} />
            <DataRow label="Acknowledged At" value={formatDate(notice.acknowledgedAt)} />
          </dl>
          <div className="mt-6 rounded-2xl border border-border bg-slate-50 p-5">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Official Notice
            </p>
            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{notice.body}</div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold">Attachments</h2>
            <div className="mt-4 space-y-3">
              {notice.attachments.map((attachment: (typeof notice.attachments)[number]) => (
                <a
                  className="block rounded-xl border border-border p-4"
                  href={`/api/attachments/${attachment.id}`}
                  key={attachment.id}
                >
                  <p className="font-medium">{attachment.originalName}</p>
                  <p className="text-xs text-slate-500">{attachment.mimeType}</p>
                </a>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold">Timeline</h2>
            <div className="mt-4">
              <Timeline
                items={notice.events
                  .filter((event: (typeof notice.events)[number]) =>
                    [
                      "RECIPIENT_NOTIFIED",
                      "PORTAL_ACCESSED",
                      "NOTICE_VIEWED",
                      "NOTICE_ACKNOWLEDGED"
                    ].includes(event.eventType)
                  )
                  .map((event: (typeof notice.events)[number]) => ({
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
