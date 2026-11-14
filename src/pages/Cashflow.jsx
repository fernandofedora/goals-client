import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Sankey, Tooltip } from 'recharts';
import api from '../api';
import PageHeader from '../components/ui/page-header';
import { useCurrency } from '../context/CurrencyContext';
import { buildCashflow, savingsRate } from '../utils/cashflow';
import { intlLocale } from '../utils/dateLocale';
import { signedMoney } from '../utils/format';
import { cn } from '../lib/utils';
import MonthStepper from '../components/ui/month-stepper';
import { periodOf, shiftMonth } from '../utils/months';

// Below this width the side labels would squeeze the flow, so the diagram
// drops them and the lists under it carry the names.
const LABELS_MIN_WIDTH = 640;
// Without side labels the bands read fine shorter, and a phone keeps the
// lists below in view.
const chartHeight = (showLabels) => (showLabels ? 420 : 300);

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function StatCard({ label, value, detail, tone }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
      <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-2xl sm:text-3xl font-bold tabular-nums',
          tone === 'good' && 'text-emerald-700 dark:text-emerald-400',
          tone === 'bad' && 'text-rose-700 dark:text-rose-400',
          !tone && 'text-[var(--foreground)]',
        )}
      >
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{detail}</p>
      )}
    </div>
  );
}

// One column of the diagram. Category nodes open their transactions.
function FlowNode({ x, y, width, height, payload, showLabels, onOpen, money }) {
  const node = payload;
  const clickable = Boolean(node.id);
  const labelLeft = node.side === 'in';
  const midLabel = node.side === 'mid';
  return (
    <g
      onClick={clickable ? () => onOpen(node) : undefined}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(height, 2)}
        rx={3}
        fill={node.color}
      />
      {showLabels && !midLabel && (
        <text
          x={labelLeft ? x - 8 : x + width + 8}
          y={y + height / 2}
          textAnchor={labelLeft ? 'end' : 'start'}
          dominantBaseline="middle"
          fontSize={12}
        >
          <tspan fill="var(--foreground)">{node.name}</tspan>
          <tspan fill="var(--muted-foreground)" dx={6}>
            {money(node.value ?? node.amount)}
          </tspan>
        </text>
      )}
    </g>
  );
}

// Links take the color of the category end, so each band reads as its node.
function FlowLink({
  sourceX,
  targetX,
  sourceY,
  targetY,
  sourceControlX,
  targetControlX,
  linkWidth,
  payload,
}) {
  const color =
    payload.source?.side === 'mid'
      ? payload.target?.color
      : payload.source?.color;
  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={color}
      strokeOpacity={0.3}
      strokeWidth={Math.max(linkWidth, 1)}
    />
  );
}

function FlowTooltip({ active, payload, money }) {
  const item = payload?.[0];
  if (!active || !item) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-[var(--foreground)]">{item.name}</p>
      <p className="tabular-nums text-[var(--muted-foreground)]">
        {money(item.value)}
      </p>
    </div>
  );
}

