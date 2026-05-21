import { Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';

interface BucketData {
  month: string;
  revenue: number;
  expenses: number;
}

interface CashFlowChartProps {
  data: BucketData[];
  height?: number;
  compact?: boolean;
}

function formatK(v: number): string {
  if (v >= 1000) return `₪${(v / 1000).toFixed(0)}k`;
  return `₪${v}`;
}

export function CashFlowChart({ data, height = 200, compact = false }: CashFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-rev-fg)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--color-rev-fg)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {!compact && (
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" vertical={false} />
        )}
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
          axisLine={false}
          tickLine={false}
          interval={compact ? 'preserveStartEnd' : 0}
        />
        {!compact && (
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatK}
            width={44}
          />
        )}
        <Tooltip
          contentStyle={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-outline)',
            borderRadius: 10,
            fontSize: 12,
          }}
          formatter={(v, name) => [formatK(Number(v ?? 0)), name === 'revenue' ? 'Revenue' : 'Expenses']}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-rev-fg)"
          strokeWidth={2}
          fill="url(#revGradient)"
          dot={false}
        />
        <Bar
          dataKey="expenses"
          fill="var(--color-exp-fg)"
          fillOpacity={0.25}
          radius={[3, 3, 0, 0]}
          maxBarSize={20}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
