import Link from "next/link";

import { logoutAction, verifyAnchorAction, verifyEvidenceAction } from "@/app/actions";
import { CopyValueButton } from "@/components/copy-value-button";
import { AppNav, Card, DataRow, PageShell, StatusBadge, Timeline } from "@/components/ui";
import { requireMunicipalUser } from "@/lib/auth/session";
import { evidenceService } from "@/lib/services/evidence-service";
import { formatDate, titleCase } from "@/lib/utils";

function getDisplayStatus(value: "passed" | "failed" | "pending" | "not_run" | "not_anchored") {
  if (value === "passed") {
    return "Passed";
  }

  if (value === "failed") {
    return "Failed";
  }

  return "Pending";
}

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

  return labels[eventType] ?? titleCase(eventType);
}

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

function formatCluster(cluster?: string | null) {
  if (cluster === "localnet") {
    return "Localnet (demo environment)";
  }

  return cluster ?? "Not recorded";
}

function MonospaceValue({
  value,
  copyLabel
}: {
  value: string;
  copyLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <code className="min-w-0 break-all rounded-xl bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-700">
        {value}
      </code>
      {copyLabel ? <CopyValueButton label={copyLabel} value={value} /> : null}
    </div>
  );
}

function ChecklistItem({
  label,
  passed
}: {
  label: string;
  passed: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <span>{label}</span>
      <StatusBadge value={passed ? "passed" : "failed"} />
    </li>
  );
}

