import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormDocumentInput } from '@/shared/components/form/FormDocumentInput';
import { uploadToFirebase, UploadValidationError } from '@/shared/utils/firebaseUpload';
import { useAppAuth } from '@/core/auth/AuthContext';
import { useUpdateProperty } from '../queries';
import type { Property, PropertyUpdate } from '@/shared/types';

/**
 * One of the property's two document slots, uploading on the spot.
 *
 * A property stores exactly two documents — `basic_contract_url` and `land_registry_url` —
 * so each slot is a named target rather than a free-form drop area with nowhere to put the
 * file. Choosing or dropping a file uploads it and PATCHes the property immediately;
 * `useUpdateProperty` invalidates the detail query, so the list above refreshes itself.
 */
export type DocumentSlot = 'basic_contract_url' | 'land_registry_url';

// Matches what uploadToFirebase actually accepts (images + PDF + Word).
const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';

interface Props {
  property: Property;
  slot: DocumentSlot;
  label: string;
}

export function PropertyDocumentSlot({ property, slot, label }: Props) {
  const { t } = useTranslation();
  const { user } = useAppAuth();
  const updateProperty = useUpdateProperty(property.id);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  // Removing sends null rather than undefined — `toApi` only skips undefined, so null is what
  // actually clears the column.
  const patchFor = (url: string | null): PropertyUpdate =>
    slot === 'basic_contract_url' ? { basic_contract_url: url } : { land_registry_url: url };

  const save = async (file: File | null) => {
    if (!file && !property[slot]) return;
    if (file && !user) return;
    setError(null);
    setBusy(true);
    try {
      const url = file ? await uploadToFirebase(file, 'properties', user!.uid) : null;
      await updateProperty.mutateAsync(patchFor(url));
    } catch (e) {
      setError(e instanceof UploadValidationError ? e.message : t('documents.uploadFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (busy) return;
        const file = e.dataTransfer.files?.[0];
        if (file) void save(file);
      }}
      className="rounded-[12px] transition-colors"
      style={{
        outline: dragging ? '2px dashed var(--color-primary)' : undefined,
        outlineOffset: 4,
        opacity: busy ? 0.6 : 1,
        pointerEvents: busy ? 'none' : undefined,
      }}
    >
      <FormDocumentInput
        label={busy ? `${label} — ${t('documents.uploading')}` : label}
        accept={ACCEPT}
        existingUrl={property[slot]}
        error={error ?? undefined}
        onChange={(file) => void save(file)}
        onRemoveExisting={() => void save(null)}
      />
    </div>
  );
}
