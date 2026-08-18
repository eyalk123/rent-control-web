import { useTranslation } from 'react-i18next';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { useDetailParam } from '@/shared/components/detail/useDetailBackTarget';
import { RevenuePaymentPanel } from '@/features/transactions/components/RevenuePaymentPanel';
import { ExpensePanel } from '@/features/transactions/components/ExpensePanel';
import type { Renter, Transaction } from '@/shared/types';

type Section = 'revenue' | 'expenses';
const SECTIONS: readonly Section[] = ['revenue', 'expenses'];

interface Props {
  renter: Renter;
  transactions: Transaction[];
}

/**
 * Revenue and expenses answer different questions and deserve different shapes, so they
 * get separate sections rather than one mixed ledger: revenue as a month-by-month payment
 * grid, expenses as a category breakdown over time.
 *
 * Every selection lives in the query string, because switching to another detail tab
 * unmounts this whole subtree — component state would not survive the round trip, and
 * neither would a refresh or the back button.
 */
export function RenterTransactionsTab({ renter, transactions }: Props) {
  const { t } = useTranslation();
  const [section, setSection] = useDetailParam<Section>('section', 'revenue', SECTIONS);
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
        // The lease is the story here, so every year it covers is on screen at once.
        <RevenuePaymentPanel
          renters={[renter]}
          transactions={transactions}
          propertyId={renter.property_id}
          layout="stacked"
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
