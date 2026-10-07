import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "REQUIEM: a museum for endangered architecture", description: "A fictional caravan house, its history, its archive and its risks. All data is synthetic." };
export const viewport: Viewport = { themeColor: "#111111", width: "device-width", initialScale: 1 };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
