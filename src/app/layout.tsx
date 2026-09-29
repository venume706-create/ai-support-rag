import type { Metadata, Viewport } from "next";
import { Caveat, PT_Sans, PT_Serif } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ru } from "@/lib/i18n/ru";
import "./globals.css";

const ptSans = PT_Sans({ variable: "--font-pt-sans", subsets: ["latin", "cyrillic"], weight: ["400", "700"] });
const ptSerif = PT_Serif({ variable: "--font-pt-serif", subsets: ["latin", "cyrillic"], weight: ["400", "700"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin", "cyrillic"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: ru.app.name, template: `%s · ${ru.app.name}` },
  description: ru.app.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Экран целиком, включая область «чёлки» iPhone: отступы задаём сами через safe-area-inset
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4a2916" },
    { media: "(prefers-color-scheme: dark)", color: "#2e190d" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${ptSans.variable} ${ptSerif.variable} ${caveat.variable} font-sans`}>
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
