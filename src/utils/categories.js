/**
 * Picker options with every subcategory right under its parent. A child reads
 * "Luz (Hogar)": the name comes first so the native select's type-ahead still
 * finds it, and the parent stays visible.
 */
export function categoryOptions(categories) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const childrenOf = new Map();
  const tops = [];
  for (const c of categories) {
    if (c.parentId && byId.has(c.parentId)) {
      if (!childrenOf.has(c.parentId)) childrenOf.set(c.parentId, []);
      childrenOf.get(c.parentId).push(c);
    } else {
      tops.push(c);
    }
  }
  return tops.flatMap((parent) => [
    { id: parent.id, label: parent.name, category: parent },
    ...(childrenOf.get(parent.id) || []).map((child) => ({
      id: child.id,
      label: `${child.name} (${parent.name})`,
      category: child,
    })),
  ]);
}

/** Top-level categories, each with its subcategories, for grouped lists. */
export function categoryTree(categories) {
  const ids = new Set(categories.map((c) => c.id));
  return categories
    .filter((c) => !c.parentId || !ids.has(c.parentId))
    .map((parent) => ({
      ...parent,
      children: categories.filter((c) => c.parentId === parent.id),
    }));
}

/**
 * Categories a transaction of `type` can use. Transfer categories fit both
 * legs: the expense out of one account and the income into the other.
 */
export const categoriesForTxType = (categories, type) =>
  categories.filter((c) => c.type === type || c.type === 'transfer');

/** Lowercase and without accents, the way rules compare text. */
export const foldText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

// Words that show up in any bank statement line, so a rule on them would
// catch unrelated transactions.
const GENERIC_WORDS = new Set([
  'pago',
  'pagos',
  'compra',
  'compras',
  'cuota',
  'cargo',
  'abono',
  'deposito',
  'retiro',
  'transferencia',
  'transf',
  'debito',
  'credito',
  'tarjeta',
  'pos',
  'con',
  'por',
  'para',
  'del',
  'las',
  'los',
  'una',
  'payment',
  'purchase',
  'transfer',
  'card',
  'debit',
  'credit',
  'the',
  'and',
  'for',
  'from',
]);

/** First word of a description worth a rule: "PAGO UBER *TRIP 8812" → "uber". */
export const ruleKeyword = (description) =>
  foldText(description)
    .split(/[^a-z0-9ñ]+/)
    .find((w) => w.length >= 3 && !/^\d+$/.test(w) && !GENERIC_WORDS.has(w)) ||
  null;

/** Color a new category gets when the user doesn't pick one. */
export const DEFAULT_CATEGORY_COLOR = {
  expense: '#3b82f6',
  income: '#16a34a',
  transfer: '#64748b',
};

// Server error codes from /api/categories → messages under settings.categories.
const CATEGORY_ERROR_KEYS = {
  CATEGORY_HAS_CHILDREN: 'settings.categories.hasChildren',
  CATEGORY_IN_USE: 'settings.categories.inUse',
  CATEGORY_TOO_DEEP: 'settings.categories.tooDeep',
  CATEGORY_INVALID_PARENT: 'settings.categories.invalidParent',
  CATEGORY_INVALID_NAME: 'settings.categories.invalidName',
  CATEGORY_INVALID_TYPE: 'settings.categories.invalidType',
  CATEGORY_INVALID_COLOR: 'settings.categories.invalidColor',
};

/** i18n key for a failed /api/categories request. */
export const categoryErrorKey = (err, fallback) =>
  CATEGORY_ERROR_KEYS[err?.response?.data?.code] || fallback;
