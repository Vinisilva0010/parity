import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Backdrop } from "./_components/Backdrop";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Parity — check a tokenized stock before you buy it",
  description:
    "The same stock exists as several tokens on Solana. Parity tells you which one is real, whether you can get out, and who can freeze your balance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="min-h-dvh bg-paper text-ink">
        <Backdrop />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
