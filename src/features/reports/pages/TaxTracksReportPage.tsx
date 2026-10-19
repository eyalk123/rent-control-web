import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ExternalLink, Pencil, Plus } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { InfoTip } from '@/shared/components/ui/InfoTip';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { formatDate, formatMoney } from '@/shared/utils/money';
import { useTaxReport } from '../taxQueries';
import { TaxGroupDrawer } from '../components/TaxGroupDrawer';
import { TaxPurchaseDrawer } from '../components/TaxPurchaseDrawer';
import { TaxYearInputs } from '../components/TaxYearInputs';
import { MortgageYearDialog } from '@/features/properties/components/MortgageYearDialog';
import type {
  TaxFigure,
  TaxFigureKey,
  TaxGroup,
  TaxMissing,
  TaxPropertyBrief,
  TaxReport,
  TaxReportGroup,
  TaxTrack,
} from '../api/taxTracks';

const card = { background: 'var(--color-surface)', border: '1px solid var(--color-outline)' };

/** The last complete tax year is what most people come for; the current one is a forecast. */
function defaultYear(): number {
  return new Date().getFullYear() - 1;
}

function useMonthName() {
  const { i18n } = useTranslation();
  return (month: number) =>
    new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date(2020, month - 1, 1));
}

/** A deduction, shown with a minus; nothing deducted is 0, not -0. */
function deducted(amount: number | undefined): number {
  return amount ? -amount : 0;
}

function Money({ value }: { value: number }) {
  return <LtrSpan>{formatMoney(value)}</LtrSpan>;
}

