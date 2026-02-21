import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Puhoi Fireside Bookgroup",
  description: "Meeting calendar for the Puhoi Fireside Bookgroup",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="text-amber-950 antialiased">
        {children}
        <footer className="flex justify-end p-2">&copy; Hiko Software 2026</footer>
      </body>
    </html>
  );
}
