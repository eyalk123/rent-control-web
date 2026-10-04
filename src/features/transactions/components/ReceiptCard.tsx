import { useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { CheckCircle2, FileText, Loader2, Paperclip, Receipt, Sparkles } from 'lucide-react';
import { useExtractReceipt } from '@/features/document-scan/queries';
import type { ReceiptExtraction } from '@/features/document-scan/types';
import { useSubscription } from '@/features/subscription/queries';
import { useToast } from '@/shared/components/ui/Toast';

export interface ScannedReceipt {
  file: File;
  logId: number;
  extraction: ReceiptExtraction;
}

interface Props {
  /** False when the form already has a property — the scan then does not look for one. */
  matchProperty: boolean;
  /** The image that will be saved as the expense's receipt. */
  attached: File | null;
  previewUrl: string | null;
  onScanned: (result: ScannedReceipt) => void;
  onAttach: (file: File | null) => void;
}

const SCAN_ACCEPT = 'image/*,application/pdf,.pdf';
const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

/**
 * The one place a new expense takes its receipt: scan it to fill the form, or just attach it.
 *
 * It replaced two controls — a scan link at the top and an image dropzone at the bottom — that
 * both asked for the same file, and a scan link that did not read as a button. The remaining
 * monthly allowance is shown up front, before an upload is spent on finding out, for the same
 * reason as the lease scan's quota strip.
 *
 * Only images are kept as the receipt; a scanned PDF fills the form but is not attached, and
 * the card says so.
 */
export function ReceiptCard({ matchProperty, attached, previewUrl, onScanned, onAttach }: Props) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { data: subscription } = useSubscription();
  const extract = useExtractReceipt();
  const scanInput = useRef<HTMLInputElement>(null);
  const attachInput = useRef<HTMLInputElement>(null);
  /** The file the form was filled from, while it is still the one on the card. */
  const [scanned, setScanned] = useState<{ name: string; pdf: boolean } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const allowance = subscription?.enforced ? subscription.monthly_receipt_scans : null;
  const remaining = allowance == null ? null : Math.max(0, allowance - subscription!.receipt_scans_used);
  const exhausted = remaining === 0;

  const scan = async (file: File) => {
    try {
      const { logId, extraction } = await extract.mutateAsync({ file, matchProperty });
      onScanned({ file, logId, extraction });
      setScanned({ name: file.name, pdf: isPdf(file) });
      if (!isPdf(file)) onAttach(file);
      showToast(t('transactions.receiptScan.done'), 'success');
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      showToast(
        status === 402
          ? t('transactions.receiptScan.limitReached', { limit: allowance ?? 0 })
          : status === 415
            ? t('transactions.receiptScan.unsupported')
            : t('transactions.receiptScan.failed'),
        'error',
      );
    }
  };

  const attach = (file: File) => {
    setScanned(null);
    onAttach(file);
  };

  const remove = () => {
    setScanned(null);
    onAttach(null);
  };

  // A dropped file is scanned when a scan is available, otherwise kept as the receipt.
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || extract.isPending) return;
    if (!exhausted && (file.type.startsWith('image/') || isPdf(file))) void scan(file);
    else if (file.type.startsWith('image/')) attach(file);
    else showToast(t('transactions.receiptScan.unsupported'), 'error');
  };

  const inputs = (
    <>
      <input
        ref={scanInput}
        type="file"
        accept={SCAN_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // so picking the same file again still fires
          if (file) void scan(file);
        }}
      />
      <input
        ref={attachInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) attach(file);
        }}
      />
    </>
  );

  const cardStyle = {
    border: `1px ${dragOver ? 'dashed' : 'solid'} ${dragOver ? 'var(--color-primary)' : 'var(--color-outline)'}`,
    background: dragOver ? 'var(--color-primary-container)' : 'var(--color-surface)',
  };
  const dropHandlers = {
    onDragOver: (e: DragEvent) => { e.preventDefault(); setDragOver(true); },
    onDragLeave: () => setDragOver(false),
    onDrop,
  };

  if (extract.isPending) {
    return (
      <div className="rounded-xl px-4 py-5 flex items-center justify-center gap-2.5" style={cardStyle} aria-live="polite">
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
        <span className="text-[13.5px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {t('transactions.receiptScan.reading')}
        </span>
        {inputs}
      </div>
    );
  }

  // ── A receipt is on the card ──────────────────────────────────────────────
  if (attached || scanned) {
    const name = attached?.name ?? scanned?.name ?? '';
    return (
      <div className="rounded-xl p-3 flex items-center gap-3" style={cardStyle} {...dropHandlers}>
        {attached && previewUrl ? (
          <img src={previewUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover border border-[var(--color-outline)] bg-white" />
        ) : (
          <div className="h-14 w-14 shrink-0 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-input-bg)' }}>
            <FileText size={22} style={{ color: 'var(--color-text-secondary)' }} aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <span className="truncate text-[13.5px] font-medium" style={{ color: 'var(--color-text-primary)' }} dir="auto">
            {name}
          </span>
          {scanned && (
            <span className="flex items-center gap-1 text-[12px] font-medium" style={{ color: 'var(--color-success)' }}>
              <CheckCircle2 size={13} aria-hidden="true" />
              {t('transactions.receiptScan.filled')}
            </span>
          )}
          {scanned?.pdf && !attached && (
            <span className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
              {t('transactions.receiptScan.pdfNotKept')}
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => attachInput.current?.click()}
            className="h-8 px-3 rounded-lg text-[12.5px] font-medium hover:bg-[var(--color-input-bg)]"
            style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}
          >
            {attached ? t('transactions.receiptScan.replace') : t('transactions.receiptScan.attachPhoto')}
          </button>
          <button
            type="button"
            onClick={remove}
            aria-label={t('transactions.receiptScan.removeReceipt')}
            className="h-8 px-3 rounded-lg text-[12.5px] font-medium hover:bg-[var(--color-input-bg)]"
            style={{ border: '1px solid var(--color-outline)', color: 'var(--color-error)' }}
          >
            {t('transactions.receiptScan.remove')}
          </button>
        </div>
        {inputs}
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={cardStyle} {...dropHandlers}>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary-container)' }}>
          <Receipt size={18} style={{ color: 'var(--color-on-primary-container)' }} aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('transactions.receiptScan.title')}
          </span>
          <span className="text-[12.5px]" style={{ color: 'var(--color-text-secondary)' }}>
            {t('transactions.receiptScan.subtitle')}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => scanInput.current?.click()}
          disabled={exhausted}
          className="h-9 px-4 rounded-[9px] flex items-center gap-1.5 text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        >
          <Sparkles size={15} aria-hidden="true" />
          {t('transactions.receiptScan.scan')}
        </button>
        <button
          type="button"
          onClick={() => attachInput.current?.click()}
          className="h-9 px-4 rounded-[9px] flex items-center gap-1.5 text-[13px] font-medium hover:bg-[var(--color-input-bg)]"
          style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}
        >
          <Paperclip size={15} aria-hidden="true" />
          {t('transactions.receiptScan.attach')}
        </button>
      </div>
      {remaining != null && (
        <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
          {exhausted
            ? t('transactions.receiptScan.used', { limit: allowance, date: nextMonthLabel(i18n.language) })
            : t('transactions.receiptScan.remaining', { count: remaining })}
          {exhausted && (
            <>
              {' '}
              <Link to="/plans" className="font-semibold hover:underline" style={{ color: 'var(--color-primary)' }}>
                {t('subscription.scanLimit.upgrade')}
              </Link>
            </>
          )}
        </p>
      )}
      {inputs}
    </div>
  );
}

/** The first of next month — the server resets the allowance on the same calendar boundary. */
function nextMonthLabel(language: string): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString(language, {
    month: 'long',
    day: 'numeric',
  });
}
