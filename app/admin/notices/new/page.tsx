import { NoticeCategory } from "@prisma/client";

import { createNoticeAction, logoutAction } from "@/app/actions";
import { AppNav, Card, PageShell } from "@/components/ui";
import { requireMunicipalUser } from "@/lib/auth/session";
import { noticeService } from "@/lib/services/notice-service";

export default async function NewNoticePage() {
  const user = await requireMunicipalUser();
  const recipients = await noticeService.listRecipients();

  return (
    <PageShell
      title="Create Official Notice"
      subtitle="Draft a notice, attach supporting files, and generate the evidence snapshot that will later be anchored in the mock ledger."
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
      <Card className="mx-auto max-w-4xl">
        <form action={createNoticeAction} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Prepared By</label>
              <input disabled value={`${user.name} (${user.email})`} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Recipient</label>
              <select name="recipientId" required>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.name} ({recipient.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-[1fr_220px]">
            <div>
              <label className="mb-2 block text-sm font-medium">Subject</label>
              <input name="subject" placeholder="Water utility billing adjustment" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Notice Category</label>
              <select name="noticeCategory">
                {Object.values(NoticeCategory).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Notice Body</label>
            <textarea
              className="min-h-[220px]"
              name="body"
              placeholder="Enter the official notice content exactly as delivered through the portal."
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Attachments</label>
            <input multiple name="attachments" type="file" />
            <p className="mt-2 text-sm text-slate-500">
              Files are stored locally and hashed for evidence generation. No attachment content is placed on the anchor ledger.
            </p>
          </div>
          <button className="button-primary" type="submit">
            Save Draft Notice
          </button>
        </form>
      </Card>
    </PageShell>
  );
}
