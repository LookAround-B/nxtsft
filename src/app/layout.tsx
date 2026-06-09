import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { BottomNav } from '@/components/site/BottomNav';
import { Toaster } from '@/components/ui/sonner';
import { Preloader } from '@/components/site/Preloader';
import { ListPropertyPopup } from '@/components/site/ListPropertyPopup';
import { CookieBanner } from '@/components/site/CookieBanner';

export const metadata: Metadata = {
  title: 'NxtSft.com — India\'s Smart Real Estate Platform',
  description: 'NxtSft.com is India\'s next-generation real estate ecosystem — verified listings, AI matching, zero brokerage, integrated CRM and ERP.',
  openGraph: {
    title: 'NxtSft.com — Find. Own. Live Smarter.',
    description: 'India\'s most comprehensive real estate platform — AI matched, zero brokerage, CRM+ERP in one.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    site: '@NxtSftCom',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Preloader />
        <AuthProvider>
          {children}
          <BottomNav />
          <ListPropertyPopup />
          <CookieBanner />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
