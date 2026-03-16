import { Attachment, Notice } from "@prisma/client";

import { sha256 } from "@/lib/crypto/hashing";
import { buildMerkleTree } from "@/lib/crypto/merkle";
import { prisma } from "@/lib/db";
import { anchorService, type AnchorVerificationResult } from "@/lib/services/anchor-service";

type NoticeWithAttachments = Notice & {
  attachments: Attachment[];
};

export type IntegrityVerificationResult = {
  status: "passed" | "failed" | "not_run";
  passed: boolean;
  reason: string;
  bodyHashMatches: boolean;
  attachmentMerkleRootMatches: boolean;
  noticeHashMatches: boolean;
  recomputedMatchesStoredNoticeHash: boolean;
  recomputedBodyHash: string;
  recomputedNoticeHash: string;
  recomputedAttachmentMerkleRoot: string | null;
};

export type EvidenceProofStatus = "passed" | "failed" | "pending";

type AnchorCheckSummary = AnchorVerificationResult | {
  passed: false;
  status: "not_run";
  reason: string;
  anchoredHashMatchesExpected: boolean;
  transactionSignaturePresent: boolean;
  clusterPresent: boolean;
  slotPresent: boolean;
  commitmentPresent: boolean;
  anchorTimestampPresent: boolean;
  proofVerified: boolean;
  cluster: string | null;
  transactionSignature: string | null;
  slot: number | null;
  commitment: string | null;
  explorerUrl: string | null;
  anchorTimestamp: Date | null;
  anchorConfirmedAt: Date | null;
};

type EvidenceSummary = Awaited<ReturnType<typeof buildEvidenceSummary>>;
type AnchorReceiptSnapshot = {
  cluster: string | null;
  transactionSignature: string | null;
  slot: number | null;
  commitment: string | null;
  explorerUrl: string | null;
  anchoredAt: Date;
  anchorConfirmedAt: Date | null;
};

function serializeNoticeForHash(
  notice: Pick<Notice, "publicId" | "subject" | "body" | "senderId" | "recipientId" | "createdAt">,
  attachments: Attachment[]
) {
  return JSON.stringify({
    noticeId: notice.publicId,
    subject: notice.subject,
    body: notice.body,
    senderId: notice.senderId,
    recipientId: notice.recipientId,
    createdAt: notice.createdAt.toISOString(),
    attachments: attachments.map((attachment) => ({
      name: attachment.originalName,
      mimeType: attachment.mimeType,
      byteSize: attachment.byteSize,
      sha256: attachment.sha256
    }))
  });
}

function computeAttachmentMerkleRoot(attachments: Attachment[]) {
  if (attachments.length === 0) {
    return null;
  }

  return buildMerkleTree(attachments.map((attachment) => attachment.sha256)).root;
}

function computeNoticeBodyHash(subject: string, body: string) {
  return sha256(JSON.stringify({ subject, body }));
}

function computeNoticeHash(
  notice: Pick<Notice, "publicId" | "subject" | "body" | "senderId" | "recipientId" | "createdAt">,
  attachments: Attachment[]
) {
  return sha256(serializeNoticeForHash(notice, attachments));
}

async function refreshEvidence(noticeId: string) {
  const notice = await prisma.notice.findUniqueOrThrow({
    where: { id: noticeId },
    include: { attachments: true }
  });

  const bodyHash = computeNoticeBodyHash(notice.subject, notice.body);
  const attachmentMerkleRoot = computeAttachmentMerkleRoot(notice.attachments);
  const noticeHash = computeNoticeHash(notice, notice.attachments);

  return prisma.notice.update({
    where: { id: noticeId },
    data: {
      bodyHash,
      attachmentMerkleRoot,
      noticeHash
    }
  });
}

async function verifyNoticeIntegrity(noticeInput: NoticeWithAttachments | string): Promise<IntegrityVerificationResult> {
  const notice =
    typeof noticeInput === "string"
      ? await prisma.notice.findUniqueOrThrow({
          where: { id: noticeInput },
          include: { attachments: true }
        })
      : noticeInput;

  const recomputedBodyHash = computeNoticeBodyHash(notice.subject, notice.body);
  const recomputedNoticeHash = computeNoticeHash(notice, notice.attachments);
  const recomputedAttachmentMerkleRoot = computeAttachmentMerkleRoot(notice.attachments);
  const bodyHashMatches = recomputedBodyHash === notice.bodyHash;
  const attachmentMerkleRootMatches = recomputedAttachmentMerkleRoot === notice.attachmentMerkleRoot;
  const noticeHashMatches = recomputedNoticeHash === notice.noticeHash;
  const recomputedMatchesStoredNoticeHash = recomputedNoticeHash === notice.noticeHash;
  const passed =
    bodyHashMatches &&
    attachmentMerkleRootMatches &&
    noticeHashMatches &&
    recomputedMatchesStoredNoticeHash;

  return {
    status: passed ? "passed" : "failed",
    passed,
    reason: passed
      ? "Stored evidence values match the recomputed body hash, attachment Merkle root, and notice hash."
      : "Stored evidence values do not match the recomputed local hashes.",
    bodyHashMatches,
    attachmentMerkleRootMatches,
    noticeHashMatches,
    recomputedMatchesStoredNoticeHash,
    recomputedBodyHash,
    recomputedNoticeHash,
    recomputedAttachmentMerkleRoot
  };
}

