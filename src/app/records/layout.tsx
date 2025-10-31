import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chess Records",
};

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

