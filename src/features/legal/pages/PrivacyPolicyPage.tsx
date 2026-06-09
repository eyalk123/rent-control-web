import { useLanguage } from '@/hooks/useLanguage';
import { LegalLayout } from '../LegalLayout';
import { privacyContent } from '../legalContent';

export function PrivacyPolicyPage() {
  const { language } = useLanguage();
  return <LegalLayout doc={privacyContent[language]} />;
}
