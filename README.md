# **Municipal Digital Notice System**

This repository contains a prototype infrastructure for verifiable digital notice delivery. The system adds an evidence layer on top of standard email notifications, allowing organizations to generate and audit important communications with a tamper-evident record of what was sent, when it was sent, and how recipients interacted with the notice.

Traditional email platforms such as Gmail or Outlook handle message transport but do not provide a reliable mechanism for proving message integrity, delivery events, or recipient acknowledgement. This system addresses that limitation by generating a deterministic evidence record for each notice and anchoring that record to the Solana blockchain.

When a notice is created, the platform generates a canonical evidence record containing the notice body, attachment hashes, recipient metadata, and timestamps. A SHA-256 hash is computed from this canonical record to produce a unique notice hash representing the exact contents of the notice at the moment it was issued.

The notice hash is then anchored to the Solana blockchain, creating an independently verifiable timestamp reference. No message contents or personal data are written on-chain; only cryptographic hashes and anchor metadata are recorded.

Recipients are notified through standard email channels and directed to a secure portal where the notice can be viewed and acknowledged. Lifecycle events such as notice creation, notification generation, portal access, viewing, acknowledgement, and blockchain anchoring are recorded in an append-only audit log.

For each notice the system generates an Evidence Report containing:

- canonical notice metadata

- cryptographic hashes of the notice body and attachments

- attachment Merkle root

- recomputed integrity verification results

- Solana anchor receipt metadata

- a chronological timeline of notice lifecycle events

Integrity verification confirms that the stored notice record has not been modified. Anchor verification confirms that the notice hash matches the value recorded in the blockchain transaction.

Together these mechanisms create a tamper-evident audit trail for digital notice delivery, enabling organizations to combine standard email notifications with independently verifiable cryptographic evidence of notice issuance and recipient interaction.

# **Municipal Digital Notice Prototype**

This repository implements a local demo of a blockchain-anchored notice system. Municipal staff create and send official notices, recipients access notices through a secure portal, and the system generates tamper-evident evidence records anchored to a local mock blockchain ledger.
## Stack

- Next.js App Router
- TypeScript
- Prisma + SQLite
- Tailwind CSS
- Local file storage for attachments
- Mock email notification rail
- Mock blockchain anchor ledger with simple receipt and Merkle inclusion proof

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment file if needed:

   ```bash
   cp .env.example .env
   ```

3. Generate Prisma client, create the SQLite database, and seed demo data:

   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

4. Run the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Seeded Users

- Municipal admin: `admin@riverton.gov` / `Password123!`
- Municipal staff: `staff@riverton.gov` / `Password123!`
- Resident recipient: `citizen@example.com`

Recipient login uses a one-time code generated from the recipient portal. For the local demo, the generated code is shown on the page and written to the notification record.

## Demo Workflow

1. Log in as `staff@riverton.gov`.
2. Open `Create Notice`, draft a notice, and save it.
3. Click `Send Notice`.
4. The system records send and notification events and immediately creates a blockchain anchor receipt in the local mock ledger.
5. Open the recipient portal, request a one-time code, and sign in as `citizen@example.com`.
6. View the notice and click `Acknowledge Receipt`.
7. Return to the admin side and open the notice evidence report.
8. Click `Verify Integrity` to confirm both content integrity and anchor inclusion.

The seed data includes one already anchored resident notice so the blockchain receipt view is available immediately.

## File Structure Overview

```text
app/
  admin/                          admin and staff dashboard, notice, and evidence pages
  recipient/                      recipient inbox and notice pages
  api/                            attachment download and evidence export routes
  actions.ts                      server actions for auth, notices, and verification
components/
  ui.tsx                          shared page shell, cards, badges, and timeline UI
lib/
  auth/                           cookie session helpers and role guards
  crypto/                         SHA-256 and Merkle proof helpers
  services/                       auth, notice, notification, audit, evidence, anchor services
  db.ts                           Prisma client
prisma/
  schema.prisma                   database schema
  seed.ts                         seeded users, notices, attachments, events, and anchors
storage/
  attachments/                    local attachment files used by the demo
docs/
  architecture.md                 architecture summary and assumptions
```

## Database Schema

Core models:

- `User`: admin, staff, and recipient identities
- `Session`: cookie-backed application sessions
- `Notice`: immutable notice snapshot, lifecycle timestamps, and anchor metadata
- `Attachment`: local file metadata and SHA-256 digest
- `AuditEvent`: append-only event log
- `Notification`: fake outbound email records
- `AnchorReceipt`: mock blockchain ledger entry
- `NoticeAnchorMembership`: Merkle proof membership for a notice inside an anchor receipt

Enums:

- `UserRole`: `ADMIN`, `STAFF`, `RECIPIENT`
- `NoticeStatus`: `DRAFT`, `SENT`, `NOTIFIED`, `VIEWED`, `ACKNOWLEDGED`, `ANCHORED`
- `NoticeCategory`: `TAX`, `LICENSING`, `ZONING`, `COMPLIANCE`, `UTILITIES`, `GENERAL`
- `EventType`: includes all required notice, notification, evidence, and blockchain events

## Architecture Summary

- `auth service`: municipal email/password login, recipient one-time code flow, cookie sessions
- `notice service`: notice creation, file storage, send/view/acknowledge lifecycle updates
- `notification service`: fake outbound email generation persisted in SQLite
- `audit service`: append-only event creation only, with no edit path in the UI
- `evidence service`: body hash, attachment hash, notice hash, integrity verification, JSON export
- `anchor service`: `AnchorService` abstraction and `MockBlockchainLedger` implementation

The mock ledger stores only hashes, anchor roots, timestamps, receipt linkage, and proof objects. No notice content, attachment payloads, or recipient PII are written to the anchored ledger.

## Verification Flow

The evidence page recomputes:

- body SHA-256
- overall notice hash
- attachment Merkle root

It then compares those values to stored evidence fields and validates the notice hash against the stored Merkle proof and anchored root.

## Known Limitations

- Authentication is prototype-grade and not hardened for production use.
- Recipient one-time codes are surfaced directly for demo convenience.
- No real SMTP delivery, public blockchain settlement, or external timestamp authority is used.
- No malware scanning, file retention policy, or signed PDF generation is included.
- Single-municipality scope only; no tenant isolation or advanced org hierarchy.
- Attachment preview is limited to browser download behavior.
- The app treats the database and local file storage as trusted infrastructure for the demo.
- Search/filter-heavy admin workflow and manual batch anchoring were intentionally removed from the main path to keep the demo focused and fast.

## Useful Commands

```bash
npm run dev
npm run build
npx prisma studio
npm run db:seed
```
