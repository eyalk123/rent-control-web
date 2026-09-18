import { useEffect, useState } from 'react';

/**
 * A country's flag, **derived from its ISO code** rather than shipped as an asset.
 *
 * An alpha-2 code maps one-to-one onto a pair of Unicode regional indicator symbols, and
 * every platform that has flag glyphs draws that pair as the flag. So the whole table of
 * ~250 flags costs zero bytes: no sprite sheet, no icon package, no per-country request,
 * nothing to keep in step with the country table. `'ES'` is two `String.fromCodePoint`
 * calls away from 🇪🇸.
 *
 * **Windows has no flag glyphs.** Segoe UI Emoji ships the regional indicators as lettered
 * boxes and deliberately does not compose them, so Chrome and Edge on Windows render `ES`
 * where every other platform renders a flag — a rendering decision this code cannot
 * override at any price short of shipping the images. Rather than let that look broken, the
 * flag is feature-detected once and the fallback is a deliberate two-letter badge.
 *
 * If real flags on Windows are ever worth the weight, the swap is local to this file:
 * drop ~250 SVGs in `public/flags/` and return `<img src={`/flags/${code}.svg`}>`. That
 * still bundles nothing — the browser fetches the single flag actually rendered — and it
 * costs one request plus the files sitting in the deploy artefact.
 */

/** The regional-indicator pair for an alpha-2 code. Empty for anything that is not one. */
export function flagEmoji(countryCode: string | null | undefined): string {
  const code = (countryCode ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/**
 * Whether this browser draws regional indicator pairs as flags.
 *
 * Painted rather than measured. The obvious test — is the pair narrower than two single
 * indicators? — is wrong on Apple platforms, where a lone indicator is a small lettered box
 * and the composed flag is a full-width emoji, so the pair comes out *wider* and the test
 * reports the opposite of the truth. Colour is unambiguous: 🇯🇵 is a red disc on white, and
 * a pair of lettered boxes has no red in it at all.
 *
 * Canvas reads can be blocked or noised by anti-fingerprinting (Firefox's
 * `resistFingerprinting`, Brave). Those throw or return a blank field, which reads as "no
 * flags" and lands on the badge — the safe direction, and the reason every step is guarded.
 */
function detectFlagSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    ctx.textBaseline = 'top';
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText('\u{1F1EF}\u{1F1F5}', 0, 0); // 🇯🇵
    const { data } = ctx.getImageData(0, 0, 24, 24);
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a > 0 && r > 100 && r - g > 40 && r - b > 40) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Resolved once per page, not once per render — the answer cannot change mid-session. */
let cached: boolean | null = null;

function flagsSupported(): boolean {
  if (cached === null) cached = detectFlagSupport();
  return cached;
}

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2. Anything else renders nothing. */
  code: string | null | undefined;
  /** Font size in px for the glyph; the badge scales off it. */
  size?: number;
  /**
   * What to draw where the platform has no flag glyphs.
   *
   * `'badge'` is right where the flag is the only visual and its absence would leave a
   * gap. `'none'` is right where the caller **already shows the ISO code beside it** — the
   * country picker does, in its own column — because a badge there renders the code twice
   * on the same row ("US  United States  US").
   */
  fallback?: 'badge' | 'none';
  className?: string;
}

/**
 * The flag for a country, or a two-letter badge where the platform has no flag glyphs.
 *
 * Decorative in both forms — `aria-hidden`, because every place this is used names the
 * country in text beside it, and a screen reader announcing "flag of Spain, Spain" is worse
 * than one that says "Spain".
 */
export function CountryFlag({ code, size = 18, fallback = 'badge', className }: CountryFlagProps) {
  // Detection touches `document`, so it is deferred out of render and into an effect: this
  // keeps the component safe under SSR and under the test renderer, both of which would
  // otherwise run canvas code at import time.
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(flagsSupported()), []);

  const emoji = flagEmoji(code);
  if (!emoji) return null;

  if (supported) {
    return (
      <span
        aria-hidden="true"
        className={className}
        // Line height pinned so the glyph does not push the row it sits in taller than its
        // neighbours — emoji metrics are generous and differ per platform.
        style={{ fontSize: size, lineHeight: 1 }}
      >
        {emoji}
      </span>
    );
  }

  if (fallback === 'none') return null;

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-[3px] font-semibold ${className ?? ''}`}
      style={{
        fontSize: Math.round(size * 0.55),
        lineHeight: 1,
        letterSpacing: '0.3px',
        padding: `${Math.round(size * 0.16)}px ${Math.round(size * 0.22)}px`,
        background: 'var(--color-primary-container)',
        color: 'var(--color-primary)',
      }}
    >
      {(code ?? '').toUpperCase()}
    </span>
  );
}
