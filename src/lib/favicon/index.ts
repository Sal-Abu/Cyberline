/**
 * Favicon generation.
 *
 * The brand mark is the first letter of the site name on a rounded square.
 * Historically it was emitted as an SVG `<text>` element relying on the
 * "Outfit" web font. Search-engine crawlers (and other renderers) do not load
 * external fonts, so the letter never drew and Google fell back to its default
 * globe icon in the SERP.
 *
 * This module instead outlines the letter to a real vector `<path>` at build
 * time using an embedded Outfit subset, so the SVG is fully self-contained
 * (no font needed to render it). The same outlined SVG is rasterised with
 * `sharp` to produce PNG and ICO fallbacks for crawlers, Safari, social
 * previews and legacy browsers. Every asset derives from one source render, so
 * the logo is identical everywhere.
 */
// fontkit ships no type declarations; declare the minimal surface we use.
// @ts-expect-error - no types published for fontkit
import * as fontkit from 'fontkit';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { OUTFIT_700_SUBSET_BASE64 } from './font-data';

interface Glyph {
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  path: { toSVG(): string };
}
interface Font {
  hasGlyphForCodePoint(codePoint: number): boolean;
  glyphForCodePoint(codePoint: number): Glyph;
}

// Parse the embedded font once and reuse across routes.
let cachedFont: Font | null = null;
function getFont(): Font {
  if (!cachedFont) {
    const buf = Buffer.from(OUTFIT_700_SUBSET_BASE64, 'base64');
    cachedFont = (fontkit as { create(buf: Buffer): Font }).create(buf);
  }
  return cachedFont;
}

/** Fraction of the icon the glyph's bounding box should occupy. */
const GLYPH_FILL = 0.6;
/** Corner rounding as a fraction of the icon size. */
const CORNER_RADIUS = 0.1667;

/**
 * Build a self-contained favicon SVG: a rounded square filled with `bgColor`
 * and the outlined `letter` in `fgColor`, centred. Falls back to an empty
 * square if the embedded subset has no glyph for the character.
 */
export function buildFaviconSvg(
  letter: string,
  bgColor: string,
  fgColor = '#ffffff',
  size = 48
): string {
  const rx = (size * CORNER_RADIUS).toFixed(2);
  const rect = `<rect width="${size}" height="${size}" rx="${rx}" fill="${bgColor}"/>`;

  const font = getFont();
  const codePoint = letter.codePointAt(0);
  if (codePoint === undefined || !font.hasGlyphForCodePoint(codePoint)) {
    console.warn(
      `[favicon] No embedded glyph for "${letter}". Emitting a plain square. ` +
        `The embedded Outfit subset covers A-Z and 0-9; regenerate it if your ` +
        `site name starts with a different character.`
    );
    return wrapSvg(size, rect);
  }

  const glyph = font.glyphForCodePoint(codePoint);
  const { minX, minY, maxX, maxY } = glyph.bbox;
  const bw = maxX - minX;
  const bh = maxY - minY;

  const target = size * GLYPH_FILL;
  const scale = target / Math.max(bw, bh);
  const scaledW = bw * scale;
  const scaledH = bh * scale;

  // Map font units (y-up, baseline at 0) into the SVG viewBox (y-down),
  // centring the glyph's bounding box within the square.
  const translateX = (size - scaledW) / 2 - minX * scale;
  const translateY = maxY * scale + (size - scaledH) / 2;
  const matrix = `matrix(${scale} 0 0 ${-scale} ${translateX} ${translateY})`;

  const path = `<path transform="${matrix}" d="${glyph.path.toSVG()}" fill="${fgColor}"/>`;
  return wrapSvg(size, rect + path);
}

function wrapSvg(size: number, inner: string): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" ` +
    `xmlns="http://www.w3.org/2000/svg">${inner}</svg>`
  );
}

/** Rasterise the favicon SVG to a square PNG buffer of the given pixel size. */
export async function renderFaviconPng(
  letter: string,
  bgColor: string,
  size: number,
  fgColor = '#ffffff'
): Promise<Buffer> {
  const svg = buildFaviconSvg(letter, bgColor, fgColor, size);
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

/** Build a multi-size favicon.ico (16/32/48) from the outlined SVG. */
export async function renderFaviconIco(
  letter: string,
  bgColor: string,
  fgColor = '#ffffff'
): Promise<Buffer> {
  const pngs = await Promise.all(
    [16, 32, 48].map((s) => renderFaviconPng(letter, bgColor, s, fgColor))
  );
  return pngToIco(pngs);
}
