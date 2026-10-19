import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-unbounded",
});

export const metadata: Metadata = {
  title: "DevTrack",
  description: "Платформа для отслеживания прогресса",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${unbounded.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
