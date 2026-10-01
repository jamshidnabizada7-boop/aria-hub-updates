import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#090d16" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.myariahub.com"),
  title: "ARIA HUB — Jobs, Scholarships & Opportunities in Afghanistan",
  description:
    "Discover verified scholarships, jobs, fellowships, and opportunities in Afghanistan with updates in English, Dari, and Pashto.",
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
      "Discover verified scholarships, jobs, fellowships, and opportunities in Afghanistan with updates in English, Dari, and Pashto.",
    url: "https://www.myariahub.com",
    siteName: "ARIA HUB",
    type: "website",
    images: [
      {
        url: "https://www.myariahub.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "ARIA HUB — Jobs, Scholarships & Opportunities in Afghanistan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ARIA HUB — Jobs, Scholarships & Opportunities in Afghanistan",
    description:
      "Discover verified scholarships, jobs, fellowships, and opportunities in Afghanistan with updates in English, Dari, and Pashto.",
    images: ["https://www.myariahub.com/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Default statically to RTL Farsi so root layout does not read request cookies,
  // which previously forced every route into dynamic SSR and destroyed ISR.
  // [lang]/layout.tsx and LangSync immediately sync document lang/dir for /en and /ps.
  const lang = DEFAULT_LANG;
  const dir = "rtl";

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
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};function load(){if(document.getElementById('clarity-js'))return;t=l.createElement(r);t.id='clarity-js';t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";y=l.getElementsByTagName(r)[0];if(y&&y.parentNode){y.parentNode.insertBefore(t,y);}else{l.head.appendChild(t);}}function defer(fn){if('requestIdleCallback' in c){c.requestIdleCallback(fn,{timeout:1500});}else{c.setTimeout(fn,1000);}}if(document.readyState==='complete'){defer(load);}else{c.addEventListener('load',function(){defer(load);});}})(window, document, "clarity", "script", "ymu0ma5xzk");`,
          }}
        />
        {/* Maze universal snippet — domain verification + live website testing
            and in-product survey prompts (apiKey: b791ebeb-881b-4a3f-bb9c-59ba3371cfac) */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(function (m, a, z, e) {
  var s, t, u, v;
  try {
    t = m.sessionStorage.getItem('maze-us');
  } catch (err) {}

  if (!t) {
    t = new Date().getTime();
    try {
      m.sessionStorage.setItem('maze-us', t);
    } catch (err) {}
  }

  u = document.currentScript || (function () {
    var w = document.getElementsByTagName('script');
    return w[w.length - 1];
  })();
  v = u && u.nonce;

  s = a.createElement('script');
  s.src = z + '?apiKey=' + e;
  s.async = true;
  if (v) s.setAttribute('nonce', v);
  a.getElementsByTagName('head')[0].appendChild(s);
  m.mazeUniversalSnippetApiKey = e;
})(window, document, 'https://snippet.maze.co/maze-universal-loader.js', 'b791ebeb-881b-4a3f-bb9c-59ba3371cfac');`,
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
