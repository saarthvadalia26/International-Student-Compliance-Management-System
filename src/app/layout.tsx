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
  title: {
    default: `${Branding.appName} | ${Branding.shortName}`,
    template: `%s | ${Branding.shortName}`
  },
  description: `Official ${Branding.appName} of the ${Branding.universityName}.`,
  icons: {
    icon: [
      { url: Branding.faviconPaths.ico },
      { url: Branding.faviconPaths.png16, sizes: "16x16", type: "image/png" },
      { url: Branding.faviconPaths.png32, sizes: "32x32", type: "image/png" }
    ],
    apple: [
      { url: Branding.faviconPaths.appleTouch, sizes: "180x180", type: "image/png" }
    ]
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: Branding.appName,
    description: `Official portal for the ${Branding.universityName}.`,
    url: Branding.officialWebsite,
    siteName: Branding.universityName,
    images: [
      {
        url: Branding.logoPaths.logo,
        width: 512,
        height: 512,
        alt: Branding.universityName
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: Branding.appName,
    description: `Official portal for the ${Branding.universityName}.`,
    images: [Branding.logoPaths.logo]
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
