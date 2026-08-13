import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSC Command Center",
  description: "Zarif's private, weakness-first SSC 2027 study system.",
  applicationName: "SSC Command Center",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SSC Command" },
};

export const viewport: Viewport = { themeColor: "#050a14" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><PwaRegister />{children}</body>
    </html>
  );
}
