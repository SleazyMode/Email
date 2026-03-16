"use client";

import { useState } from "react";

export function CopyValueButton({
  value,
  label = "Copy"
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-civic hover:text-civic"
      onClick={handleCopy}
      type="button"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
