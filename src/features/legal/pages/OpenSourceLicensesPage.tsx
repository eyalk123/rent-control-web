import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import notices from 'virtual:third-party-notices';
import { LegalPageShell } from '../LegalLayout';

type NoticePackage = (typeof notices.sections)[number]['packages'][number];

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
  const [open, setOpen] = useState(false);
  return (
    <details
      onToggle={(e) => setOpen(e.currentTarget.open)}
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
          {pkg.licenseIds.map((id) => (
            <pre
              key={id}
              className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-[8px] p-3 font-mono text-[12px] leading-relaxed"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-outline)' }}
            >
              {notices.texts[id]}
            </pre>
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
