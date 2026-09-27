import { useLanguage } from '@/hooks/useLanguage';
import { LegalLayout } from '../LegalLayout';
import { accountDeletionContent } from '../legalContent';

export function AccountDeletionPage() {
  const { language } = useLanguage();
  return <LegalLayout doc={accountDeletionContent[language]} />;
}