/** Where the figures came from: the booklet they were read from, or the section of the law. */
function SourceTip({ figures, label, report }: { figures: (TaxFigure | undefined)[]; label: string; report: TaxReport }) {
  const { t } = useTranslation();
  const shown = figures.filter((f): f is TaxFigure => f != null);
  if (shown.length === 0) return null;
  // The booklet once, however many of its figures are used here.
  const seen = new Set<string>();
  const sources = shown.flatMap((f) => {
    const fromBooklet = f.source === 'document' && report.document != null;
    const key = fromBooklet ? 'booklet' : `${f.reference}|${f.url}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      key,
      text: fromBooklet ? t('taxTracks.sourceBooklet', { date: formatDate(report.document!.fetched_at) }) : f.reference,
      url: fromBooklet ? report.document!.url : f.url,
    }];
  });
  return (
    <InfoTip label={label}>
      <div className="space-y-2">
        {sources.map((s) => (
          <div key={s.key}>
            <p>{s.text}</p>
            <a href={s.url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 mt-0.5 underline" style={{ color: 'var(--color-primary)' }}>
              {t('taxTracks.openSource')} <ExternalLink size={11} />
            </a>
          </div>
        ))}
      </div>
    </InfoTip>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{children}</p>
  );
}

function TrackRow({ title, description, tip, badge, children }: { title: string; description: string; tip?: ReactNode; badge?: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 py-3.5" style={{ borderTop: '1px solid var(--color-outline)' }}>
      <div className="sm:w-1/2 min-w-0">
        <div className="flex flex-wrap items-center gap-1">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
          {tip}
          {badge && (
            <span className="ms-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: 'var(--color-input-filled-background)', color: 'var(--color-primary)' }}>
              {t('taxTracks.lowest')}
            </span>
          )}
        </div>
        <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>
      </div>
      <div className="sm:w-1/2 text-[13px] space-y-1" style={{ color: 'var(--color-text-primary)' }}>{children}</div>
    </div>
  );
}

function Line({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className={strong ? 'font-semibold' : ''} style={{ fontVariantNumeric: 'tabular-nums' }}>{children}</span>
    </div>
  );
}

/** Income tax and surtax on the part taxed at the marginal rate, then the total. */
function TaxLines({ result, total }: { result: { income_tax?: number; surtax?: number; capital_surtax?: number }; total: number }) {
  const { t } = useTranslation();
  return (
    <>
      {result.income_tax != null && <Line label={t('taxTracks.incomeTax')}><Money value={result.income_tax} /></Line>}
      {!!result.surtax && <Line label={t('taxTracks.surtax')}><Money value={result.surtax} /></Line>}
      {!!result.capital_surtax && <Line label={t('taxTracks.capitalSurtax')}><Money value={result.capital_surtax} /></Line>}
      <Line label={t('taxTracks.tax')} strong><Money value={total} /></Line>
    </>
  );
}

/** Where the report asks for a year of the bank's mortgage statement. */
interface InterestTarget {
  propertyId: number;
  mortgageId: number;
  year: number;
}

/** What a track still needs, each item with where to fill it in. */
function MissingList({ items, year, onPurchase, onInterest }: {
  items: TaxMissing[];
  year: number;
  onPurchase: (p: TaxPropertyBrief) => void;
  onInterest: (target: InterestTarget) => void;
}) {
  const { t } = useTranslation();
  if (items.some((m) => m.code === 'tax_figures')) return <Note>{t('taxTracks.missingFigures', { year })}</Note>;
  return (
    <div>
      <Note>{t('taxTracks.missingTitle')}</Note>
      <ul className="mt-1 space-y-1 list-disc ps-4 text-[12.5px]" style={{ color: 'var(--color-text-primary)' }}>
        {items.map((m) => {
          const key = 'id' in m ? `${m.code}-${m.id}` : m.code;
          if (m.code === 'purchase_price' || m.code === 'purchase_date') {
            return (
              <li key={key}>
                <button type="button" onClick={() => onPurchase(m)} className="underline text-start"
                  style={{ color: 'var(--color-primary)', background: 'none', border: 'none', padding: 0 }}>
                  {t(m.code === 'purchase_price' ? 'taxTracks.missingPurchasePrice' : 'taxTracks.missingPurchaseDate', { address: m.address })}
                </button>
              </li>
            );
          }
          if (m.code === 'interest') {
            // The current year's statement doesn't exist yet; last year's stands in for it.
            const statementYear = Math.min(year, new Date().getFullYear() - 1);
            return (
              <li key={key}>
                <button type="button" onClick={() => onInterest({ propertyId: m.id, mortgageId: m.mortgage_id, year: statementYear })}
                  className="underline text-start" style={{ color: 'var(--color-primary)', background: 'none', border: 'none', padding: 0 }}>
                  {t('taxTracks.missingInterest', { address: m.address, year: statementYear })}
                </button>
              </li>
            );
          }
          if (m.code === 'cpi') {
            return <li key={key}>{t('taxTracks.missingCpi', { address: m.address })}</li>;
          }
          return <li key={key}>{t(m.code === 'other_income' ? 'taxTracks.missingOtherIncome' : 'taxTracks.missingMixedAges', { year })}</li>;
        })}
      </ul>
    </div>
  );
}

function GroupCard({ group, report, onEdit, onPurchase, onInterest }: {
  group: TaxReportGroup;
  report: TaxReport;
  onEdit: (g: TaxGroup) => void;
  onPurchase: (p: TaxPropertyBrief) => void;
  onInterest: (target: InterestTarget) => void;
}) {
  const { t } = useTranslation();
  const monthName = useMonthName();
  const [showMonths, setShowMonths] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const { exemption, ten_percent: ten, marginal, combination: mix, expenses } = group;
  const year = report.year;
  const fig = (...keys: TaxFigureKey[]) => keys.map((k) => report.figures[k]);
  const list = (items: { address: string }[]) => items.map((p) => p.address).join(', ');
  const trackName = (track: TaxTrack) => t(`taxTracks.track_${track}`);
  const categoryName = (label: string | null, builtIn: boolean) =>
    label == null ? t('taxTracks.noCategory') : builtIn ? t(`expenseCategories.${label}`, { defaultValue: label }) : label;

  // "Lowest" only once all three single tracks have a figure; with one missing it would mislead.
  const singles: [TaxTrack, number | null | undefined][] = [
    ['exemption', exemption.available ? exemption.tax : null],
    ['ten_percent', ten.tax],
    ['marginal', marginal.available ? marginal.tax : null],
  ];
  const allKnown = singles.every(([, v]) => v != null);
  const mixTax = mix.available && mix.mixed ? mix.tax : null;
  const lowestSingle = allKnown ? Math.min(...singles.map(([, v]) => v as number)) : null;
  const lowest = lowestSingle == null ? null
    : mixTax != null && mixTax < lowestSingle - 0.5 ? 'mix'
    : singles.find(([, v]) => v === lowestSingle)![0];

  return (
    <section className="rounded-[var(--radius-card)] p-5" style={card}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {group.name ?? t('reports.noOwner')}
          </h2>
          <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {group.properties.length > 0
              ? group.properties.map((p) => p.address).join(' · ')
              : t('taxTracks.noProperties')}
          </p>
        </div>
        {group.kind === 'custom' && group.group_id != null && (
          <button
            type="button"
            onClick={() => onEdit({ id: group.group_id!, name: group.name ?? '', property_owner_ids: group.property_owner_ids, property_ids: group.member_property_ids })}
            className="inline-flex items-center gap-1 text-[12px] font-medium shrink-0"
            style={{ color: 'var(--color-primary)', background: 'none', border: 'none' }}
          >
            <Pencil size={13} /> {t('taxTracks.editGroup')}
          </button>
        )}
      </div>

      {group.properties.length > 0 && (
        <p className="text-[13px] mt-3" style={{ color: 'var(--color-text-primary)' }}>
          {group.total_rent > 0
            ? t('taxTracks.totalRent', { year, amount: formatMoney(group.total_rent) })
            : t('taxTracks.noRent', { year })}
          {group.total_rent > 0 && group.senior && (
            <span style={{ color: 'var(--color-text-secondary)' }}> · {t('taxTracks.seniorYes', { year })}</span>
          )}
        </p>
      )}

      {/* No rent, nothing to compare: rows of zeros would only look like an answer. */}
      {group.total_rent > 0 && (
        <>
          <TaxYearInputs
            groupKey={group.key}
            year={year}
            inputs={group.inputs}
            basicPoints={(report.figures.resident_credit_points?.value as number | undefined) ?? null}
          />

          <div className="mt-3">
            <TrackRow
              title={t('taxTracks.exemptionTrack')}
              description={exemption.ceiling != null
                ? t('taxTracks.exemptionDesc', { ceiling: formatMoney(exemption.ceiling) })
                : t('taxTracks.exemptionDescNoFigure')}
              tip={<SourceTip figures={fig('rent_exemption_ceiling_monthly')} label={t('taxTracks.sourceCeiling')} report={report} />}
              badge={lowest === 'exemption'}
            >
              {exemption.available ? (
                <>
                  <Line label={t('taxTracks.exempt')}><Money value={exemption.exempt ?? 0} /></Line>
                  <Line label={t('taxTracks.taxable')}><Money value={exemption.taxable ?? 0} /></Line>
                  {exemption.tax != null ? (
                    exemption.tax === 0 && !exemption.taxable ? (
                      <Line label={t('taxTracks.tax')} strong><Money value={0} /></Line>
                    ) : (
                      <>
                        {!!exemption.exemption_deductions && (
                          <Line label={t('taxTracks.exemptionDeductions')}><Money value={deducted(exemption.exemption_deductions)} /></Line>
                        )}
                        <TaxLines result={exemption} total={exemption.tax} />
                      </>
                    )
                  ) : (
                    <MissingList items={exemption.missing} year={year} onPurchase={onPurchase} onInterest={onInterest} />
                  )}
                </>
              ) : exemption.missing.some((m) => m.code === 'tax_figures') ? (
                <Note>{t('taxTracks.missingFigures', { year })}</Note>
              ) : exemption.company_renter.length > 0 ? (
                <Note>{t('taxTracks.companyRenterBlocks', { list: list(exemption.company_renter) })}</Note>
              ) : null}
            </TrackRow>

            <TrackRow
              title={t('taxTracks.tenTrack')}
              description={ten.rate_pct != null ? t('taxTracks.tenDesc', { rate: ten.rate_pct }) : t('taxTracks.tenDescNoFigure')}
              tip={<SourceTip figures={fig('ten_percent_rate_pct', 'surtax_threshold', 'surtax_rate_pct', 'capital_surtax_rate_pct')} label={t('taxTracks.sourceTen')} report={report} />}
              badge={lowest === 'ten_percent'}
            >
              {ten.available && ten.base_tax != null ? (
                <>
                  <Line label={t('taxTracks.rent')}><Money value={ten.gross} /></Line>
                  {ten.tax != null ? (
                    <>
                      <Line label={t('taxTracks.tenOfRent', { rate: ten.rate_pct })}><Money value={ten.base_tax} /></Line>
                      <TaxLines result={ten} total={ten.tax} />
                    </>
                  ) : (
                    <>
                      <Line label={t('taxTracks.tax')} strong><Money value={ten.base_tax} /></Line>
                      <Note>{t('taxTracks.tenSurtaxPending')}</Note>
                    </>
                  )}
                </>
              ) : (
                <Note>{t('taxTracks.missingFigures', { year })}</Note>
              )}
            </TrackRow>

            <TrackRow
              title={t('taxTracks.marginalTrack')}
              description={t('taxTracks.marginalDesc')}
              tip={<SourceTip figures={fig('other_income_brackets', 'personal_brackets', 'senior_age', 'credit_point_monthly', 'resident_credit_points', 'depreciation_rate_pct')} label={t('taxTracks.sourceMarginal')} report={report} />}
              badge={lowest === 'marginal'}
            >
              {marginal.available && marginal.tax != null ? (
                <>
                  <Line label={t('taxTracks.rent')}><Money value={marginal.rent} /></Line>
                  <Line label={t('taxTracks.expenses')}><Money value={deducted(marginal.expenses)} /></Line>
                  {marginal.interest_total > 0 && (
                    <Line label={marginal.interest.some((i) => i.estimated) ? t('taxTracks.interestEstimated') : t('taxTracks.interest')}>
                      <Money value={deducted(marginal.interest_total)} />
                    </Line>
                  )}
                  <Line label={t('taxTracks.depreciation')}><Money value={deducted(marginal.depreciation_total)} /></Line>
                  <Line label={t('taxTracks.taxableIncome')}><Money value={marginal.income ?? 0} /></Line>
                  <TaxLines result={marginal} total={marginal.tax} />
                  {marginal.loss && <Note>{t('taxTracks.lossNote')}</Note>}
                </>
              ) : (
                <MissingList items={marginal.missing} year={year} onPurchase={onPurchase} onInterest={onInterest} />
              )}
            </TrackRow>

            {mix.available && (
              <TrackRow title={t('taxTracks.mixTrack')} description={t('taxTracks.mixDesc')} badge={lowest === 'mix'}>
                {mix.mixed ? (
                  <>
                    {mix.flats.map((f) => (
                      <Line key={f.id} label={f.address}>{trackName(f.track)}</Line>
                    ))}
                    <TaxLines result={mix} total={mix.tax} />
                  </>
                ) : (
                  <Note>{t('taxTracks.mixSame', { track: trackName(mix.flats[0].track) })}</Note>
                )}
              </TrackRow>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
            {exemption.available && exemption.months && (
              <button
                type="button"
                onClick={() => setShowMonths((v) => !v)}
                className="text-[12.5px] font-medium"
                style={{ color: 'var(--color-primary)', background: 'none', border: 'none', padding: 0 }}
                aria-expanded={showMonths}
              >
                {showMonths ? t('taxTracks.hideMonths') : t('taxTracks.byMonth')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDetail((v) => !v)}
              className="text-[12.5px] font-medium"
              style={{ color: 'var(--color-primary)', background: 'none', border: 'none', padding: 0 }}
              aria-expanded={showDetail}
            >
              {showDetail ? t('taxTracks.hideDetail') : t('taxTracks.showDetail')}
            </button>
          </div>

          {showMonths && exemption.months && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-[12.5px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr style={{ color: 'var(--color-text-secondary)' }}>
                    <th className="text-start font-medium py-1.5">{t('taxTracks.colMonth')}</th>
                    <th className="text-end font-medium py-1.5">{t('taxTracks.colRent')}</th>
                    <th className="text-end font-medium py-1.5">{t('taxTracks.colCeiling')}</th>
                    <th className="text-end font-medium py-1.5">{t('taxTracks.colTaxable')}</th>
                  </tr>
                </thead>
                <tbody>
                  {exemption.months.map((m) => (
                    <tr key={m.month} style={{ borderTop: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}>
                      <td className="py-1.5">
                        {monthName(m.month)}
                        {group.forecast_months.includes(m.month) && (
                          <span className="ms-1.5 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{t('taxTracks.forecastMark')}</span>
                        )}
                      </td>
                      <td className="py-1.5 text-end"><Money value={m.rent} /></td>
                      <td className="py-1.5 text-end"><Money value={exemption.ceiling ?? 0} /></td>
                      <td className="py-1.5 text-end">{m.taxable > 0 ? <Money value={m.taxable} /> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showDetail && (
            <div className="mt-3 space-y-3 text-[12.5px]" style={{ color: 'var(--color-text-primary)' }}>
              <div>
                <p className="font-semibold">{t('taxTracks.expensesTitle', { year })}</p>
                {expenses.counted.length === 0 && expenses.not_counted.length === 0 && expenses.renovation === 0 ? (
                  <Note>{t('taxTracks.noExpenses')}</Note>
                ) : (
                  <div className="mt-1 space-y-0.5">
                    {expenses.counted.map((e) => (
                      <Line key={e.key} label={categoryName(e.key, true)}><Money value={e.amount} /></Line>
                    ))}
                  </div>
                )}
                {expenses.not_counted.length > 0 && (
                  <Note>{t('taxTracks.expensesNotCounted', {
                    list: expenses.not_counted.map((e) => `${categoryName(e.label, e.built_in)} (${formatMoney(e.amount)})`).join(', '),
                  })}</Note>
                )}
                <Note>{t('taxTracks.expensesRecognised', {
                  list: expenses.recognised.map((k) => categoryName(k, true)).join(', '),
                })}</Note>
                {expenses.renovation > 0 && <Note>{t('taxTracks.renovationNote', { amount: formatMoney(expenses.renovation) })}</Note>}
                {marginal.expenses_so_far && <Note>{t('taxTracks.expensesSoFar')}</Note>}
              </div>
              {marginal.interest.length > 0 && (
                <div>
                  <p className="font-semibold">{t('taxTracks.interestTitle')}</p>
                  <div className="mt-1 space-y-0.5">
                    {marginal.interest.map((i) => (
                      <Note key={i.id}>
                        {t('taxTracks.interestLine', {
                          address: i.address,
                          year: i.year,
                          interest: formatMoney(i.interest),
                          linkage: formatMoney(i.linkage),
                          amount: formatMoney(i.amount),
                        })}
                        {i.estimated && ` ${t('taxTracks.interestEstimateNote', { year: i.year })}`}
                      </Note>
                    ))}
                  </div>
                  <Note>{t('taxTracks.linkageNote')}</Note>
                </div>
              )}
              <div>
                <p className="font-semibold">{t('taxTracks.depreciationTitle')}</p>
                <div className="mt-1 space-y-0.5">
                  {marginal.depreciation.map((d) => (
                    <Note key={d.id}>
                      {d.before_cpi
                        ? t('taxTracks.depreciationBeforeCpi', { address: d.address })
                        : d.amount != null && d.value != null
                          ? t('taxTracks.depreciationLine', {
                              address: d.address,
                              price: formatMoney(d.price ?? 0),
                              factor: d.factor,
                              rate: d.rate_pct,
                              months: d.months,
                              amount: formatMoney(d.amount),
                            })
                          : t('taxTracks.depreciationMissing', { address: d.address })}
                      {d.cpi?.estimated && ` ${t('taxTracks.cpiEstimated', { year, month: monthName(d.cpi.end[1]) })}`}
                    </Note>
                  ))}
                </div>
                <Note>{t('taxTracks.depreciationHow')}</Note>
              </div>
              <div className="space-y-1">
                <Note>{t('taxTracks.otherIncomeAssumption')}</Note>
                <Note>{t('taxTracks.householdNote')}</Note>
                <Note>{t('taxTracks.nationalInsuranceNote')}</Note>
                <Note>{t('taxTracks.bettermentNote')}</Note>
              </div>
            </div>
          )}
        </>
      )}

      {group.checks.length > 0 && (
        <div className="mt-4 rounded-xl p-3.5" style={{ background: 'var(--color-input-filled-background)' }}>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('taxTracks.checksTitle')}</p>
          <p className="text-[12px] mt-0.5 mb-2" style={{ color: 'var(--color-text-secondary)' }}>{t('taxTracks.checksHint')}</p>
          <ul className="space-y-1">
            {group.checks.map((c) => (
              <li key={`${c.renter_id}-${c.month}`} className="text-[12.5px]">
                <Link to={`/renters/${c.renter_id}`} className="hover:underline" style={{ color: 'var(--color-text-primary)' }}>
                  {t(c.kind === 'missing' ? 'taxTracks.checkMissing' : 'taxTracks.checkAbove', {
                    month: monthName(c.month),
                    renter: c.renter_name,
                    expected: formatMoney(c.expected),
                    recorded: formatMoney(c.recorded),
                  })}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(group.notes.length > 0 || group.commercial.length > 0) && (
        <div className="mt-4 space-y-1.5">
          {group.commercial.length > 0 && <Note>{t('taxTracks.commercialLeftOut', { list: list(group.commercial) })}</Note>}
          {group.notes.map((n) => (
            <Note key={n.code}>
              {n.code === 'rent_paid_deduction'
                ? t('taxTracks.noteRentPaid', { cap: formatMoney(n.cap) })
                : n.code === 'over_60_ticked_later'
                  ? t('taxTracks.noteOver60Later', { name: n.name, year: n.year })
                  : n.code === 'no_owner_age'
                    ? t('taxTracks.noteNoOwnerAge')
                    : t(n.code === 'likely_business' ? 'taxTracks.noteLikelyBusiness' : 'taxTracks.noteMaybeBusiness', { count: n.count, threshold: n.threshold })}
            </Note>
          ))}
        </div>
      )}
    </section>
  );
}

export function TaxTracksReportPage() {
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const navigate = useNavigate();
  const monthName = useMonthName();
  const [year, setYear] = useState(defaultYear);
  const { data: report, isLoading, isError } = useTaxReport(year);
  const [editing, setEditing] = useState<{ open: boolean; group?: TaxGroup }>({ open: false });
  const [purchaseFor, setPurchaseFor] = useState<TaxPropertyBrief | null>(null);
  const [interestFor, setInterestFor] = useState<InterestTarget | null>(null);

  const years = report?.years ?? [year];

  return (
    <div>
      <div className="px-4 lg:px-8 pt-6 pb-4" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <button
          onClick={() => navigate('/reports')}
          className="inline-flex items-center gap-1 text-[12px] font-medium mb-1.5"
          style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />} {t('screens.reports')}
        </button>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t('taxTracks.title')}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t('taxTracks.disclaimer')}</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegToggle
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
            value={String(year)}
            onChange={(v) => setYear(Number(v))}
          />
          <button
            type="button"
            onClick={() => setEditing({ open: true })}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold"
            style={{ border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)', background: 'var(--color-surface)' }}
          >
            <Plus size={14} /> {t('taxTracks.newGroup')}
          </button>
        </div>

        {isLoading ? <PageLoader /> : isError || !report ? (
          <EmptyState title={t('error.loadFailed')} />
        ) : (
          <>
            <div className="rounded-[var(--radius-card)] p-4 space-y-1.5" style={card}>
              {report.is_forecast && report.forecast_from_month != null && report.forecast_from_month <= 12 && (
                <Note>{t('taxTracks.forecastNote', { year: report.year, month: monthName(report.forecast_from_month) })}</Note>
              )}
              {report.company_owners.length > 0 && (
                <Note>{t('taxTracks.companyOwnersNote', { names: report.company_owners.join(', ') })}</Note>
              )}
              {report.locked_properties > 0 && <Note>{t('taxTracks.lockedNote', { count: report.locked_properties })}</Note>}
              <Note>{t('taxTracks.inheritanceNote')}</Note>
            </div>

            {report.groups.length === 0 ? (
              <EmptyState title={t('taxTracks.empty')} />
            ) : (
              report.groups.map((g) => (
                <GroupCard
                  key={g.key}
                  group={g}
                  report={report}
                  onEdit={(group) => setEditing({ open: true, group })}
                  onPurchase={setPurchaseFor}
                  onInterest={setInterestFor}
                />
              ))
            )}
          </>
        )}
      </div>

      <TaxGroupDrawer open={editing.open} group={editing.group} onClose={() => setEditing({ open: false })} />
      <TaxPurchaseDrawer property={purchaseFor} onClose={() => setPurchaseFor(null)} />
      {interestFor && (
        <MortgageYearDialog
          open
          propertyId={interestFor.propertyId}
          mortgageId={interestFor.mortgageId}
          presetYear={interestFor.year}
          onClose={() => setInterestFor(null)}
        />
      )}
    </div>
  );
}
