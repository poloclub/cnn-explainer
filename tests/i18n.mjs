import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const dataUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
let source = await readFile(new URL('src/i18n.js', root), 'utf8');
const dictionaries = {};
for (const code of ['zh-CN', 'ja', 'de']) {
  const url = dataUrl(await readFile(new URL(`src/locales/${code}.js`, root), 'utf8'));
  dictionaries[code] = (await import(url)).default;
  source = source.replace(`'./locales/${code}.js'`, JSON.stringify(url));
}
let serial = 0;
async function load(search) {
  const currentUrl = new URL('http://localhost:3000/?view=cnn#article-relu');
  const lang = new URLSearchParams(search).get('lang');
  if (lang !== null) currentUrl.searchParams.set('lang', lang);
  globalThis.window = { location: {
    search, href: currentUrl.href, assign(url) { this.assigned = url; }
  } };
  globalThis.document = { documentElement: {} };
  return import(dataUrl(source + `\n// ${serial++}`));
}
for (const search of ['', '?lang=en', '?lang=fr', '?lang=zh-TW', '?lang=toString', '?lang=__proto__']) {
  const m = await load(search);
  assert.equal(m.locale, 'en');
  assert.equal(m.t('Convolution'), 'Convolution');
  assert.equal(document.documentElement.lang, 'en');
}
const expected = { 'zh-CN': '卷积', ja: '畳み込み', de: 'Faltung' };
for (const [code, translation] of Object.entries(expected)) {
  const m = await load(`?lang=${code}`);
  assert.equal(m.locale, code);
  assert.equal(m.t('Convolution'), translation);
  assert.equal(m.t('untranslated'), 'untranslated');
  assert.equal(m.t('toString'), 'toString');
  assert.equal(document.documentElement.lang, code);
  assert.equal(m.layerLabel('conv_1_1'), `${dictionaries[code].conv}_1_1`);
  assert.equal(m.layerLabel('max_pool_2'), `${dictionaries[code].max_pool}_2`);
  assert.deepEqual(m.languages.map(language => language.code), ['en', 'zh-CN', 'ja', 'de']);
  for (const next of ['en', 'zh-CN', 'ja', 'de', 'unsupported', 'toString']) {
    m.changeLocale(next);
    const url = new URL(window.location.assigned);
    assert.equal(url.searchParams.get('lang'), Object.hasOwn(expected, next) ? next : null);
    assert.equal(url.searchParams.get('view'), 'cnn');
    assert.equal(url.hash, '#article-relu');
  }
  assert.deepEqual(Object.keys(dictionaries[code]).sort(), Object.keys(dictionaries['zh-CN']).sort());
  for (const value of Object.values(dictionaries[code])) assert.equal(typeof value, 'string');
}
// Every article locale must retain the navigation targets, citations, illustrations,
// equations and interactive components; translations must not break their wiring.
const article = await readFile(new URL('src/article/Article.svelte', root), 'utf8');
const bodies = [...article.matchAll(/<body>([\s\S]*?)<\/body>/g)].map(match => match[1]);
assert.equal(bodies.length, 4);
const matches = (body, expression) => [...body.matchAll(expression)].map(match => match[1]).sort();
for (const body of bodies.slice(0, -1)) {
  for (const expression of [
    /id=['"](article-[^'"]+)['"]/g,
    /href="([^"]+)"/g,
    /src="([^"]+)"/g,
    /currentPlayer\.play\((\d+)\)/g,
    /\{((?:relu|softmax)Equation)\}/g
  ]) assert.deepEqual(matches(body, expression), matches(bodies.at(-1), expression));
  assert.equal((body.match(/<HyperparameterView\s*\//g) || []).length, 1);
  assert.equal((body.match(/<Youtube /g) || []).length, 1);
}
console.log('PASS: four locales, English fallback, complete dictionary keys, safe locale selection, URL preservation, and article anchors/assets/citations/interactions.');
