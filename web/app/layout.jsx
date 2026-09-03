import './globals.css'

export const metadata = {
  title: 'SHIROWAHD',
  description: 'Upload media ke grup WhatsApp via bot — cepat, aman, tanpa ribet',
}

/* Mode dibaca SEBELUM paint pertama supaya tidak ada kedipan putih→gelap.
   Kalau belum pernah memilih, ikut preferensi sistem. */
const THEME_BOOT = `(function(){try{
var k='sw_theme',v=localStorage.getItem(k);
if(!v){v=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
document.documentElement.setAttribute('data-theme',v);
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`

export default function RootLayout({ children }) {
  return (
    <html lang="id" data-theme="light">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
