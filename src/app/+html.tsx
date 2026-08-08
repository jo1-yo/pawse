import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

import { BRAND } from '@/lib/config';

/**
 * Root HTML document for the web build. This component only ever runs in
 * Node.js during `expo export --platform web` — it wraps every static route,
 * so anything here lands in the `<head>` of index.html, settings.html, etc.
 *
 * The canonical origin comes from `EXPO_PUBLIC_SITE_URL` at build time so the
 * absolute og:image/canonical URLs follow whatever domain we deploy to.
 */
const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://paws3.com').replace(/\/$/, '');

const TITLE = `${BRAND.name} — ${BRAND.tagline}`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>{TITLE}</title>
        <meta name="description" content={BRAND.blurb} />
        <link rel="canonical" href={SITE_URL} />
        <meta name="theme-color" content="#f5f5f7" />
        <meta name="apple-mobile-web-app-title" content={BRAND.name} />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BRAND.name} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={BRAND.blurb} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={`${SITE_URL}/og.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={BRAND.blurb} />
        <meta name="twitter:image" content={`${SITE_URL}/og.png`} />

        {/* Disables body scrolling on web so ScrollViews behave like native. */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
