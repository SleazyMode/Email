import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Municipal Digital Notice System",
  description: "Blockchain-backed municipal notice evidence prototype"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
