import type { Metadata, Viewport } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorkerCleanup } from "@/components/service-worker-cleanup";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSC Command Center",
  description: "Zarif's private, weakness-first SSC 2027 study system.",
};

export const viewport: Viewport = { themeColor: "#f7f9fc", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><ServiceWorkerCleanup /><TooltipProvider>{children}</TooltipProvider></body>
    </html>
  );
}
