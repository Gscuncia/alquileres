import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alquileres Anita",
  description: "Alquileres temporarios en la Costa Atlántica",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
