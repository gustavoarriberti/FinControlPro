import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinControl Pro | Gestão de Faturas, Cartões e Finanças Familiares",
  description:
    "Sistema inteligente de controle financeiro com leitura automática de faturas PDF via IA, OFX e CSV, projeção de parcelamentos e gestão familiar compartilhada.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
