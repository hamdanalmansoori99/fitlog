import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
        />

        <title>Ordeal – AI Fitness Tracker</title>
        <meta name="description" content="Your personal AI-powered fitness companion — workouts, nutrition, coaching and progress tracking." />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme */}
        <meta name="theme-color" content="#00e676" />
        <meta name="msapplication-TileColor" content="#0f0f1a" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />

        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ordeal" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />

        {/* Standard favicon */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />

        {/* Open Graph */}
        <meta property="og:title" content="Ordeal – AI Fitness Tracker" />
        <meta property="og:description" content="AI-powered workouts, nutrition tracking, coaching and progress analytics." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/icons/icon-512x512.png" />

        {/* Twitter card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Ordeal – AI Fitness Tracker" />
        <meta name="twitter:description" content="AI-powered workouts, nutrition tracking, coaching and progress analytics." />
        <meta name="twitter:image" content="/icons/icon-512x512.png" />

        {/* react-native-web style reset */}
        <ScrollViewStyleReset />

        {/* Prevent body scroll jank on web */}
        <style>{`
          html, body, #root { height: 100%; background: #0f0f1a; }
          body { overflow: hidden; }
          #root { display: flex; flex: 1; }
        `}</style>

        {/* Service worker registration */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(function(reg) {
                  console.log('[SW] registered, scope:', reg.scope);
                })
                .catch(function(err) {
                  console.warn('[SW] registration failed:', err);
                });
            });
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
