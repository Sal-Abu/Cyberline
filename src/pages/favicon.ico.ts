import type { APIRoute } from 'astro';
import siteConfig from '@/config/site.config';
import { renderFaviconIco } from '@/lib/favicon';

// Pre-rendered to a static file. Provides the raster fallback crawlers and
// legacy browsers look for at /favicon.ico.
export const prerender = true;

export const GET: APIRoute = async () => {
  const letter = siteConfig.name.charAt(0).toUpperCase();
  const color = siteConfig.branding.colors.themeColor;

  const ico = await renderFaviconIco(letter, color);

  return new Response(new Uint8Array(ico), {
    headers: { 'Content-Type': 'image/x-icon' },
  });
};
