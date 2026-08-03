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
  icons: [
    {
      url: "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      type: "image/x-icon",
    },
  ],
  openGraph: {
    title: Branding.appName,
    description: `Official portal for the ${Branding.universityName}.`,
    url: Branding.officialWebsite,
    siteName: Branding.universityName,
    images: [
      {
        url: Branding.ogImage,
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
    images: [Branding.ogImage]
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
      <head>
        <link rel="icon" href="/assets/branding/nfsu-logo.png" type="image/png" />
        <link rel="shortcut icon" href="/assets/branding/nfsu-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
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
