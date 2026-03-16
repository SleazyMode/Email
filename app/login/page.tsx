import Link from "next/link";

import { loginMunicipalAction } from "@/app/actions";
import { Card, PageShell } from "@/components/ui";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <PageShell
      title="Municipal User Login"
      subtitle="Use a seeded admin or staff account to create, send, anchor, and verify official notices."
    >
      <div className="mx-auto max-w-xl">
        <Card>
          <form action={loginMunicipalAction} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>
              <input defaultValue="staff@riverton.gov" name="email" type="email" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Password</label>
              <input defaultValue="Password123!" name="password" type="password" />
            </div>
            {params.error ? (
              <p className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                Invalid credentials.
              </p>
            ) : null}
            <button className="button-primary w-full" type="submit">
              Sign In
            </button>
          </form>
          <div className="mt-6 text-sm text-slate-600">
            <p>Demo users:</p>
            <p>`admin@riverton.gov` / `Password123!`</p>
            <p>`staff@riverton.gov` / `Password123!`</p>
            <p className="mt-4">
              Recipient access uses a one-time code via the <Link className="text-civic underline" href="/recipient-login">recipient portal</Link>.
            </p>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
