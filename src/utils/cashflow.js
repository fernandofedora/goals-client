// Below this share of its side, a category folds into "Otros" so a month with
// many small categories still reads.
const OTHERS_SHARE = 0.03;
const OTHERS_COLOR = '#94a3b8';

const round2 = (n) => Math.round(n * 100) / 100;

/** Splits categories into the ones shown and one "Otros" bucket. */
function foldSmall(items, total, othersLabel) {
  const sorted = items
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const shown = [];
  let others = 0;
  for (const c of sorted) {
    if (total > 0 && c.amount / total < OTHERS_SHARE) others += c.amount;
    else shown.push(c);
  }
  // A lone small category stays itself: "Otros" with one member says nothing.
  if (others > 0 && sorted.length - shown.length === 1) {
    shown.push(sorted.find((c) => !shown.includes(c)));
    others = 0;
  }
  if (others > 0) {
    shown.push({
      id: null,
      name: othersLabel,
      color: OTHERS_COLOR,
      amount: others,
      isOthers: true,
    });
  }
  return shown;
}

/**
 * Sankey data for one period: income categories → middle node → expense
 * categories, plus savings (income left over) or a deficit source (spending
 * paid from earlier money), so both sides always balance.
 */
export function buildCashflow(summary, labels) {
  const income = summary?.totals?.income ?? 0;
  const expense = summary?.totals?.expense ?? 0;
  const net = round2(income - expense);

  const sources = foldSmall(
    (summary?.incomeCategories ?? []).map((c) => ({
      ...c,
      name: c.id ? c.name : labels.uncategorized,
    })),
    income,
    labels.otherIncome,
  );
  if (net < 0) {
    sources.push({
      id: null,
      name: labels.deficit,
      color: '#d97706',
      amount: -net,
      isDeficit: true,
    });
  }

  const targets = foldSmall(
    (summary?.categories ?? []).map((c) => ({
      ...c,
      name: c.id ? c.name : labels.uncategorized,
    })),
    expense,
    labels.otherExpense,
  );
  if (net > 0) {
    targets.push({
      id: null,
      name: labels.savings,
      color: '#059669',
      amount: net,
      isSavings: true,
    });
  }

  const nodes = [
    ...sources.map((c) => ({ ...c, side: 'in' })),
    {
      id: null,
      name: labels.flow,
      color: 'var(--primary)',
      amount: Math.max(income, expense),
      side: 'mid',
    },
    ...targets.map((c) => ({ ...c, side: 'out' })),
  ];
  const mid = sources.length;
  const links = [
    ...sources.map((c, i) => ({ source: i, target: mid, value: c.amount })),
    ...targets.map((c, i) => ({
      source: mid,
      target: mid + 1 + i,
      value: c.amount,
    })),
  ];

  return {
    income,
    expense,
    net,
    sources,
    targets,
    nodes,
    links,
    empty: income <= 0 && expense <= 0,
  };
}

/**
 * Share of income kept this period, 0–100. Null when it can't be a rate:
 * no income, or spending above income (the page says so in words instead of
 * printing a figure like −4946%).
 */
export function savingsRate(income, expense) {
  if (income <= 0 || expense > income) return null;
  return Math.round(((income - expense) / income) * 100);
}