export default async function EvidencePage({
  params,
  searchParams
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ integrity?: string; anchor?: string }>;
}) {
  await requireMunicipalUser();
  const { publicId } = await params;
  const query = await searchParams;
  const runIntegrityCheck = query.integrity === "1";
  const runAnchorCheck = query.anchor === "1";
  const data = await evidenceService.buildEvidenceSummary(publicId, {
    runIntegrityCheck,
    runAnchorCheck
  });
  const { notice, verification } = data;
  const anchorReceipt = notice.anchorMemberships[0]?.anchorReceipt;
  const integrityStatus = runIntegrityCheck ? verification.integrity.status : "not_run";
  const anchorStatus = runAnchorCheck ? verification.anchor.status : "not_run";

  return (
    <PageShell
      title={`Evidence Report ${notice.publicId}`}
      subtitle="Audit-oriented evidence summary with local integrity checks, Solana anchor metadata, full hashes, and a time-ordered event record."
      actions={
        <div className="flex flex-wrap gap-3">
          <form action={verifyEvidenceAction}>
            <input name="publicId" type="hidden" value={notice.publicId} />
            <input name="anchor" type="hidden" value={runAnchorCheck ? "1" : "0"} />
            <button className="button-primary" type="submit">
              Verify Integrity
            </button>
          </form>
          <form action={verifyAnchorAction}>
            <input name="publicId" type="hidden" value={notice.publicId} />
            <input name="integrity" type="hidden" value={runIntegrityCheck ? "1" : "0"} />
            <button className="button-secondary" type="submit">
              Verify Anchor
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

      <div className="space-y-6">
        <Card className="border-civic/20 bg-civic/5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-civic">Proof Summary</p>
              <p className="mt-3 text-base text-ink">{verification.overall.summary}</p>
              <p className="mt-3 text-sm text-slate-600">
                This page separates local hash recomputation from Solana anchor receipt verification. It does not claim legal guarantees beyond the evidence shown here.
              </p>
            </div>
            <StatusBadge value={getDisplayStatus(verification.overall.status)} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Integrity Check</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <StatusBadge value={getDisplayStatus(integrityStatus)} />
                <span className="text-xs text-slate-500">Local hash recomputation</span>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Anchor Check</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <StatusBadge value={getDisplayStatus(anchorStatus)} />
                <span className="text-xs text-slate-500">Solana receipt verification</span>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall Proof Status</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <StatusBadge value={getDisplayStatus(verification.overall.status)} />
                <span className="text-xs text-slate-500">Combined evidence posture</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Evidence Summary</h2>
          <dl className="mt-4">
            <DataRow label="Notice ID" value={notice.publicId} />
            <DataRow label="Status" value={<StatusBadge value={getLifecycleStatus(notice)} />} />
            <DataRow label="Sender" value={`${notice.createdBy.name} (${notice.createdBy.email})`} />
            <DataRow label="Recipient" value={`${notice.recipient.name} (${notice.recipient.email})`} />
            <DataRow label="Sent At" value={formatDate(notice.sentAt)} />
            <DataRow label="Notification Generated" value={formatDate(notice.notifiedAt)} />
            <DataRow label="Viewed At" value={formatDate(notice.viewedAt)} />
            <DataRow label="Acknowledged At" value={formatDate(notice.acknowledgedAt)} />
            <DataRow label="Notice Recorded At" value={formatDate(notice.createdAt)} />
            <DataRow label="Anchor Timestamp" value={formatDate(notice.anchorTimestamp)} />
          </dl>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Solana Anchor Receipt</h2>
          {anchorReceipt ? (
            <>
              <dl className="mt-4">
                <DataRow label="Anchor ID" value={anchorReceipt.anchorId} />
                <DataRow label="Cluster" value={formatCluster(anchorReceipt.cluster)} />
                <DataRow
                  label="Transaction Signature"
                  value={
                    anchorReceipt.transactionSignature ? (
                      <MonospaceValue copyLabel="Copy Signature" value={anchorReceipt.transactionSignature} />
                    ) : (
                      "Not recorded"
                    )
                  }
                />
                <DataRow label="Slot" value={anchorReceipt.slot?.toLocaleString() ?? "Not recorded"} />
                <DataRow
                  label="Commitment / Finalization"
                  value={anchorReceipt.commitment ? titleCase(anchorReceipt.commitment) : "Not recorded"}
                />
                <DataRow label="Anchor Timestamp" value={formatDate(anchorReceipt.anchoredAt)} />
                <DataRow label="Confirmed At" value={formatDate(anchorReceipt.anchorConfirmedAt)} />
                <DataRow
                  label="Explorer URL"
                  value={
                    anchorReceipt.explorerUrl ? (
                      <a
                        className="font-medium text-civic underline underline-offset-4"
                        href={anchorReceipt.explorerUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        View on Solana Explorer
                      </a>
                    ) : anchorReceipt.cluster === "localnet" || anchorReceipt.cluster?.startsWith("http") ? (
                      "Local or custom RPC anchor. No public explorer URL is available."
                    ) : (
                      "No explorer URL recorded"
                    )
                  }
                />
              </dl>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Anchor Checks</h3>
                  {runAnchorCheck ? (
                    <ul className="mt-3 space-y-2 text-sm">
                      <ChecklistItem
                        label="Anchored hash matches the expected notice hash"
                        passed={verification.anchor.anchoredHashMatchesExpected}
                      />
                      <ChecklistItem
                        label="Solana transaction signature exists"
                        passed={verification.anchor.transactionSignaturePresent}
                      />
                      <ChecklistItem
                        label="Cluster is recorded"
                        passed={verification.anchor.clusterPresent}
                      />
                      <ChecklistItem
                        label="Slot is recorded when available"
                        passed={verification.anchor.slotPresent || anchorReceipt.slot === null}
                      />
                      <ChecklistItem
                        label="Commitment / finalization status is recorded when available"
                        passed={
                          verification.anchor.commitmentPresent || anchorReceipt.commitment === null
                        }
                      />
                      <ChecklistItem
                        label="Anchor timestamp is recorded"
                        passed={verification.anchor.anchorTimestampPresent}
                      />
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-600">{verification.anchor.reason}</p>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-ink">Receipt Notes</p>
                  <p className="mt-3 text-sm text-slate-600">
                    {anchorReceipt.cluster === "localnet" || anchorReceipt.cluster?.startsWith("http")
                      ? "This demo uses local or mock Solana receipt metadata. The page verifies stored receipt fields, but it does not make a live Solana RPC call."
                      : "This receipt includes public-cluster metadata. The page verifies the stored receipt fields, not a live Solana RPC response."}
                  </p>
                  <p className="mt-3 text-sm text-slate-600">
                    {runAnchorCheck
                      ? verification.anchor.reason
                      : "Run Verify Anchor to compare the stored notice hash against the Solana anchor receipt metadata."}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No Solana anchor receipt has been issued for this notice yet.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Hash Record</h2>
          <dl className="mt-4">
            <DataRow
              label="Canonical Notice Payload"
              value={
                <p className="text-sm text-slate-600">
                  Computed from notice body, attachment hashes, and notice metadata
                </p>
              }
            />
            <DataRow
              label="Body SHA-256"
              value={<MonospaceValue copyLabel="Copy Hash" value={notice.bodyHash} />}
            />
            <DataRow
              label="Notice Hash"
              value={<MonospaceValue copyLabel="Copy Hash" value={notice.noticeHash} />}
            />
            <DataRow
              label="Anchored Hash"
              value={
                notice.anchorHash ? (
                  <MonospaceValue copyLabel="Copy Hash" value={notice.anchorHash} />
                ) : (
                  "Not anchored"
                )
              }
            />
            <DataRow
              label="Recomputed Notice Hash"
              value={
                runIntegrityCheck ? (
                  <MonospaceValue
                    copyLabel="Copy Hash"
                    value={verification.integrity.recomputedNoticeHash}
                  />
                ) : (
                  "Run Verify Integrity to recompute the notice hash locally."
                )
              }
            />
            <DataRow
              label="Attachment Merkle Root"
              value={
                notice.attachmentMerkleRoot ? (
                  <MonospaceValue copyLabel="Copy Hash" value={notice.attachmentMerkleRoot} />
                ) : (
                  "No attachments included in this notice"
                )
              }
            />
          </dl>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Local Integrity Checks</h3>
              {runIntegrityCheck ? (
                <ul className="mt-3 space-y-2 text-sm">
                  <ChecklistItem
                    label="Body SHA-256 matches the stored body hash"
                    passed={verification.integrity.bodyHashMatches}
                  />
                  <ChecklistItem
                    label={
                      notice.attachments.length > 0
                        ? "Attachment Merkle root matches the stored Merkle root"
                        : "No attachments were included in this notice"
                    }
                    passed={
                      notice.attachments.length > 0
                        ? verification.integrity.attachmentMerkleRootMatches
                        : true
                    }
                  />
                  <ChecklistItem
                    label="Notice hash matches the stored notice hash"
                    passed={verification.integrity.noticeHashMatches}
                  />
                  <ChecklistItem
                    label="Recomputed notice hash matches the stored notice hash"
                    passed={verification.integrity.recomputedMatchesStoredNoticeHash}
                  />
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-600">{verification.integrity.reason}</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Attachments And Merkle Record
              </h3>
              {notice.attachments.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">No attachments included in this notice.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {notice.attachments.map((attachment: (typeof notice.attachments)[number]) => (
                    <div className="rounded-xl border border-border p-4" key={attachment.id}>
                      <p className="font-medium text-ink">{attachment.originalName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {attachment.mimeType} · {attachment.byteSize.toLocaleString()} bytes
                      </p>
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Attachment SHA-256
                        </p>
                        <div className="mt-2">
                          <MonospaceValue copyLabel="Copy Hash" value={attachment.sha256} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Event Timeline</h2>
          <div className="mt-4">
            <Timeline
              items={notice.events.map((event: (typeof notice.events)[number]) => ({
                id: event.id,
                title: timelineLabel(event.eventType),
                summary: event.summary,
                at: event.createdAt,
                actor: event.actorLabel
              }))}
            />
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
