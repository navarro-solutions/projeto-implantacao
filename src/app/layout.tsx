import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Implantações — Custo e Economia",
  description: "Painel de custo e economia por implantação (portaria remota, CFTV, controle de acesso e interfonia).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
