import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/providers/QueryProvider';
import Script from 'next/script';

export const metadata: Metadata = {
  title: {
    default: 'Accezz - Premium Event Ticketing Platform | Find, Create & Sell Tickets Online',
    template: '%s | Accezz'
  },
  description: 'Accezz is Nigeria\'s leading event ticketing platform. Create, manage, and sell tickets for concerts, conferences, workshops, and events. Secure payment processing, QR code validation, and real-time analytics. Start selling tickets in minutes!',
  keywords: [
    'event ticketing platform',
    'event management',
    'online ticket sales Nigeria',
    'concert tickets Nigeria',
    'conference tickets Nigeria',
    'workshop tickets Nigeria',
    'event organizers Nigeria',
    'ticket validation',
    'QR code tickets Nigeria',
    'secure ticket payments',
    'event registration platform',
    'event ticketing solutions',
    'event booking system',
    'sell event tickets online',
    'ticket sales platform Nigeria',
    'real-time analytics for events'
  ],
  authors: [{ name: 'Accezz Team' }],
  creator: 'Accezz',
  publisher: 'Accezz',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://accezzlive.com/'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://accezzlive.com/',
    siteName: 'Accezz',
    title: 'Accezz - Premium Event Ticketing Platform | Create & Sell Tickets Online',
    description: 'Nigeria\'s leading event ticketing platform. Create, manage, and sell tickets for concerts, conferences, workshops, and events. Secure payment processing, QR code validation, and real-time analytics.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Accezz - Event Ticketing Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Accezz - Premium Event Ticketing Platform',
    description: 'Nigeria\'s leading event ticketing platform. Create, manage, and sell tickets for concerts, conferences, workshops, and events.',
    images: ['/twitter-image.jpg'],
    creator: '@accezz',
    site: '@accezz',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  manifest: '/manifest.json',
  icons: [
    { rel: 'apple-touch-icon', url: '/icons/icon-192x192.png' },
    { rel: 'icon', url: '/favicon.ico' },
    { rel: 'icon', url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    { rel: 'icon', url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    { rel: 'apple-touch-icon', url: '/apple-touch-icon.png', sizes: '180x180' },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Accezz',
  },
  other: {
    'theme-color': '#f54502',
    'msapplication-TileColor': '#f54502',
    'msapplication-config': '/browserconfig.xml',
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-P5Z79R99');
          `}
        </Script>
        {/* End Google Tag Manager */}
        <link rel="icon" href="/favicon.png" type="image/png" sizes="300x300" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="250x250" />
        <link rel="apple-touch-icon" href="/favicon.png" sizes="250x250" />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe 
            src="https://www.googletagmanager.com/ns.html?id=GTM-P5Z79R99"
            height="0" 
            width="0" 
            style={{display:'none',visibility:'hidden'}}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-5YD02NNWEC"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5YD02NNWEC');
          `}
        </Script>
        
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}