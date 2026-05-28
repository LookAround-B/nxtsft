import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { BottomNav } from '@/components/site/BottomNav';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'NestIt — India\'s Smart Real Estate Platform',
  description: 'NestIt is India\'s next-generation real estate ecosystem — verified listings, AI matching, zero brokerage, integrated CRM and ERP.',
  openGraph: {
    title: 'NestIt — Find. Own. Live Smarter.',
    description: 'India\'s most comprehensive real estate platform — AI matched, zero brokerage, CRM+ERP in one.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    site: '@NestItIn',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <BottomNav />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
