import Link from "next/link";

import { logoutAction, verifyEvidenceAction } from "@/app/actions";
import { AppNav, Card, DataRow, PageShell, StatusBadge, Timeline } from "@/components/ui";
import { requireMunicipalUser } from "@/lib/auth/session";
import { evidenceService } from "@/lib/services/evidence-service";
import { formatDate, titleCase } from "@/lib/utils";

export default async function EvidencePage({
  params,
  searchParams
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ verification?: string }>;
}) {
  await requireMunicipalUser();
  const { publicId } = await params;
  const query = await searchParams;
  const data = await evidenceService.buildEvidenceSummary(publicId);
  const { notice, verification } = data;
  const anchorReceipt = notice.anchorMemberships[0]?.anchorReceipt;

  return (
    <PageShell
      title={`Evidence Report ${notice.publicId}`}
      subtitle="Human-readable evidence summary, full hashes, append-only event history, and blockchain anchor verification for this notice."
      actions={
        <div className="flex flex-wrap gap-3">
          <form action={verifyEvidenceAction}>
            <input name="publicId" type="hidden" value={notice.publicId} />
            <button className="button-primary" type="submit">
              Verify Integrity
            </button>
          </form>
          <a className="button-secondary" href={`/api/evidence/${notice.publicId}/export`}>
            Export JSON
          </a>
          <Link className="button-secondary" href={`/admin/evidence/${notice.publicId}/print`}>
            Printable Report
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
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Verification Outcome</h2>
              <StatusBadge value={verification.passed ? "verified" : "failed"} />
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <p>
                <span className="font-semibold">Integrity verified:</span>{" "}
                {verification.integrityVerified ? "Passed" : "Failed"}
              </p>
              <p>
                <span className="font-semibold">Anchor verified:</span>{" "}
                {notice.anchorStatus === "anchored"
                  ? verification.anchorVerified
                    ? "Passed"
                    : "Failed"
                  : "Not anchored"}
              </p>
              <p className="text-slate-600">{query.verification ? verification.reason : "Run verification to recompute hashes and validate the anchored proof."}</p>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">Evidence Summary</h2>
            <dl className="mt-4">
              <DataRow label="Notice ID" value={notice.publicId} />
              <DataRow label="Status" value={<StatusBadge value={notice.status} />} />
              <DataRow label="Sender" value={`${notice.createdBy.name} (${notice.createdBy.email})`} />
              <DataRow label="Recipient" value={`${notice.recipient.name} (${notice.recipient.email})`} />
              <DataRow label="Sent At" value={formatDate(notice.sentAt)} />
              <DataRow label="Notified At" value={formatDate(notice.notifiedAt)} />
              <DataRow label="Viewed At" value={formatDate(notice.viewedAt)} />
              <DataRow label="Acknowledged At" value={formatDate(notice.acknowledgedAt)} />
              <DataRow label="Anchored At" value={formatDate(notice.anchorTimestamp)} />
              <DataRow label="Anchor Receipt ID" value={notice.anchorReceiptId ?? "Not yet assigned"} />
              <DataRow label="Anchor Verified" value={verification.anchorVerified ? "Passed" : "Pending / failed"} />
              <DataRow label="Integrity Verified" value={verification.integrityVerified ? "Passed" : "Failed"} />
            </dl>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">Blockchain Anchor Receipt</h2>
            {anchorReceipt ? (
              <dl className="mt-4">
                <DataRow label="Anchor ID" value={anchorReceipt.anchorId} />
                <DataRow label="Anchor Root" value={<code className="break-all text-xs">{anchorReceipt.batchRoot}</code>} />
                <DataRow label="Previous Anchor" value={anchorReceipt.previousAnchorId ?? "Genesis"} />
                <DataRow label="Anchored At" value={formatDate(anchorReceipt.anchoredAt)} />
                <DataRow label="Ledger Proof" value={<code className="break-all text-xs">{anchorReceipt.ledgerProof}</code>} />
              </dl>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No anchor receipt has been issued for this notice yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold">Hash Record</h2>
            <dl className="mt-4">
              <DataRow label="Body SHA-256" value={<code className="break-all text-xs">{notice.bodyHash}</code>} />
              <DataRow label="Notice Hash" value={<code className="break-all text-xs">{notice.noticeHash}</code>} />
              <DataRow
                label="Attachment Merkle Root"
                value={
                  <code className="break-all text-xs">
                    {notice.attachmentMerkleRoot ?? "No attachments"}
                  </code>
                }
              />
              <DataRow
                label="Anchored Hash"
                value={<code className="break-all text-xs">{notice.anchorHash ?? "Not anchored"}</code>}
              />
              <DataRow
                label="Recomputed Notice Hash"
                value={<code className="break-all text-xs">{verification.recomputedNoticeHash}</code>}
              />
            </dl>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">Event Timeline</h2>
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
