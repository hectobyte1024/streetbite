import type { ReactNode } from 'react';
import { ServiceWorkerRegistration } from './ServiceWorkerRegistration';
import './globals.css';

export const metadata = {
  title: 'StreetBite Vendor',
  description: 'Offline-ready vendor GPS and StreetBite stand management.',
  manifest: '/manifest.webmanifest',
  themeColor: '#1d6b58',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
