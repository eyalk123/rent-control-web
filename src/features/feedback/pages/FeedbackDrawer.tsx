import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Drawer } from '@/shared/components/ui/Drawer';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { useToast } from '@/shared/components/ui/Toast';
import { useAppAuth } from '@/core/auth/AuthContext';
import type { EncodedImage } from '@/shared/utils/imageToBase64';
import { ScreenshotPicker } from '../components/ScreenshotPicker';
import { useSubmitFeedback } from '../queries';
import {
  FEEDBACK_TYPES,
  feedbackFormSchema,
  MAX_MESSAGE_LENGTH,
  type FeedbackFormValues,
  type FeedbackType,
} from '../validation/feedbackValidation';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FeedbackDrawer({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAppAuth();
  const submitMutation = useSubmitFeedback();
  const [screenshots, setScreenshots] = useState<EncodedImage[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema) as never,
    defaultValues: { type: 'bug', message: '' },
  });

  const type = watch('type');
  const message = watch('message') ?? '';

  const close = () => {
    reset({ type: 'bug', message: '' });
    setScreenshots([]);
    onClose();
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      await submitMutation.mutateAsync({
        type: data.type,
        message: data.message,
        screenshots,
      });
      showToast(t('feedback.submitSuccess'), 'success');
      close();
    } catch (err) {
      if (import.meta.env.DEV) console.error('[FeedbackDrawer] submit failed:', err);
      // The API answers 502 when it could not hand the message to the mail
      // provider. That is deliberately not swallowed: nobody is watching a
      // database table, so the only person who can retry is the sender.
      showToast(t('feedback.submitFailed'), 'error');
    }
  });

  const typeOptions = FEEDBACK_TYPES.map((value) => ({
    value,
    label: t(`feedback.type_${value}`),
  }));

  const footer = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={close}
        className="h-10 px-4 rounded-[9px] text-[13px] font-medium ms-auto"
        style={{
          border: '1px solid var(--color-outline)',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-surface)',
        }}
      >
        {t('common.cancel')}
      </button>
      <button
        type="submit"
        form="feedback-form"
        disabled={isSubmitting}
        className="h-10 px-5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--color-primary)' }}
      >
        {isSubmitting ? '...' : t('feedback.submit')}
      </button>
    </div>
  );

  return (
    <Drawer open={open} onClose={close} title={t('feedback.title')} width={560} footer={footer}>
      <form id="feedback-form" onSubmit={onSubmit} className="space-y-4">
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {t('feedback.typeLabel')}
            </label>
            <SegToggle<FeedbackType>
              options={typeOptions}
              value={type}
              onChange={(next) => setValue('type', next, { shouldValidate: true })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="feedback-message"
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('feedback.messageLabel')}
            </label>
            <textarea
              id="feedback-message"
              rows={7}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder={t(`feedback.placeholder_${type}`)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none"
              style={{
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-input-border)',
                color: 'var(--color-text-primary)',
              }}
              {...register('message')}
            />
            {errors.message?.message && (
              <p className="text-xs" style={{ color: 'var(--color-error)' }}>
                {t(errors.message.message, { defaultValue: errors.message.message })}
              </p>
            )}
            {message.length > MAX_MESSAGE_LENGTH - 500 && (
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {message.length} / {MAX_MESSAGE_LENGTH}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {t('feedback.screenshotsLabel')}
            </label>
            <ScreenshotPicker
              value={screenshots}
              onChange={setScreenshots}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Sets the expectation the whole design rests on: the answer arrives by
            email, not in a second inbox inside the app. */}
        <p className="text-xs px-1" style={{ color: 'var(--color-text-secondary)' }}>
          {user?.email
            ? t('feedback.replyTo', { email: user.email })
            : t('feedback.replyToGeneric')}
        </p>
      </form>
    </Drawer>
  );
}
