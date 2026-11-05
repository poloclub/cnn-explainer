import zhCN from './locales/zh-CN.js';

// A URL locale keeps translated links shareable. Reloading also rebuilds D3 labels.
export function getLocale(search = '') {
  return new URLSearchParams(search).get('lang') === 'zh-CN' ? 'zh-CN' : 'en';
}
export const locale = getLocale(typeof window === 'undefined' ? '' : window.location.search);
export const t = text => locale === 'zh-CN' && Object.prototype.hasOwnProperty.call(zhCN, text) ? zhCN[text] : text;
export const layerLabel = name => locale === 'zh-CN'
  ? name.replace(/^conv/, t('conv')).replace(/^max_pool/, t('max_pool')).replace(/^input$/, t('input')).replace(/^output$/, t('output'))
  : name;
export function changeLocale(nextLocale) {
  const url = new URL(window.location.href);
  if (nextLocale === 'zh-CN') url.searchParams.set('lang', 'zh-CN');
  else url.searchParams.delete('lang');
  window.location.assign(url.href);
}
if (typeof document !== 'undefined') document.documentElement.lang = locale;
