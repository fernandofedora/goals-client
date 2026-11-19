import { useTranslation } from 'react-i18next';
import Input from '../ui/input';
import { useCurrency } from '../../context/CurrencyContext';
import { cn } from '../../lib/utils';

/**
 * Optional credit details of a card: limit, statement day and due day.
 * `Field` is the label wrapper of the form it sits in, so it matches its look.
 */
export default function CardCreditFields(props) {
  // Read from props: the lint setup only recognizes JSX components as variables.
  const { Field } = props;
  const { values, onChange, idPrefix = 'card', inputClassName } = props;
  const { t } = useTranslation();
  const { symbol } = useCurrency();
  const day = (key) => (e) =>
    onChange({ [key]: e.target.value.replace(/[^0-9]/g, '').slice(0, 2) });
  return (
    <>
      <Field id={`${idPrefix}-limit`} label={t('cardCredit.limit', { symbol })}>
        <Input
          id={`${idPrefix}-limit`}
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          placeholder={t('cardCredit.optional')}
          value={values.creditLimit ?? ''}
          onChange={(e) => onChange({ creditLimit: e.target.value })}
          className={inputClassName}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field
          id={`${idPrefix}-statement`}
          label={t('cardCredit.statementDay')}
        >
          <Input
            id={`${idPrefix}-statement`}
            inputMode="numeric"
            placeholder="1–31"
            value={values.statementDay ?? ''}
            onChange={day('statementDay')}
            className={cn('w-full', inputClassName)}
          />
        </Field>
        <Field id={`${idPrefix}-due`} label={t('cardCredit.dueDay')}>
          <Input
            id={`${idPrefix}-due`}
            inputMode="numeric"
            placeholder="1–31"
            value={values.dueDay ?? ''}
            onChange={day('dueDay')}
            className={cn('w-full', inputClassName)}
          />
        </Field>
      </div>
    </>
  );
}
