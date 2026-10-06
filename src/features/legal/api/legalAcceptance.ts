import apiClient from '@/core/api/client';
import { USE_MOCK_API } from '@/core/api/mock';
import i18n from '@/core/i18n';
import { PRIVACY_VERSION, TERMS_VERSION } from '../legalContent';
import { AI_CONSENT_VERSION } from '../aiConsent';

export type LegalDocument = 'terms' | 'privacy' | 'ai_processing';

export interface LegalAcceptance {
  document: LegalDocument;
  version: string;
  locale: string;
  acceptedAt: string;
}

export interface LegalStatus {
  terms: LegalAcceptance | null;
  privacy: LegalAcceptance | null;
  /** Permission to send data to Anthropic — asked on first AI use, not at the gate. */
  ai_processing: LegalAcceptance | null;
}

interface LegalAcceptanceDto {
  document: LegalDocument;
  version: string;
  locale: string;
  accepted_at: string;
}

interface LegalStatusDto {
  terms: LegalAcceptanceDto | null;
  privacy: LegalAcceptanceDto | null;
  // Absent from a backend older than the ai_processing migration.
  ai_processing?: LegalAcceptanceDto | null;
}

function fromDto(dto: LegalStatusDto): LegalStatus {
  const one = (d: LegalAcceptanceDto | null): LegalAcceptance | null =>
    d
      ? { document: d.document, version: d.version, locale: d.locale, acceptedAt: d.accepted_at }
      : null;
  return {
    terms: one(dto.terms),
    privacy: one(dto.privacy),
    ai_processing: one(dto.ai_processing ?? null),
  };
}

/** The version this build displays for each document — what the gate compares against. */
export const REQUIRED_VERSIONS: Record<LegalDocument, string> = {
  terms: TERMS_VERSION,
  privacy: PRIVACY_VERSION,
  ai_processing: AI_CONSENT_VERSION,
};

/**
 * Which documents this user still has to accept.
 *
 * Compared against the versions *this build* bundles, never against the server's
 * `required_*_version` — see the note on TERMS_VERSION in legalContent.ts.
 */
export function outstandingDocuments(status: LegalStatus): LegalDocument[] {
  return (['terms', 'privacy'] as const).filter(
    (doc) => status[doc]?.version !== REQUIRED_VERSIONS[doc],
  );
}

/**
 * Mock mode has no server. Answering "already accepted" keeps the consent gate out of the
 * way of every unrelated e2e spec and of offline UI work; `e2e/legal-gate.spec.ts` arms
 * the other answer through this override.
 */
export const LEGAL_MOCK_OVERRIDE_KEY = 'legal.mockAccepted';
/** Same idea for AI consent: 'off' shows the prompt on the next scan or assistant message. */
export const AI_CONSENT_MOCK_OVERRIDE_KEY = 'legal.mockAiAccepted';

function readOverride(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'off';
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). Not a reason to fail.
    return true;
  }
}

function mockStatus(): LegalStatus {
  if (!readOverride(LEGAL_MOCK_OVERRIDE_KEY)) return { terms: null, privacy: null, ai_processing: null };
  const now = new Date().toISOString();
  return {
    terms: { document: 'terms', version: TERMS_VERSION, locale: 'en', acceptedAt: now },
    privacy: { document: 'privacy', version: PRIVACY_VERSION, locale: 'en', acceptedAt: now },
    ai_processing: readOverride(AI_CONSENT_MOCK_OVERRIDE_KEY)
      ? { document: 'ai_processing', version: AI_CONSENT_VERSION, locale: 'en', acceptedAt: now }
      : null,
  };
}

export async function getLegalStatus(): Promise<LegalStatus> {
  if (USE_MOCK_API) return mockStatus();
  const response = await apiClient.get<LegalStatusDto>('/users/me/legal');
  return fromDto(response.data);
}

/**
 * Records acceptance of the given documents.
 *
 * `locale` is the language the documents were actually rendered in, not a preference: the
 * two texts differ, and which one was on screen is half of what makes the record mean
 * anything.
 */
export async function postLegalAcceptance(
  documents: LegalDocument[],
): Promise<LegalStatus | null> {
  if (USE_MOCK_API) {
    try {
      for (const document of documents) {
        localStorage.setItem(
          document === 'ai_processing' ? AI_CONSENT_MOCK_OVERRIDE_KEY : LEGAL_MOCK_OVERRIDE_KEY,
          'on',
        );
      }
    } catch {
      // See above.
    }
    return mockStatus();
  }

  const locale = i18n.language?.startsWith('he') ? 'he' : 'en';
  const response = await apiClient.post<LegalStatusDto>('/users/me/legal', {
    platform: 'web',
    acceptances: documents.map((document) => ({
      document,
      version: REQUIRED_VERSIONS[document],
      locale,
    })),
  });
  return fromDto(response.data);
}
