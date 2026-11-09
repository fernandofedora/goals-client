import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../api';
import PageHeader from '../components/ui/page-header';
import TransactionForm from '../components/TransactionForm';
import TransactionHistory from '../components/TransactionHistory';

export default function AddTransaction() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const [catRes, cardRes, accRes] = await Promise.all([
        api.get('/categories'),
        api.get('/cards'),
        api.get('/accounts'),
      ]);
      setCategories(catRes.data);
      setCards(cardRes.data);
      setAccounts(accRes.data);
    } catch {
      toast.error(t('addTransaction.loadFailed'));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">
      <PageHeader
        title={t('nav.transactions')}
        subtitle={t('addTransaction.pageSubtitle')}
      />

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold tracking-tight">
            {t('addTransaction.title')}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('addTransaction.subtitle')}
          </p>
        </div>
        <TransactionForm
          categories={categories}
          cards={cards}
          accounts={accounts}
          onCreated={() => setRefreshKey((n) => n + 1)}
        />
      </section>

      <TransactionHistory
        categories={categories}
        cards={cards}
        accounts={accounts}
        refreshKey={refreshKey}
      />
    </div>
  );
}
