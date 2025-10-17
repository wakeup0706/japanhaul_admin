import {getRequestConfig} from 'next-intl/server';
import type {GetRequestConfigParams} from 'next-intl/server';
import en from './messages/en.json';
import ja from './messages/ja.json';

export default getRequestConfig(({locale}: GetRequestConfigParams) => {
  const supported = ['en', 'ja'] as const;
  const current = typeof locale === 'string' ? locale : 'en';
  const safeLocale = (supported as readonly string[]).includes(current) ? current : 'en';

  // Properly type the map to allow indexing with safeLocale
  const map: Record<string, typeof en> = { en, ja };
  const messages = map[safeLocale] || en;

  return {locale: safeLocale, messages};
});


