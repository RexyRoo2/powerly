import type { Metadata, Viewport } from "next";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
// Every font a generated deck's palette can pick (FontChoiceSchema in
// schema.ts) needs its weight files imported here — a deck that picks a
// font with no matching import here silently falls back to the browser
// default, which is exactly the kind of "ships fine, looks wrong" bug
// nothing else catches. Only 400/600 are loaded per added font (deck text
// only ever renders at weight 400/500/600/700, and 600 reads close enough
// to 700 that a true 700 file isn't worth the extra weight) — the existing
// three fonts above keep their own already-tuned weight sets.
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/libre-baskerville/400.css";
import "@fontsource/libre-baskerville/600.css";
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
