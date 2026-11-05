import zhCN from './locales/zh-CN.js';
import ja from './locales/ja.js';
import de from './locales/de.js';

const dictionaries = { 'zh-CN': zhCN, ja, de };
export const languages = [
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'ja', name: '日本語' },
  { code: 'de', name: 'Deutsch' }
];
const isTranslatedLocale = code => Object.prototype.hasOwnProperty.call(dictionaries, code);

// A URL locale keeps translated links shareable. Reloading also rebuilds D3 labels.
export function getLocale(search = '') {
  const requested = new URLSearchParams(search).get('lang');
  return isTranslatedLocale(requested) ? requested : 'en';
}
export const locale = getLocale(typeof window === 'undefined' ? '' : window.location.search);
const dictionary = dictionaries[locale];
export const t = text => dictionary && Object.prototype.hasOwnProperty.call(dictionary, text)
  ? dictionary[text] : text;
export const layerLabel = name => locale !== 'en'
  ? name.replace(/^conv/, t('conv')).replace(/^max_pool/, t('max_pool')).replace(/^input$/, t('input')).replace(/^output$/, t('output'))
  : name;
export function changeLocale(nextLocale) {
  const url = new URL(window.location.href);
  if (isTranslatedLocale(nextLocale)) url.searchParams.set('lang', nextLocale);
  else url.searchParams.delete('lang');
  window.location.assign(url.href);
}
if (typeof document !== 'undefined') document.documentElement.lang = locale;
