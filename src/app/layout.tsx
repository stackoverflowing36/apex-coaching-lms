import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed, Inter, Outfit } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const barlow = Barlow({
  subsets: ['latin'],
  variable: '--font-barlow',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  variable: '--font-barlow-condensed',
  display: 'swap',
  weight: ['600', '700'],
});

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
  title: 'EduFlow — Coaching & Academic Management Portal',
  description:
    'EduFlow LMS makes it easy to manage classes, live and recorded lectures, assignments, digital grading, and assessments.',
  keywords: ['EduFlow', 'LMS', 'Coaching Institute', 'IIT-JEE', 'NEET', 'Lectures', 'Assignments'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} ${inter.variable} ${outfit.variable}`}
    >
      <body className="min-h-screen font-sans bg-[#fbfbfa] text-[#111111]">
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
