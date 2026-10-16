import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { currencySymbol, formatDate, formatMoney } from '@/shared/utils/money';
import { parseISODate } from '@/shared/utils/dates';
import type { PropertyValuation } from '@/shared/types';

interface Props {
  /** Newest first, as the API returns them. */
  valuations: PropertyValuation[];
  purchasePrice?: number | null;
  purchaseDate?: string | null;
}

interface Point {
  t: number;
  date: string;
  value: number;
  isPurchase: boolean;
}

function compact(v: number): string {
  const s = currencySymbol();
  if (Math.abs(v) >= 1_000_000) return `${s}${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `${s}${Math.round(v / 1000)}k`;
  return `${s}${v}`;
}

/** The points the chart draws: the purchase, when it is known, then each recorded value. */
export function valueChartPoints(
  valuations: PropertyValuation[],
  purchasePrice?: number | null,
  purchaseDate?: string | null,
): Point[] {
  const points: Point[] = valuations.map((v) => ({
    t: parseISODate(v.valued_on)?.getTime() ?? 0,
    date: v.valued_on,
    value: v.value,
    isPurchase: false,
  }));
  if (purchasePrice && purchaseDate) {
    points.push({ t: parseISODate(purchaseDate)?.getTime() ?? 0, date: purchaseDate, value: purchasePrice, isPurchase: true });
  }
  return points.sort((a, b) => a.t - b.t);
}

/**
 * The property's value over time — one series, so no legend; the list under it is the table
 * view. Dates sit on a real time scale, so a ten-year gap reads as one.
 */
export function PropertyValueChart({ valuations, purchasePrice, purchaseDate }: Props) {
  const { t } = useTranslation();
  const data = valueChartPoints(valuations, purchasePrice, purchaseDate);
  if (data.length < 2) return null;

  return (
    <figure className="px-4 pt-4 pb-2" aria-label={t('property.valueChartLabel')}>
      <div dir="ltr">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(v: number) => String(new Date(v).getFullYear())}
              tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={compact}
              tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
              axisLine={false}
              tickLine={false}
              width={52}
              domain={['auto', 'auto']}
            />
            <Tooltip
              cursor={{ stroke: 'var(--color-outline)' }}
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-outline)',
                borderRadius: 10,
                fontSize: 12,
                color: 'var(--color-text-primary)',
              }}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as Point | undefined;
                if (!p) return '';
                return p.isPurchase ? `${formatDate(p.date)} · ${t('property.valueChartPurchase')}` : formatDate(p.date);
              }}
              formatter={(v) => [formatMoney(Number(v ?? 0)), t('property.valueAmount')]}
            />
            <Line
              type="linear"
              dataKey="value"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--color-chart-1)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: 'var(--color-chart-1)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
