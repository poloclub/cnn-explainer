import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const dictSource = await readFile(new URL('src/locales/zh-CN.js', root), 'utf8');
const dictUrl = 'data:text/javascript;base64,' + Buffer.from(dictSource).toString('base64');
const source = (await readFile(new URL('src/i18n.js', root), 'utf8')).replace("'./locales/zh-CN.js'", JSON.stringify(dictUrl));
let serial=0;
async function load(search) {
  globalThis.window={location:{search,href:'http://localhost:3000/?view=cnn'+search.replace('?','&')+'#article-relu',assign(url){this.assigned=url;}}};
  globalThis.document={documentElement:{}};
  return import('data:text/javascript;base64,'+Buffer.from(source+`\n// ${serial++}`).toString('base64'));
}
for (const search of ['', '?lang=en', '?lang=fr', '?lang=zh-TW']) {
 const m=await load(search); assert.equal(m.locale,'en');assert.equal(m.t('Convolution'),'Convolution');assert.equal(document.documentElement.lang,'en');
}
const m=await load('?lang=zh-CN');assert.equal(m.locale,'zh-CN');assert.equal(m.t('Convolution'),'卷积');assert.equal(m.t('untranslated'),'untranslated');assert.equal(m.t('toString'),'toString');assert.equal(m.layerLabel('conv_1_1'),'卷积_1_1');assert.equal(m.layerLabel('max_pool_2'),'最大池化_2');assert.equal(document.documentElement.lang,'zh-CN');
m.changeLocale('en');let u=new URL(window.location.assigned);assert.equal(u.searchParams.get('view'),'cnn');assert.equal(u.searchParams.has('lang'),false);assert.equal(u.hash,'#article-relu');
m.changeLocale('zh-CN');u=new URL(window.location.assigned);assert.equal(u.searchParams.get('lang'),'zh-CN');assert.equal(u.hash,'#article-relu');
const {default:dict}=await import(dictUrl);
for(const v of Object.values(dict)) assert.equal(typeof v,'string');
console.log('PASS: English default, unsupported locales, Chinese labels, fallback, document language, and locale switching with query/hash preservation.');
