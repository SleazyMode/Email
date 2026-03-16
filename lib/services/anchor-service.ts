import { EventType, NoticeStatus } from "@prisma/client";

import { buildMerkleTree, createMerkleProof, type MerkleProofStep, verifyMerkleProof } from "@/lib/crypto/merkle";
import { randomToken, sha256 } from "@/lib/crypto/hashing";
import { prisma } from "@/lib/db";
import { auditService } from "@/lib/services/audit-service";

export type AnchorVerificationResult = {
  passed: boolean;
  status: "passed" | "failed" | "not_anchored";
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

export interface AnchorService {
  anchorNoticeBatch(noticeIds: string[], actorId: string, actorLabel: string): Promise<string | null>;
  verifyNoticeAnchor(noticeId: string): Promise<AnchorVerificationResult>;
}

function buildExplorerUrl(cluster: string, transactionSignature: string) {
  if (cluster === "mainnet-beta") {
    return `https://explorer.solana.com/tx/${transactionSignature}`;
  }

  if (cluster === "devnet" || cluster === "testnet") {
    return `https://explorer.solana.com/tx/${transactionSignature}?cluster=${cluster}`;
  }

  return null;
}

function createPseudoSolanaSignature(seed: string) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digest = sha256(seed);

  return Array.from({ length: 88 }, (_, index) => {
    const pair = digest.slice((index * 2) % digest.length, ((index * 2) % digest.length) + 2);
    const value = Number.parseInt(pair.padEnd(2, "0"), 16);
    return alphabet[value % alphabet.length];
  }).join("");
}

function createSolanaMetadata(anchorId: string, root: string) {
  const cluster = process.env.SOLANA_DEMO_CLUSTER ?? "localnet";
  const transactionSignature = createPseudoSolanaSignature(`solana:${anchorId}:${root}`);
  const slot = Number.parseInt(sha256(`slot:${anchorId}`).slice(0, 8), 16);
  const commitment = "finalized";

  return {
    cluster,
    transactionSignature,
    slot,
    commitment,
    explorerUrl: buildExplorerUrl(cluster, transactionSignature)
  };
}

