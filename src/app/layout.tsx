import type { Metadata } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { isLang } from "@/lib/i18n-config";
import { Providers } from "@/components/providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

const LANGS = ["en", "fa", "ps"];
const DEFAULT_LANG = "fa";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  adjustFontFallback: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  adjustFontFallback: false,
});

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  display: "swap",
  preload: true,
  fallback: [
    "Noto Sans Arabic",
    "Tahoma",
    "Segoe UI Historic",
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "sans-serif",
  ],
});

export const metadata: Metadata = {
  title: "ARIA HUB — Jobs, Scholarships & Opportunities in Afghanistan",
  description:
    "Discover verified scholarships, international jobs, fellowships, and career opportunities for Afghans with real-time updates in Dari, Pashto, and English.",
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
    title: "ARIA HUB — Jobs, Scholarships & Opportunities in Afghanistan",
    description:
      "Discover verified scholarships, international jobs, fellowships, and career opportunities for Afghans with real-time updates in Dari, Pashto, and English.",
    siteName: "ARIA HUB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ARIA HUB — Jobs, Scholarships & Opportunities in Afghanistan",
    description:
      "Discover verified scholarships, international jobs, fellowships, and career opportunities for Afghans with real-time updates in Dari, Pashto, and English.",
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
        {/* Microsoft Clarity session recording and heatmaps (Project ID: ymu0ma5xzk) */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "ymu0ma5xzk");`,
          }}
        />
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
