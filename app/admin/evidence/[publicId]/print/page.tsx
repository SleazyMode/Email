import { evidenceService } from "@/lib/services/evidence-service";
import { formatDate, titleCase } from "@/lib/utils";

export default async function EvidencePrintPage({
  params
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const data = await evidenceService.buildEvidenceSummary(publicId);
  const { notice, verification } = data;

  return (
    <main className="mx-auto max-w-4xl bg-white px-10 py-12">
      <h1 className="text-3xl font-semibold">Evidence Report</h1>
      <p className="mt-2 text-sm text-slate-500">Notice {notice.publicId}</p>
      <div className="mt-8 grid gap-8">
        <section>
          <h2 className="text-xl font-semibold">Summary</h2>
          <p className="mt-3 text-sm">Integrity verified: {verification.integrityVerified ? "Passed" : "Failed"}</p>
          <p className="text-sm">Anchor verified: {verification.anchorVerified ? "Passed" : "Pending / failed"}</p>
          <p className="text-sm">Anchor receipt ID: {notice.anchorReceiptId ?? "Not anchored"}</p>
          <p className="text-sm">Anchored at: {formatDate(notice.anchorTimestamp)}</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Timeline</h2>
          <div className="mt-4 space-y-3 text-sm">
            {notice.events.map((event: (typeof notice.events)[number]) => (
              <div key={event.id}>
                <p className="font-semibold">{titleCase(event.eventType)}</p>
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
