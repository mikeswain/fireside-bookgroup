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
        <footer className="flex items-baseline justify-end gap-2 p-2">
          &copy; Hiko Software 2026
          <span className="text-xs text-amber-700/50">{process.env.NEXT_PUBLIC_GIT_COMMIT}</span>
        </footer>
      </body>
    </html>
  );
}
