import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

// Landing page of the "stop sending it" link in emails. Works without a
// session: the link carries a signed token that the server checks.
export default function Unsubscribe() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [status, setStatus] = useState('working'); // working | done | error
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    api
      .post('/user/unsubscribe', {
        list: params.get('list'),
        u: params.get('u'),
        t: params.get('t'),
      })
      .then(() => setStatus('done'))
      .catch(() => setStatus('error'));
  }, [params]);

  const loggedIn = Boolean(localStorage.getItem('token'));

  return (
    <div className="max-w-md mx-auto mt-12 bg-white dark:bg-slate-800 shadow-lg rounded-xl p-8 text-center border border-transparent dark:border-slate-700">
      {status === 'working' && (
        <p className="text-gray-600 dark:text-gray-300" role="status">
          {t('unsubscribe.working')}
        </p>
      )}

      {status !== 'working' && (
        <div className="space-y-3" role="status">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {status === 'done'
              ? t('unsubscribe.doneTitle')
              : t('unsubscribe.errorTitle')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {status === 'done'
              ? t('unsubscribe.doneBody')
              : t('unsubscribe.errorBody')}
          </p>
          <Link
            to={loggedIn ? '/profile' : '/login'}
            className="inline-block mt-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {loggedIn ? t('unsubscribe.toProfile') : t('unsubscribe.toLogin')}
          </Link>
        </div>
      )}
    </div>
  );
}
