/**
 * Active-language helpers for date/number formatting.
 *
 * The whole app used to hardcode a mix of 'es' and 'en' locales at every
 * `toLocaleString`/`toLocaleDateString` call site. These helpers read the
 * live i18next language instead, so every formatted date follows the user's
 * chosen language. Components that render dates already call `useTranslation()`,
 * so they re-render on `changeLanguage` and re-read these values.
 */
import i18n from '../i18n';
import { es, enUS } from 'react-day-picker/locale';

/** BCP-47 tag for Intl.* APIs (toLocaleString, toLocaleDateString, …). */
export function intlLocale() {
  return i18n.language?.startsWith('es') ? 'es' : 'en-US';
}

/** date-fns locale object for react-day-picker's `locale` prop. */
export function dayPickerLocale() {
  return i18n.language?.startsWith('es') ? es : enUS;
}
