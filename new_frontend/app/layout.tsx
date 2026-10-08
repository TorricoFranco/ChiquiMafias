import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";

import { SocketProvider } from "@/context/SocketContext";
import QueryProvider from "@/context/QueryProvider";
import AuthProvider from "@/context/AuthProvider";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, 
};

export const metadata: Metadata = {
  title: "ESTADIO DIGITAL - Chiqui Mafias",
  description: "Plataforma interactiva de fútbol en vivo, chat y pronósticos con monedas virtuales",
  keywords: ["fútbol argentino", "en vivo", "pronósticos", "chat", "estadísticas", "liga profesional"],
  openGraph: {
    title: "ESTADIO DIGITAL - Chiqui Mafias",
    description: "Plataforma interactiva de fútbol en vivo, chat y pronósticos con monedas virtuales",
    siteName: "Estadio Digital",
    images: [
      {
        url: "/og-image.jpg", // Crea una imagen de 1200x630px y guárdala en tu carpeta public/
        width: 1200,
        height: 630,
        alt: "Estadio Digital Preview",
      },
    ],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ESTADIO DIGITAL",
    description: "Fútbol en vivo, chat y pronósticos con monedas virtuales.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${montserrat.variable} dark h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="h-screen flex flex-col bg-[#050505] text-[#e5e2e1] overflow-hidden font-sans">
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        
        <QueryProvider>
          <AuthProvider>
            <SocketProvider>
              {children}
              {modal}
              <Toaster
                position="bottom-right"
                richColors
                offset="70px"
              />
            </SocketProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}