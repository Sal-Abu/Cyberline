import { describe, it, expect } from 'vitest';
import {
  t,
  localizedPath,
  resolveLocale,
  isValidLocale,
  getLocaleName,
  getLocaleFromPath,
  stripLocaleFromPath,
  swapLocaleInPath,
} from '../i18n';

describe('i18n t() helper', () => {
  it('returns a translation for a valid dotted key', () => {
    expect(t('common.readMore', 'en')).toBe('Read more');
  });

  it('returns the Dutch translation when locale is nl', () => {
    expect(t('common.readMore', 'nl')).toBe('Lees meer');
  });

  it('falls back to the default-locale string when the locale has no entry', () => {
    // 'de' has no dictionary loaded yet — should fall back to English
    expect(t('common.readMore', 'de')).toBe('Read more');
  });

  it('returns the key itself when no translation exists in any dictionary', () => {
    expect(t('some.missing.key', 'en')).toBe('some.missing.key');
  });

  it('interpolates {placeholder} variables', () => {
    expect(t('blog.readingTime', 'en', { minutes: 5 })).toBe('5 min read');
    expect(t('blog.readingTime', 'nl', { minutes: 5 })).toBe('5 min leestijd');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(t('blog.readingTime', 'en', {})).toBe('{minutes} min read');
  });
});

describe('i18n localizedPath()', () => {
  it('returns the path unchanged when i18n is disabled (single locale)', () => {
    // With default config (locales: ['en']), i18n is effectively off
    expect(localizedPath('/about')).toBe('/about');
    expect(localizedPath('/')).toBe('/');
    expect(localizedPath('blog/hello')).toBe('/blog/hello');
  });
});

describe('i18n locale helpers', () => {
  it('resolves an unknown locale to the default', () => {
    expect(resolveLocale('xx')).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
  });

  it('validates a configured locale', () => {
    expect(isValidLocale('en')).toBe(true);
    expect(isValidLocale('xx')).toBe(false);
    expect(isValidLocale(undefined)).toBe(false);
  });

  it('returns the display name when configured, otherwise the code', () => {
    expect(getLocaleName('en')).toBe('English');
    // 'nl' is in localeNames even though it's not in the active locales list
    expect(getLocaleName('nl')).toBe('Nederlands');
    expect(getLocaleName('xx')).toBe('xx');
  });
});

describe('i18n getLocaleFromPath()', () => {
  it('returns the default locale for the root path', () => {
    expect(getLocaleFromPath('/')).toBe('en');
  });

  it('returns the default locale when no recognized prefix is present', () => {
    expect(getLocaleFromPath('/about')).toBe('en');
    expect(getLocaleFromPath('/blog/hello-world')).toBe('en');
  });

  it('returns the default locale when the first segment is not a configured locale', () => {
    // Default config only has 'en' active — 'nl' is not recognized
    expect(getLocaleFromPath('/nl/about')).toBe('en');
    expect(getLocaleFromPath('/zh-cn/blog')).toBe('en');
  });

  it('normalizes paths without a leading slash', () => {
    expect(getLocaleFromPath('about')).toBe('en');
  });
});

describe('i18n stripLocaleFromPath()', () => {
  it('leaves a path unchanged when the first segment is not a configured locale', () => {
    expect(stripLocaleFromPath('/about')).toBe('/about');
    expect(stripLocaleFromPath('/nl/about')).toBe('/nl/about');
  });

  it('returns "/" for the root path', () => {
    expect(stripLocaleFromPath('/')).toBe('/');
  });
});

describe('i18n swapLocaleInPath()', () => {
  it('returns the path unchanged when targeting the default locale (no prefix added)', () => {
    expect(swapLocaleInPath('/about', 'en')).toBe('/about');
  });

  it('returns the same path when i18n is disabled, regardless of target', () => {
    // With default config (single locale), localizedPath is a no-op
    expect(swapLocaleInPath('/about', 'nl')).toBe('/about');
  });
});
