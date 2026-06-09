import { useLanguage } from '@/hooks/useLanguage';
import { LegalLayout } from '../LegalLayout';
import { termsContent } from '../legalContent';

export function TermsOfServicePage() {
  const { language } = useLanguage();
  return <LegalLayout doc={termsContent[language]} />;
}
