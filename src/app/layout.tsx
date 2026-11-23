import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui";

export const metadata: Metadata = {
  title: "Avatar Fit — ton coach 3D",
  description: "Ton avatar 3D, tes programmes, ton coach IA. L'app fitness qui te montre où tu vas.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Avatar Fit", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#060708", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body>
        <StoreProvider>
          {children}
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
