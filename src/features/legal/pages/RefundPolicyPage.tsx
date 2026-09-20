import { useLanguage } from '@/hooks/useLanguage';
import { LegalLayout } from '../LegalLayout';
import { refundContent } from '../legalContent';

export function RefundPolicyPage() {
  const { language } = useLanguage();
  return <LegalLayout doc={refundContent[language]} />;
}
