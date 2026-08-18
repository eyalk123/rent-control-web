import { useTranslation } from 'react-i18next';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { useDetailParam } from '@/shared/components/detail/useDetailBackTarget';
import { RevenuePaymentPanel } from '@/features/transactions/components/RevenuePaymentPanel';
import { ExpensePanel } from '@/features/transactions/components/ExpensePanel';
import type { Property, Transaction } from '@/shared/types';

type Section = 'revenue' | 'expenses';
const SECTIONS: readonly Section[] = ['revenue', 'expenses'];

interface Props {
  property: Property;
  transactions: Transaction[];
}

/**
 * Revenue renders as a renter × month matrix here rather than a single strip, because a
 * property's payment history is several leases laid end to end. `GET /properties/{id}`
 * nests every renter with their lease intact — active and past alike — so a renter who
 * moved out still gets a row in the years they lived there.
 *
 * That matrix keeps its year selector: unlike the renter page, stacking every year would
 * multiply by the number of renters. Selections live in the query string so a trip through
 * another tab does not reset them.
 */
export function PropertyTransactionsTab({ property, transactions }: Props) {
  const { t } = useTranslation();
  const [section, setSection] = useDetailParam<Section>('section', 'revenue', SECTIONS);
  const [revYear, setRevYear] = useDetailParam<string>('revYear', '');
  const [expYear, setExpYear] = useDetailParam<string>('expYear', '');
  const [expMonth, setExpMonth] = useDetailParam<string>('expMonth', '');
  const [expCategory, setExpCategory] = useDetailParam<string>('expCategory', '');

  return (
    <div className="flex flex-col gap-4">
      <SegToggle
        options={[
          { value: 'revenue' as Section, label: t('transactions.revenue') },
          { value: 'expenses' as Section, label: t('transactions.expenses') },
        ]}
        value={section}
        onChange={setSection}
        size="sm"
      />

      {section === 'revenue' ? (
        <RevenuePaymentPanel
          renters={property.renters ?? []}
          transactions={transactions}
          propertyId={property.id}
          layout="single-year"
          year={revYear ? Number(revYear) : null}
          onYearChange={(y) => setRevYear(String(y))}
        />
      ) : (
        <ExpensePanel
          transactions={transactions}
          year={expYear ? Number(expYear) : null}
          onYearChange={(y) => setExpYear(String(y))}
          month={expMonth ? Number(expMonth) : null}
          onMonthChange={(m) => setExpMonth(m == null ? '' : String(m))}
          category={expCategory || null}
          onCategoryChange={(c) => setExpCategory(c ?? '')}
        />
      )}
    </div>
  );
}
