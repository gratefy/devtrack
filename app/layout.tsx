import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import "./globals.css";

// Подключаем шрифт Unbounded с поддержкой кириллицы
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
    <html lang="ru">
      {/* Применяем класс шрифта к телу страницы */}
      <body className={`${unbounded.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
