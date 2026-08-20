import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Chaptr · Your syllabus, made manageable",
  description: "Chaptr turns the SSC syllabus into a clear, personalized study plan.",
  icons: {
    icon: "/chaptr-icon-192.png",
    apple: "/chaptr-icon-192.png",
  },
};

export const viewport: Viewport = { themeColor: "#f7f9fc", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><TooltipProvider>{children}</TooltipProvider></body>
    </html>
  );
}
