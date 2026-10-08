import type { Metadata, Viewport } from "next";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";

const DESCRIPTION =
  "Paste your notes, add a photo of your textbook or diagram, and Powerly turns it into a finished, editable slide deck in under a minute.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://powerly-khaki.vercel.app"),
  title: {
    default: "Powerly — notes to presentation",
    template: "%s · Powerly",
  },
  description: DESCRIPTION,
  openGraph: {
    title: "Powerly — notes to presentation",
    description: DESCRIPTION,
    siteName: "Powerly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Powerly — notes to presentation",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#1C1712",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-espresso text-cream">
        {children}
      </body>
    </html>
  );
}
