import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WiFiZone - Plateforme de Vente de Tickets Wi-Fi',
  description: 'Achetez et vendez des tickets Wi-Fi facilement via Mobile Money',
  keywords: 'wifi, tickets, mobile money, hotspot, mikrotik',
  authors: [{ name: 'WiFiZone Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'WiFiZone - Plateforme de Vente de Tickets Wi-Fi',
    description: 'Achetez et vendez des tickets Wi-Fi facilement via Mobile Money',
    type: 'website',
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WiFiZone - Plateforme de Vente de Tickets Wi-Fi',
    description: 'Achetez et vendez des tickets Wi-Fi facilement via Mobile Money',
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <div className="min-h-screen bg-gray-50">
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </div>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
} 