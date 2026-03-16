import { evidenceService } from "@/lib/services/evidence-service";
import { formatDate } from "@/lib/utils";

function timelineLabel(eventType: string) {
  const labels: Record<string, string> = {
    NOTICE_CREATED: "Notice Created",
    EVIDENCE_COMPILED: "Evidence Snapshot Created",
    NOTICE_SENT: "Notice Sent",
    RECIPIENT_NOTIFIED: "Recipient Notification Generated",
    PORTAL_ACCESSED: "Recipient Portal Accessed",
    NOTICE_VIEWED: "Notice Viewed",
    NOTICE_ACKNOWLEDGED: "Notice Acknowledged",
    ATTACHMENT_DOWNLOADED: "Attachment Downloaded",
    BLOCKCHAIN_ANCHOR_SUBMITTED: "Solana Anchor Submitted",
    BLOCKCHAIN_ANCHOR_CONFIRMED: "Solana Anchor Confirmed"
  };

  return labels[eventType] ?? eventType;
}

export default async function EvidencePrintPage({
  params
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const data = await evidenceService.buildEvidenceSummary(publicId, {
    runIntegrityCheck: true,
    runAnchorCheck: true
  });
  const { notice, verification } = data;

  return (
    <main className="mx-auto max-w-4xl bg-white px-10 py-12">
      <h1 className="text-3xl font-semibold">Evidence Report</h1>
      <p className="mt-2 text-sm text-slate-500">Notice {notice.publicId}</p>
      <div className="mt-8 grid gap-8">
        <section>
          <h2 className="text-xl font-semibold">Summary</h2>
          <p className="mt-3 text-sm">{verification.overall.summary}</p>
          <p className="mt-2 text-sm">Integrity check: {verification.integrity.passed ? "Passed" : "Failed"}</p>
          <p className="text-sm">Anchor check: {verification.anchor.passed ? "Passed" : "Failed"}</p>
          <p className="text-sm">Solana receipt ID: {notice.anchorReceiptId ?? "Not anchored"}</p>
          <p className="text-sm">Anchor timestamp: {formatDate(notice.anchorTimestamp)}</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Timeline</h2>
          <div className="mt-4 space-y-3 text-sm">
            {notice.events.map((event: (typeof notice.events)[number]) => (
              <div key={event.id}>
                <p className="font-semibold">{timelineLabel(event.eventType)}</p>
                <p>{event.summary}</p>
                <p className="text-slate-500">{formatDate(event.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
