import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import notices from 'virtual:third-party-notices';
import { LegalPageShell } from '../LegalLayout';

type NoticePackage = (typeof notices.sections)[number]['packages'][number];

// The license bodies are a separate chunk (hundreds of kB), fetched the first time any
// component is opened and shared by every row after that.
let loadedTexts: string[] | undefined;
let textsRequest: Promise<string[]> | undefined;
function loadTexts(): Promise<string[]> {
  textsRequest ??= import('virtual:third-party-notices/texts').then((m) => (loadedTexts = m.default));
  return textsRequest;
}

// The notices file names its sections in English capitals; these are the ones it has today.
// A section added later still renders, under the file's own heading.
function sectionKey(title: string): string | undefined {
  if (title.startsWith('CLIENT')) return 'licenses.sectionClient';
  if (title.startsWith('BACKEND')) return 'licenses.sectionBackend';
  return undefined;
}

function PackageRow({ pkg }: { pkg: NoticePackage }) {
  // License bodies render only once opened — 1,000+ packages each carrying a full text would
  // put megabytes of hidden text in the DOM.
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [texts, setTexts] = useState(loadedTexts);
  const [failed, setFailed] = useState(false);

  const onToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const isOpen = e.currentTarget.open;
    setOpen(isOpen);
    if (isOpen && !texts) {
      setFailed(false);
      loadTexts().then(setTexts, () => {
        textsRequest = undefined; // let the next open retry
        setFailed(true);
      });
    }
  };

  return (
    <details
      onToggle={onToggle}
      style={{ borderBottom: '1px solid var(--color-outline)' }}
    >
      <summary
        dir="ltr"
        className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2 text-[13.5px]"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {/* A flex summary drops the native disclosure marker, so draw one. */}
        <ChevronRight
          aria-hidden="true"
          size={14}
          className="shrink-0 self-center transition-transform"
          style={{ transform: open ? 'rotate(90deg)' : undefined, color: 'var(--color-text-secondary)' }}
        />
        <span className="font-mono font-semibold break-all">{pkg.name}</span>
        <span className="font-mono text-[12.5px]" style={{ color: 'var(--color-text-secondary)' }}>{pkg.version}</span>
        <span className="ms-auto text-[12.5px]" style={{ color: 'var(--color-text-secondary)' }}>{pkg.license}</span>
      </summary>
      {open && (
        <div dir="ltr" className="flex flex-col gap-3 pb-3">
          {failed && (
            <p dir="auto" className="text-[13px]" style={{ color: 'var(--color-error)' }}>{t('licenses.loadError')}</p>
          )}
          {!failed && !texts && (
            <p dir="auto" className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('licenses.loading')}</p>
          )}
          {texts && pkg.texts.map((ref) => (
            <div key={ref.label} className="flex flex-col gap-1">
              <p dir="auto" className="text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {ref.standard ? t('licenses.standardText', { license: ref.label }) : ref.label}
              </p>
              <pre
                className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-[8px] p-3 font-mono text-[12px] leading-relaxed"
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                  border: ref.standard ? '1px dashed var(--color-outline)' : '1px solid var(--color-outline)',
                }}
              >
                {texts[ref.text]}
              </pre>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}

export function OpenSourceLicensesPage() {
  const { t, i18n } = useTranslation();
  const generated = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long', timeZone: 'UTC' })
    .format(new Date(notices.generated));

  return (
    <LegalPageShell title={t('licenses.title')} lastUpdated={generated}>
      <div className="mt-6 flex flex-col gap-3">
        <p className="text-[14.5px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('licenses.intro')}</p>
        <p className="text-[14.5px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('licenses.textsNote')}</p>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {notices.sections.map((section) => {
          const key = sectionKey(section.title);
          return (
            <section key={section.title}>
              <h2 className="text-[17px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {key ? t(key) : section.title}
              </h2>
              <p className="mt-0.5 mb-2 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                {t('licenses.componentCount', { count: section.packages.length })}
              </p>
              <div style={{ borderTop: '1px solid var(--color-outline)' }}>
                {section.packages.map((pkg) => (
                  <PackageRow key={`${pkg.name}@${pkg.version}`} pkg={pkg} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </LegalPageShell>
  );
}
