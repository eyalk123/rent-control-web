import { useLanguage } from '@/hooks/useLanguage';
import { LegalLayout } from '../LegalLayout';
import { accessibilityContent } from '../legalContent';

export function AccessibilityStatementPage() {
  const { language } = useLanguage();
  return <LegalLayout doc={accessibilityContent[language]} />;
}
