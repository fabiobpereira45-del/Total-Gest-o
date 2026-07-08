import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Total Gestão — Plataforma de Gestão de Membros",
  description:
    "Sistema completo de gestão de membros, credenciais, carteiras e certificados para organizações e igrejas.",
  keywords: ["gestão", "membros", "credenciais", "carteiras", "certificados"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
