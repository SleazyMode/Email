import Link from "next/link";

import { Card, PageShell } from "@/components/ui";
import { prisma } from "@/lib/db";

export default async function HomePage() {
  const counts = {
    notices: await prisma.notice.count(),
    anchors: await prisma.anchorReceipt.count(),
    notifications: await prisma.notification.count()
  };

  return (
    <PageShell
      title="Official Municipal Notice Delivery"
      subtitle="Prototype for secure notice delivery, evidentiary timelines, and tamper-evident anchor receipts backed by a local blockchain-style ledger."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link className="button-primary" href="/login">
            Municipal Login
          </Link>
          <Link className="button-secondary" href="/recipient-login">
            Recipient Login
          </Link>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="bg-gradient-to-br from-white via-white to-slate-50">
          <p className="text-sm uppercase tracking-[0.2em] text-civic">Core Demo Workflow</p>
          <ol className="mt-6 space-y-4 text-sm text-slate-700">
            <li>1. Municipal staff create an official notice and attach supporting files.</li>
            <li>2. The system snapshots content, hashes files, and writes an append-only evidence timeline.</li>
            <li>3. A fake notification email is generated with a portal access prompt.</li>
            <li>4. The recipient logs in with a one-time code, views the notice, and acknowledges receipt.</li>
            <li>5. Admin users verify integrity and anchor proofs in the mock blockchain ledger.</li>
          </ol>
        </Card>
        <div className="grid gap-4">
          <Card>
            <p className="text-sm text-slate-500">Seeded notices</p>
            <p className="mt-2 text-3xl font-semibold">{counts.notices}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Ledger anchors</p>
            <p className="mt-2 text-3xl font-semibold">{counts.anchors}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Fake email records</p>
            <p className="mt-2 text-3xl font-semibold">{counts.notifications}</p>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
