import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'STEM26 - Năng Lượng Xanh | Green Energy Battle',
  description: 'Cuộc thi kiến thức năng lượng xanh dành cho học sinh tiểu học - STEM26',
  keywords: ['năng lượng xanh', 'STEM', 'học sinh', 'cuộc thi'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1a1a',
                color: '#f5f0e0',
                border: '1px solid rgba(255, 122, 0, 0.3)',
                fontFamily: 'Inter, sans-serif',
              },
              success: {
                iconTheme: { primary: '#22c55e', secondary: '#0a0a0a' },
              },
              error: {
                iconTheme: { primary: '#ff2a2a', secondary: '#0a0a0a' },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
