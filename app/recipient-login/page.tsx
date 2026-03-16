import { loginRecipientAction, requestRecipientCodeAction } from "@/app/actions";
import { Card, PageShell } from "@/components/ui";

export default async function RecipientLoginPage({
  searchParams
}: {
  searchParams: Promise<{ email?: string; code?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <PageShell
      title="Recipient Access Portal"
      subtitle="Recipients receive an email notification that a notice is available and then access the full notice securely in this portal."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Request One-Time Code</h2>
          <form action={requestRecipientCodeAction} className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Recipient Email</label>
              <input defaultValue={params.email ?? "citizen@example.com"} name="email" type="email" />
            </div>
            <button className="button-secondary w-full" type="submit">
              Send Demo Access Code
            </button>
          </form>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Sign In With Code</h2>
          <form action={loginRecipientAction} className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>
              <input defaultValue={params.email ?? "citizen@example.com"} name="email" type="email" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">One-Time Code</label>
              <input defaultValue={params.code ?? ""} name="code" type="text" />
            </div>
            {params.code ? (
              <p className="rounded-xl border border-civic/20 bg-civic/10 px-4 py-3 text-sm text-civic">
                Demo code generated: {params.code}
              </p>
            ) : null}
            {params.error ? (
              <p className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                Invalid or expired code.
              </p>
            ) : null}
            <button className="button-primary w-full" type="submit">
              Access Notices
            </button>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}
