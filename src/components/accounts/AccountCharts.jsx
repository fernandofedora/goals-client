import { useTranslation } from 'react-i18next';
import { Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';
import { useCurrency } from '../../context/CurrencyContext';
import { intlLocale } from '../../utils/dateLocale';
import { signedMoney } from '../../utils/format';

const monthDate = (key) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1);
};

function AccountLineChart({
  data,
  dataKey,
  seriesName,
  height,
  showMonths,
  label,
}) {
  const { money } = useCurrency();
  return (
    <div role="img" aria-label={label} className="[&_svg]:outline-none">
      <ChartContainer config={{}} style={{ height }}>
        <LineChart
          data={data}
          accessibilityLayer={false}
          margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        >
          {showMonths && (
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              minTickGap={12}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickFormatter={(key) =>
                monthDate(key).toLocaleDateString(intlLocale(), {
                  month: 'short',
                })
              }
            />
          )}
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="line"
                formatter={(v) => signedMoney(v, money)}
                labelFormatter={(_, payload) =>
                  payload?.[0]
                    ? monthDate(payload[0].payload.month).toLocaleDateString(
                        intlLocale(),
                        { month: 'short', year: 'numeric' },
                      )
                    : ''
                }
              />
            }
          />
          <Line
            dataKey={dataKey}
            name={seriesName}
            type="monotone"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

/** History series of a bank account (balance) or a card (monthly spending). */
export function AccountTrend({ kind, name, history, large = false }) {
  const { t } = useTranslation();
  const isCard = kind === 'card';
  return (
    <AccountLineChart
      data={history}
      dataKey={isCard ? 'spent' : 'balance'}
      seriesName={
        isCard ? t('accountsPage.expenses') : t('accountsPage.balance')
      }
      height={large ? 190 : 48}
      showMonths={large}
      label={t('accountsPage.sparklineLabel', { name })}
    />
  );
}

/**
 * Change against last month. For a card, spending more is the bad direction,
 * so the color flips while the arrow keeps following the number.
 */
export function AccountDelta({ value, spending = false }) {
  const { t } = useTranslation();
  const { money } = useCurrency();
  if (value === 0) {
    return (
      <p className="text-xs text-[var(--muted-foreground)]">
        {t('accountsPage.noChangeVsLastMonth')}
      </p>
    );
  }
  const up = value > 0;
  const good = spending ? !up : up;
  return (
    <p
      className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${
        good
          ? 'text-emerald-700 dark:text-emerald-400'
          : 'text-rose-700 dark:text-rose-400'
      }`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={up ? 'M12 19V5M5 12l7-7 7 7' : 'M12 5v14M5 12l7 7 7-7'} />
      </svg>
      {t('accountsPage.vsLastMonth', {
        amount: `${up ? '+' : '−'}${money(Math.abs(value))}`,
      })}
    </p>
  );
}
