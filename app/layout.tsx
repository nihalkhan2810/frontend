import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nihal RAG Bot — Personal AI Assistant",
  description:
    "Ask questions about Nihal powered by a personalized RAG pipeline. Upload documents and get intelligent answers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
