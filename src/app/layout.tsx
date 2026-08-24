import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['700', '800'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Apex Institute — Coaching Management Portal',
  description:
    'Apex Institute LMS makes it easy to manage classes, live and recorded lectures, assignments, grading, and assessments.',
  keywords: ['LMS', 'Coaching Institute', 'IIT-JEE', 'NEET', 'Lectures', 'Assignments'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-screen font-sans">
        {children}

        {/* Global toast notifications — floating card style */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '1rem',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
            },
          }}
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
