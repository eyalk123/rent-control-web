import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { TOURS, validateRegistry } from '../src/features/onboarding/registry';
import { callbackKey, seedKey, tourStepKey, type TourDefinition } from '../src/features/onboarding/types';

/**
 * The registry's own invariants, checked for real.
 *
 * `validateRegistry` was exported and called by nothing, so the step/seed budget was a
 * comment rather than a rule. These run in Node — none of them touch `page`, so no
 * browser is launched — which is why they live here rather than in a unit-test layer the
 * web app does not otherwise have.
 *
 * The i18n checks pin the failure mode that is easiest to introduce and hardest to spot:
 * a step id that does not match its copy renders the raw key ("onboarding.tours.reports
 * .two.title") into the overlay, which nothing else here would catch.
 */

type Locale = Record<string, unknown>;

function loadLocale(lang: 'en' | 'he'): Locale {
  const path = fileURLToPath(new URL(`../src/core/i18n/locales/${lang}.json`, import.meta.url));
  return JSON.parse(readFileSync(path, 'utf8')) as Locale;
}

const LOCALES = { en: loadLocale('en'), he: loadLocale('he') } as const;

/** Resolves a dotted i18n key, and only accepts a non-empty string at the end of it. */
function hasCopy(locale: Locale, key: string): boolean {
  const value = key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Locale)[part] : undefined),
    locale,
  );
  return typeof value === 'string' && value.trim().length > 0;
}

const tours = Object.values(TOURS) as TourDefinition[];

test.describe('onboarding registry', () => {
  // Budget, plus seeds that open a tour this platform does not define — web has no `chat`
  // tour and no WhatsApp template editor, so a dangling `opens` is a live risk here.
  test('the registry satisfies its own structural rules', () => {
    expect(validateRegistry()).toEqual([]);
  });

  test('every step has a title and body in both languages', () => {
    const missing: string[] = [];
    for (const tour of tours) {
      for (const step of tour.steps) {
        for (const part of ['title', 'body'] as const) {
          const key = tourStepKey(tour.id, step.id, part);
          for (const lang of ['en', 'he'] as const) {
            if (!hasCopy(LOCALES[lang], key)) missing.push(`${lang}: ${key}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('every seed and every callback has copy in both languages', () => {
    const missing: string[] = [];
    for (const tour of tours) {
      for (const step of tour.steps) {
        if (!step.seed) continue;
        for (const lang of ['en', 'he'] as const) {
          if (!hasCopy(LOCALES[lang], seedKey(step.seed.id))) {
            missing.push(`${lang}: ${seedKey(step.seed.id)}`);
          }
        }
      }
      // A tour reached from a seed opens on its callback line ("You saw this mentioned —
      // here it is"), so `arrivesFrom` without copy is a blank first impression.
      if (tour.arrivesFrom) {
        for (const lang of ['en', 'he'] as const) {
          if (!hasCopy(LOCALES[lang], callbackKey(tour.arrivesFrom))) {
            missing.push(`${lang}: ${callbackKey(tour.arrivesFrom)}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('the ui strings the overlay and the settings control need exist', () => {
    const missing: string[] = [];
    const keys = [
      'skip', 'next', 'back', 'done', 'stepOf',
      'sectionTitle', 'replayTitle', 'replayBody', 'replayAction', 'replayDone', 'disable',
    ];
    for (const key of keys) {
      for (const lang of ['en', 'he'] as const) {
        if (!hasCopy(LOCALES[lang], `onboarding.ui.${key}`)) {
          missing.push(`${lang}: onboarding.ui.${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
