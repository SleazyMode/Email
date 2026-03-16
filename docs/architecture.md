# Municipal Notice Prototype

## File Structure

```text
app/
  (public)/                marketing and login routes
  admin/                   municipal admin and staff views
  recipient/               recipient portal
  api/                     route handlers for auth, notices, evidence, and files
components/                reusable UI panels, badges, tables, forms
lib/
  auth/                    session and role enforcement
  services/                auth, notice, notification, evidence, audit, anchor
  crypto/                  hashing and Merkle proof utilities
  db.ts                    Prisma client
  demo.ts                  seeded demo helpers
prisma/
  schema.prisma            SQLite schema
  seed.ts                  seeded users and sample notices
storage/
  attachments/             local attachment files
  exports/                 evidence JSON exports
docs/
  architecture.md          architecture summary, schema notes, assumptions
```

## Schema Summary

- `User`: admin, staff, and recipient identities
- `Session`: cookie-backed login sessions
- `Notice`: immutable subject/body snapshot plus lifecycle timestamps and anchor metadata
- `Attachment`: local file metadata and SHA-256 digest
- `AuditEvent`: append-only notice event stream
- `Notification`: fake outbound email records
- `AnchorReceipt`: local ledger entry in the mock blockchain
- `NoticeAnchorMembership`: proof that a notice hash is included in an anchor batch

## Assumptions

- This prototype is single-municipality and uses simple role checks rather than full tenancy.
- Municipal users authenticate with email/password; recipients use an emailed one-time code shown in the demo notification log.
- Notice content is stored in SQLite for portal access; the mock ledger stores only hashes, Merkle roots, timestamps, chain linkage, and proof objects.
- Attachments are stored on local disk under `storage/attachments`.
- The email layer is intentionally fake and persists a notification log for demo purposes.
- Anchoring is local and verifiable, designed to demonstrate tamper evidence rather than public-chain settlement.
