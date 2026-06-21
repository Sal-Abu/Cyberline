import type { APIRoute } from 'astro';
import siteConfig from '@/config/site.config';
import { buildFaviconSvg } from '@/lib/favicon';

// Pre-render at build time so the favicon is a plain static file in the
// output — no serverless function needed, no runtime overhead.
export const prerender = true;

export const GET: APIRoute = () => {
  const letter = siteConfig.name.charAt(0).toUpperCase();
  const color = siteConfig.branding.colors.themeColor;

  // The letter is outlined to a vector path (see src/lib/favicon), so the SVG
  // is self-contained and renders without the Outfit web font — search-engine
  // crawlers can now capture it for the SERP.
  const svg = buildFaviconSvg(letter, color);

  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
};
