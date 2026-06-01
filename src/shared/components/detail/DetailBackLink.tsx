import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface Props {
  to: string;
  label: string;
}

export function DetailBackLink({ to, label }: Props) {
  const { isRtl } = useLanguage();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="inline-flex items-center gap-1 text-[12px] font-medium mb-3.5"
      style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />} {label}
    </button>
  );
}
