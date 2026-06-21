import type { APIRoute } from 'astro';
import siteConfig from '@/config/site.config';
import { renderFaviconPng } from '@/lib/favicon';

export const prerender = true;

export const GET: APIRoute = async () => {
  const letter = siteConfig.name.charAt(0).toUpperCase();
  const color = siteConfig.branding.colors.themeColor;

  const png = await renderFaviconPng(letter, color, 512);

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
