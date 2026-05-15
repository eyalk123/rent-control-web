import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { deleteMyAccount } from '../api/account';
import { useAppAuth } from '@/core/auth/AuthContext';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { useToast } from '@/shared/components/ui/Toast';

export function DeleteAccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deleteFirebaseAccount } = useAppAuth();
  const { showToast } = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = confirmText === 'DELETE';

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      await deleteMyAccount();
      await deleteFirebaseAccount();
      navigate('/sign-in', { replace: true });
    } catch {
      showToast(t('error.deleteFailed'), 'error');
      setIsDeleting(false);
    }
  };

  return (
    <PageContainer>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">
        <ChevronLeft size={16} />{t('common.back')}
      </button>

      <div className="max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-error)]/10">
            <AlertTriangle size={22} className="text-[var(--color-error)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-error)]">{t('settings.deleteAccount', 'Delete Account')}</h1>
        </div>

        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-error)]/30 p-5 space-y-4">
          <p className="text-sm text-[var(--color-text-primary)]">
            {t('deleteAccount.warning', 'This action is permanent and cannot be undone. All your properties, renters, transactions, and data will be deleted.')}
          </p>

          <div>
            <p className="mb-2 text-sm text-[var(--color-text-secondary)]">
              {t('deleteAccount.typeConfirm', 'Type DELETE to confirm:')}
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-placeholder)] outline-none focus:border-[var(--color-error)]"
            />
          </div>

          <button
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
            className="w-full rounded-xl bg-[var(--color-error)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            {isDeleting ? '...' : t('deleteAccount.confirm', 'Delete My Account')}
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