// The same numbers as the diagram, as a list: readable on phones, by screen
// readers and by keyboard.
function FlowList({ title, items, total, onOpen, money, t }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          {t('cashflow.nothingHere')}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--border)]">
          {items.map((c) => {
            const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0;
            const content = (
              <>
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 rounded-full flex-shrink-0"
                    style={{ background: c.color }}
                  />
                  <span className="truncate text-[var(--foreground)]">
                    {c.name}
                  </span>
                </span>
                <span className="flex items-center gap-3 flex-shrink-0 tabular-nums">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {pct}%
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {money(c.amount)}
                  </span>
                </span>
              </>
            );
            return (
              <li key={`${c.id ?? c.name}`}>
                {c.id ? (
                  <button
                    type="button"
                    onClick={() => onOpen(c)}
                    className="w-full flex items-center justify-between gap-3 min-h-11 sm:min-h-0 py-2 text-sm text-left rounded-md cursor-pointer hover:bg-[var(--muted)] active:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    {content}
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-3 py-2 text-sm">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Cashflow() {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [current, setCurrent] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [status, setStatus] = useState('loading');
  const [chartRef, chartWidth] = useWidth();

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    Promise.all([
      api.get('/stats/summary', { params: { period: periodOf(month) } }),
      api.get('/stats/summary', {
        params: { period: periodOf(shiftMonth(month, -1)) },
      }),
    ])
      .then(([cur, prev]) => {
        if (!alive) return;
        setCurrent(cur.data);
        setPrevious(prev.data);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [month]);

  const labels = useMemo(
    () => ({
      flow: t('cashflow.flowNode'),
      savings: t('cashflow.savingsNode'),
      deficit: t('cashflow.deficitNode'),
      otherIncome: t('cashflow.otherIncome'),
      otherExpense: t('cashflow.otherExpense'),
      uncategorized: t('cashflow.uncategorized'),
    }),
    [t],
  );
  const flow = useMemo(
    () => (current ? buildCashflow(current, labels) : null),
    [current, labels],
  );
  const prevNet = previous
    ? (previous.totals?.income ?? 0) - (previous.totals?.expense ?? 0)
    : null;
  const rate = flow ? savingsRate(flow.income, flow.expense) : null;
  const prevMonthName = shiftMonth(month, -1).toLocaleDateString(intlLocale(), {
    month: 'long',
  });

  const openCategory = (node) => {
    if (!node.id) return;
    navigate(
      `/transactions/add?categoryId=${node.id}&period=${periodOf(month)}`,
    );
  };

  const showLabels = chartWidth >= LABELS_MIN_WIDTH;
  const sideMargin = showLabels ? 190 : 8;

  return (
    <div className="max-w-6xl mx-auto p-4 pb-12 space-y-5">
      <PageHeader
        title={t('cashflow.title')}
        subtitle={t('cashflow.subtitle')}
        actions={<MonthStepper value={month} onChange={setMonth} />}
      />

      {status === 'error' && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-5 text-sm text-rose-800 dark:text-rose-300">
          {t('cashflow.loadFailed')}
        </div>
      )}

      {status !== 'error' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label={t('cashflow.netFlow')}
            value={
              status === 'loading' || !flow ? '…' : signedMoney(flow.net, money)
            }
            tone={
              flow && flow.net > 0
                ? 'good'
                : flow && flow.net < 0
                  ? 'bad'
                  : null
            }
            detail={
              flow && prevNet !== null
                ? t('cashflow.vsPrevious', {
                    amount: signedMoney(flow.net - prevNet, money),
                    month: prevMonthName,
                  })
                : null
            }
          />
          <StatCard
            label={t('cashflow.savingsRate')}
            value={
              status === 'loading' || !flow
                ? '…'
                : rate === null
                  ? '—'
                  : `${rate}%`
            }
            detail={
              !flow
                ? null
                : flow.income <= 0
                  ? t('cashflow.noIncome')
                  : flow.expense > flow.income
                    ? t('cashflow.overspent')
                    : t('cashflow.rateHint')
            }
          />
        </div>
      )}

      {status !== 'error' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {t('cashflow.diagramTitle')}
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {t('cashflow.diagramSub')}
          </p>
          <div ref={chartRef} className="mt-4 w-full">
            {status === 'loading' && (
              <div
                className="animate-pulse motion-reduce:animate-none rounded-xl bg-[var(--muted)]"
                style={{ height: chartHeight(showLabels) }}
              />
            )}
            {status === 'ready' && flow?.empty && (
              <div
                className="flex items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--muted-foreground)] text-center px-6"
                style={{ height: 200 }}
              >
                {t('cashflow.empty')}
              </div>
            )}
            {status === 'ready' && flow && !flow.empty && chartWidth > 0 && (
              <Sankey
                width={chartWidth}
                height={chartHeight(showLabels)}
                data={{ nodes: flow.nodes, links: flow.links }}
                nodeWidth={12}
                nodePadding={18}
                margin={{
                  top: 8,
                  bottom: 8,
                  left: sideMargin,
                  right: sideMargin,
                }}
                link={<FlowLink />}
                node={
                  <FlowNode
                    showLabels={showLabels}
                    onOpen={openCategory}
                    money={money}
                  />
                }
              >
                <Tooltip content={<FlowTooltip money={money} />} />
              </Sankey>
            )}
          </div>
        </div>
      )}

      {status === 'ready' && flow && !flow.empty && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FlowList
            title={t('cashflow.incomeList')}
            items={flow.sources}
            total={flow.income + (flow.net < 0 ? -flow.net : 0)}
            onOpen={openCategory}
            money={money}
            t={t}
          />
          <FlowList
            title={t('cashflow.expenseList')}
            items={flow.targets}
            total={Math.max(flow.income, flow.expense)}
            onOpen={openCategory}
            money={money}
            t={t}
          />
        </div>
      )}
    </div>
  );
}
