import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Config Editor',
  description: 'Edit configuration files with a web interface',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}