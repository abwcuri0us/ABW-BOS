import type { Metadata } from "next";
import { Noto_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const notoSerif = Noto_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ABW-BOS — Business Operating System",
  description:
    "ABW Business Operating System: a unified, offline-first, plugin-based enterprise platform for ABWcurious.",
  keywords: [
    "ABW-BOS",
    "Business Operating System",
    "Enterprise",
    "ERP",
    "CRM",
    "Offline-first",
  ],
  authors: [{ name: "ABWcurious" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${notoSerif.variable} font-serif antialiased bg-background text-foreground min-h-screen`}
        style={{ fontFamily: "'Times New Roman', 'Noto Serif', Times, serif" }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
