/**
 * Build-time OG (Open Graph) image generator.
 *
 * Produces 1200x630 SVG images matching the look of `public/og-default.svg`
 * (brand-color background, corner marks, wordmark, site name). The theme
 * already ships SVG as its default OG format — keeping per-page OGs as SVG
 * means zero new build dependencies, zero runtime work, and zero Lighthouse
 * impact (OG images are only fetched by social crawlers, never by the page).
 */
import siteConfig from '@/config/site.config';

const WIDTH = 1200;
const HEIGHT = 630;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Greedy word-wrap. Falls back to truncating with an ellipsis if the title
 * still doesn't fit in `maxLines`.
 */
function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  let consumed = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!line) {
      line = word;
      consumed = i + 1;
      continue;
    }
    if (line.length + 1 + word.length > maxCharsPerLine) {
      lines.push(line);
      if (lines.length === maxLines) break;
      line = word;
      consumed = i + 1;
    } else {
      line += ' ' + word;
      consumed = i + 1;
    }
  }
  if (line && lines.length < maxLines) {
    lines.push(line);
  }
  if (lines.length === maxLines && consumed < words.length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,3}$/, '…');
  }
  return lines;
}

export interface OgImageOptions {
  /** Title shown large in the centre. */
  title: string;
  /** Small uppercase label (e.g. "BLOG", "PROJECTS"). */
  kind?: string;
  /** Optional subtitle line under the title (truncated to one line). */
  subtitle?: string;
  /** Hex brand color. Defaults to `siteConfig.branding.colors.themeColor`. */
  brandColor?: string;
  /** Domain shown bottom-right. Defaults to the host of `siteConfig.url`. */
  domain?: string;
}

export function renderOgSvg({
  title,
  kind,
  subtitle,
  brandColor = siteConfig.branding.colors.themeColor,
  domain = safeHost(siteConfig.url),
}: OgImageOptions): string {
  const lines = wrapText(title, 22, 3);
  const lineHeight = 92;
  const blockHeight = lines.length * lineHeight;
  // Centre the title block vertically; shift up slightly when a subtitle is shown.
  const baseTitleY =
    (HEIGHT - blockHeight) / 2 + lineHeight * 0.78 + (subtitle ? -28 : 0);

  const titleEls = lines
    .map(
      (line, i) =>
        `<text x="80" y="${baseTitleY + i * lineHeight}" font-size="76" fill="#ffffff" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-weight="800" letter-spacing="-2.5">${escapeXml(line)}</text>`,
    )
    .join('\n  ');

  const subtitleEl = subtitle
    ? `<text x="80" y="${baseTitleY + blockHeight + 24}" font-size="28" fill="#ffffff" fill-opacity="0.82" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-weight="500">${escapeXml(truncate(subtitle, 70))}</text>`
    : '';

  const kindEl = kind
    ? `<text x="80" y="98" font-size="22" letter-spacing="6" fill="#ffffff" fill-opacity="0.78" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-weight="700">${escapeXml(kind.toUpperCase())}</text>`
    : '';

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="og-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.28"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${brandColor}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#og-shade)"/>

  ${kindEl}
  ${titleEls}
  ${subtitleEl}

  <line x1="80" y1="538" x2="1120" y2="538" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1"/>

  <text x="80" y="580" font-size="28" fill="#ffffff" fill-opacity="0.92" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-weight="700">${escapeXml(siteConfig.name)}</text>
  <text x="1120" y="580" font-size="22" fill="#ffffff" fill-opacity="0.7" text-anchor="end" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" letter-spacing="1">${escapeXml(domain)}</text>

  <path d="M 36 60 L 36 36 L 60 36" stroke="#ffffff" stroke-width="1.5" fill="none" stroke-opacity="0.45"/>
  <path d="M 1140 36 L 1164 36 L 1164 60" stroke="#ffffff" stroke-width="1.5" fill="none" stroke-opacity="0.45"/>
  <path d="M 36 570 L 36 594 L 60 594" stroke="#ffffff" stroke-width="1.5" fill="none" stroke-opacity="0.45"/>
  <path d="M 1140 594 L 1164 594 L 1164 570" stroke="#ffffff" stroke-width="1.5" fill="none" stroke-opacity="0.45"/>
</svg>`;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + '…';
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }
}

/** Path (relative to site root) for a blog post's dynamic OG image. */
export function getBlogOgPath(slug: string): string {
  return `/og/blog/${slug}.svg`;
}

/** Path (relative to site root) for a project's dynamic OG image. */
export function getProjectOgPath(slug: string): string {
  return `/og/projects/${slug}.svg`;
}

/** Path for a generic dynamic OG image (used for tag/page archives). */
export function getGenericOgPath(slug: string): string {
  return `/og/${slug}.svg`;
}
