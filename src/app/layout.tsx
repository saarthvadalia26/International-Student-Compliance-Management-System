import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider, QueryProvider } from "@/providers";
import { Toaster } from "@/components/ui/sonner";
import { initializeStartup } from "@/config/startup";
import "./globals.css";

import { Branding } from "@/config/branding";

// Run environment config validation at application startup
initializeStartup();

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistMono = {
  variable: "--font-geist-mono",
};

export const metadata: Metadata = {
  metadataBase: new URL(Branding.officialWebsite),
  title: {
    default: `${Branding.appName} | ${Branding.shortName}`,
    template: `%s | ${Branding.shortName}`
  },
  description: `Official ${Branding.appName} of the ${Branding.universityName}.`,
  icons: {
    icon: [
      { url: Branding.faviconPaths.ico },
      { url: Branding.faviconPaths.png16, sizes: "16x16", type: "image/png" },
      { url: Branding.faviconPaths.png32, sizes: "32x32", type: "image/png" },
      { url: Branding.faviconPaths.png48, sizes: "48x48", type: "image/png" },
      { url: Branding.faviconPaths.png64, sizes: "64x64", type: "image/png" },
      { url: Branding.faviconPaths.png128, sizes: "128x128", type: "image/png" }
    ],
    apple: [
      { url: Branding.faviconPaths.appleTouch, sizes: "180x180", type: "image/png" }
    ],
    other: [
      { rel: "mask-icon", url: Branding.faviconPaths.maskIcon, color: Branding.themeColors.primary }
    ]
  },
  manifest: "/site.webmanifest",
  other: {
    "msapplication-TileImage": Branding.faviconPaths.mstile,
    "msapplication-TileColor": Branding.themeColors.primary
  },
  openGraph: {
    title: Branding.appName,
    description: `Official portal for the ${Branding.universityName}.`,
    url: Branding.officialWebsite,
    siteName: Branding.universityName,
    images: [
      {
        url: Branding.faviconPaths.ogImage,
        width: 1200,
        height: 630,
        alt: Branding.universityName
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: Branding.appName,
    description: `Official portal for the ${Branding.universityName}.`,
    images: [Branding.faviconPaths.ogImage]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
