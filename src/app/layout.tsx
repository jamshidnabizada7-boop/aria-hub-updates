import type { Metadata } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { isLang } from "@/lib/i18n-config";
import { Providers } from "@/components/providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

const LANGS = ["en", "fa", "ps"];
const DEFAULT_LANG = "fa";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "ARIA HUB | آریا هاب — Jobs, Scholarships & Opportunities in Afghanistan",
  description:
    "New jobs, scholarships, fellowships and training opportunities from trusted organizations — summarized and translated into Dari, Pashto and English. فرصت‌های شغلی، بورسیه و آموزشی به سه زبان.",
  keywords: [
    "ARIA HUB",
    "آریا هاب",
    "اریا هاب",
    "Afghanistan jobs",
    "وظایف افغانستان",
    "وظایف خالی",
    "scholarships",
    "بورسیه تحصیلی",
    "تخسیص",
    "opportunities",
    "internships",
    "fellowships",
  ],
  authors: [{ name: "ARIA HUB" }],
  icons: {
    icon: "/images/logo-mark.webp",
    apple: "/images/logo-mark.webp",
  },
  openGraph: {
    title: "ARIA HUB | آریا هاب — Jobs, Scholarships & Opportunities in Afghanistan",
    description:
      "New jobs, scholarships, fellowships and training opportunities — summarized and translated into Dari, Pashto and English.",
    siteName: "ARIA HUB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ARIA HUB | آریا هاب — Jobs, Scholarships & Opportunities in Afghanistan",
    description:
      "New jobs, scholarships, fellowships and training opportunities — summarized and translated into Dari, Pashto and English.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Language is path-addressable (/fa, /en, /ps). Middleware keeps the
  // aria-lang cookie in sync with the URL prefix so the shell (html lang/dir)
  // is rendered server-side in the right language.
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("aria-lang")?.value;
  const lang = isLang(cookieLang) ? cookieLang : DEFAULT_LANG;
  const dir = lang === "en" ? "ltr" : "rtl";

  return (
    <html
      lang={lang}
      dir={dir}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable}`}
    >
      <head>
        {/* google-adsense-account meta + the AdSense script itself live in
            /[lang]/layout.tsx so ONLY public pages load ads — /admin and
            non-public routes stay ad-free (invalid-impression protection). */}
      </head>
      <body
        suppressHydrationWarning
        className="font-sans antialiased bg-background text-foreground"
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