function createNotRunIntegrityResult(): IntegrityVerificationResult {
  return {
    status: "not_run",
    passed: false,
    reason: "Run Verify Integrity to recompute local hashes for the notice body and attachments.",
    bodyHashMatches: false,
    attachmentMerkleRootMatches: false,
    noticeHashMatches: false,
    recomputedMatchesStoredNoticeHash: false,
    recomputedBodyHash: "",
    recomputedNoticeHash: "",
    recomputedAttachmentMerkleRoot: null
  };
}

function createOverallProofStatus(
  integrityVerification: IntegrityVerificationResult,
  anchorVerification: AnchorCheckSummary
): {
  status: EvidenceProofStatus;
  summary: string;
} {
  if (integrityVerification.status === "passed" && anchorVerification.status === "passed") {
    return {
      status: "passed",
      summary:
        "This notice was hashed, recorded, and anchored to Solana. Local integrity and on-chain anchor checks passed."
    };
  }

  if (integrityVerification.status === "failed" || anchorVerification.status === "failed") {
    return {
      status: "failed",
      summary:
        "This notice has stored evidence or Solana anchor metadata that did not pass verification. Review the detailed checks below."
    };
  }

  return {
    status: "pending",
    summary:
      "This notice was hashed, recorded, and anchored to Solana. Run the local integrity and on-chain anchor checks to confirm the evidence record."
  };
}

function createNotRunAnchorResult(anchorReceipt?: AnchorReceiptSnapshot): AnchorCheckSummary {
  const receipt = anchorReceipt;

  return {
    passed: false,
    status: "not_run",
    reason: "Run Verify Anchor to check the stored Solana anchor receipt metadata.",
    anchoredHashMatchesExpected: false,
    transactionSignaturePresent: false,
    clusterPresent: false,
    slotPresent: false,
    commitmentPresent: false,
    anchorTimestampPresent: false,
    proofVerified: false,
    cluster: receipt?.cluster ?? null,
    transactionSignature: receipt?.transactionSignature ?? null,
    slot: receipt?.slot ?? null,
    commitment: receipt?.commitment ?? null,
    explorerUrl: receipt?.explorerUrl ?? null,
    anchorTimestamp: receipt?.anchoredAt ?? null,
    anchorConfirmedAt: receipt?.anchorConfirmedAt ?? null
  };
}

async function buildEvidenceSummary(
  publicId: string,
  options?: {
    runIntegrityCheck?: boolean;
    runAnchorCheck?: boolean;
  }
) {
  const notice = await prisma.notice.findUniqueOrThrow({
    where: { publicId },
    include: {
      createdBy: true,
      recipient: true,
      attachments: true,
      events: {
        orderBy: { createdAt: "asc" }
      },
      notifications: {
        orderBy: { createdAt: "desc" }
      },
      anchorMemberships: {
        include: {
          anchorReceipt: true
        }
      }
    }
  });

  const integrityVerification = options?.runIntegrityCheck
    ? await verifyNoticeIntegrity(notice)
    : createNotRunIntegrityResult();
  const anchorVerification = options?.runAnchorCheck
    ? await anchorService.verifyNoticeAnchor(notice.id)
    : createNotRunAnchorResult(notice.anchorMemberships[0]?.anchorReceipt);
  const overallProof = createOverallProofStatus(integrityVerification, anchorVerification);

  return {
    notice,
    verification: {
      integrity: integrityVerification,
      anchor: anchorVerification,
      overall: overallProof
    }
  };
}

function exportEvidenceJson(data: EvidenceSummary) {
  return JSON.stringify(data, null, 2);
}

export const evidenceService = {
  computeAttachmentMerkleRoot,
  computeNoticeBodyHash,
  computeNoticeHash,
  refreshEvidence,
  buildEvidenceSummary,
  verifyNoticeIntegrity,
  exportEvidenceJson
};
