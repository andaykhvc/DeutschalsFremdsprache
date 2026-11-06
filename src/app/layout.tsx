import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const newsreader = localFont({
  src: "../../public/fonts/newsreader.ttf",
  variable: "--font-journal",
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "Alltagsnotizen – Mein Leben. Auf Deutsch.",
    template: "%s · Alltagsnotizen",
  },
  description:
    "Ein offenes Tagebuch auf Deutsch. Kleine Geschichten aus dem Alltag und ein gemeinsamer Lernweg.",
  robots: { index: true, follow: true },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      data-scroll-behavior="smooth"
      className={newsreader.variable}
    >
      <body>{children}</body>
    </html>
  );
}