export class MockSolanaAnchorService implements AnchorService {
  async anchorNoticeBatch(noticeIds: string[], actorId: string, actorLabel: string) {
    const notices = await prisma.notice.findMany({
      where: {
        id: { in: noticeIds }
      },
      include: {
        anchorMemberships: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    const anchorable = notices.filter((notice) => notice.anchorMemberships.length === 0);
    if (anchorable.length === 0) {
      return null;
    }

    const leaves = anchorable.map((notice) => notice.noticeHash);
    const { root } = buildMerkleTree(leaves);
    const previous = await prisma.anchorReceipt.findFirst({
      orderBy: {
        anchoredAt: "desc"
      }
    });

    const anchorId = `SOL-${new Date().getFullYear()}-${randomToken(4).toUpperCase()}`;
    const anchoredAt = new Date();
    const solanaMetadata = createSolanaMetadata(anchorId, root);
    const ledgerProof = {
      algorithm: "sha256-merkle-v1",
      receiptHash: sha256(`${previous?.batchRoot ?? "GENESIS"}:${root}:${anchorId}`),
      leafCount: anchorable.length
    };

    const receipt = await prisma.anchorReceipt.create({
      data: {
        anchorId,
        batchRoot: root,
        previousAnchorId: previous?.anchorId ?? null,
        ledgerProof: JSON.stringify(ledgerProof),
        status: "confirmed",
        cluster: solanaMetadata.cluster,
        transactionSignature: solanaMetadata.transactionSignature,
        slot: solanaMetadata.slot,
        commitment: solanaMetadata.commitment,
        explorerUrl: solanaMetadata.explorerUrl,
        anchoredAt,
        anchorConfirmedAt: anchoredAt
      }
    });

    for (const notice of anchorable) {
      const proofPath = createMerkleProof(leaves, notice.noticeHash);

      await prisma.noticeAnchorMembership.create({
        data: {
          noticeId: notice.id,
          anchorReceiptId: receipt.id,
          leafHash: notice.noticeHash,
          proofPath: JSON.stringify(proofPath)
        }
      });

      await prisma.notice.update({
        where: { id: notice.id },
        data: {
          status: NoticeStatus.ANCHORED,
          anchorStatus: "anchored",
          anchorReceiptId: receipt.anchorId,
          anchorHash: root,
          anchorTimestamp: receipt.anchoredAt
        }
      });

      await auditService.appendEvent({
        noticeId: notice.id,
        eventType: EventType.BLOCKCHAIN_ANCHOR_SUBMITTED,
        actorId,
        actorLabel,
        summary: `Solana anchor submitted (${anchorId}) on ${solanaMetadata.cluster}.`,
        metadata: {
          anchorId,
          batchRoot: root,
          cluster: solanaMetadata.cluster,
          transactionSignature: solanaMetadata.transactionSignature,
          slot: solanaMetadata.slot,
          commitment: solanaMetadata.commitment
        }
      });

      await auditService.appendEvent({
        noticeId: notice.id,
        eventType: EventType.BLOCKCHAIN_ANCHOR_CONFIRMED,
        actorId,
        actorLabel,
        summary: `Solana anchor confirmed (${anchorId}) with ${solanaMetadata.commitment} commitment.`,
        metadata: {
          anchorId,
          batchRoot: root,
          cluster: solanaMetadata.cluster,
          transactionSignature: solanaMetadata.transactionSignature,
          slot: solanaMetadata.slot,
          commitment: solanaMetadata.commitment
        }
      });
    }

    return anchorId;
  }

  async verifyNoticeAnchor(noticeId: string): Promise<AnchorVerificationResult> {
    const membership = await prisma.noticeAnchorMembership.findFirst({
      where: { noticeId },
      include: {
        anchorReceipt: true,
        notice: true
      }
    });

    if (!membership) {
      return {
        passed: false,
        status: "not_anchored",
        reason: "No Solana anchor receipt exists for this notice.",
        anchoredHashMatchesExpected: false,
        transactionSignaturePresent: false,
        clusterPresent: false,
        slotPresent: false,
        commitmentPresent: false,
        anchorTimestampPresent: false,
        proofVerified: false,
        cluster: null,
        transactionSignature: null,
        slot: null,
        commitment: null,
        explorerUrl: null,
        anchorTimestamp: null,
        anchorConfirmedAt: null
      };
    }

    const proof = JSON.parse(membership.proofPath) as MerkleProofStep[];
    const proofVerified = verifyMerkleProof(
      membership.leafHash,
      proof,
      membership.anchorReceipt.batchRoot
    );
    const anchoredHashMatchesExpected =
      membership.leafHash === membership.notice.noticeHash &&
      membership.notice.anchorHash === membership.anchorReceipt.batchRoot;
    const transactionSignaturePresent = Boolean(membership.anchorReceipt.transactionSignature);
    const clusterPresent = Boolean(membership.anchorReceipt.cluster);
    const slotPresent = membership.anchorReceipt.slot !== null;
    const commitmentPresent = Boolean(membership.anchorReceipt.commitment);
    const anchorTimestampPresent = Boolean(membership.anchorReceipt.anchoredAt);
    const passed =
      proofVerified &&
      anchoredHashMatchesExpected &&
      transactionSignaturePresent &&
      clusterPresent &&
      anchorTimestampPresent;

    return {
      passed,
      status: passed ? "passed" : "failed",
      reason: passed
        ? "The anchored notice hash matches the stored notice hash and the Solana receipt metadata is present."
        : "The Solana anchor receipt is incomplete or does not match the stored notice hash.",
      anchoredHashMatchesExpected,
      transactionSignaturePresent,
      clusterPresent,
      slotPresent,
      commitmentPresent,
      anchorTimestampPresent,
      proofVerified,
      cluster: membership.anchorReceipt.cluster,
      transactionSignature: membership.anchorReceipt.transactionSignature,
      slot: membership.anchorReceipt.slot,
      commitment: membership.anchorReceipt.commitment,
      explorerUrl: membership.anchorReceipt.explorerUrl,
      anchorTimestamp: membership.anchorReceipt.anchoredAt,
      anchorConfirmedAt: membership.anchorReceipt.anchorConfirmedAt
    };
  }
}

export const anchorService = new MockSolanaAnchorService();
