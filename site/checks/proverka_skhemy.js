// Проверка данных схемы продвижения: node scripts/proverka_skhemy.js
// Ищет ссылки на несуществующие штрафы и площадки, пустые поля и неизвестные уровни риска.
// Код выхода 1, если есть ошибки.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = path.join(__dirname, '..', 'data.js');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
const D = ctx.window.SCHEMA;
const err = [];
const forms = D.forms.map((f) => f.id);
const tags = new Set(D.forms.flatMap((f) => f.tags || [f.id]));
D.forms.forEach((f) => { if (!['self', 'ip', 'ooo'].includes(f.col)) err.push(`форма ${f.id}: колонка col «${f.col}» не self, ip или ooo`); if (!(f.id in D.formWho)) err.push(`форма ${f.id}: нет подписи в formWho`); });
const risks = ['g', 'y', 'r'];

for (const [k, f] of Object.entries(D.fines)) {
  for (const fo of D.forms) if (!f[fo.id] && !f[fo.col]) err.push(`штраф ${k}: нет суммы для формы ${fo.id}`);
  if (!f.title || !f.law) err.push(`штраф ${k}: нет title или law`);
}
const fineRefs = (where, list) => (list || []).forEach((k) => { if (!D.fines[k]) err.push(`${where}: нет штрафа «${k}»`); });

for (const [k, p] of Object.entries(D.places)) {
  if (!risks.includes(p.risk)) err.push(`площадка ${k}: risk «${p.risk}»`);
  for (const f of ['name', 'short', 'details']) if (!p[f]) err.push(`площадка ${k}: нет ${f}`);
  if (!p.can || !p.cannot) err.push(`площадка ${k}: нет can или cannot`);
  fineRefs(`площадка ${k}`, p.fines);
  (p.check || []).forEach((c) => (c.forms || []).forEach((fm) => { if (!tags.has(fm)) err.push(`площадка ${k}: форма «${fm}» в check`); }));
}

let uzly = 0;
for (const [goal, list] of Object.entries(D.start)) {
  if (!D.goals.some((g) => g.id === goal)) err.push(`start.${goal}: нет такой цели`);
  for (const n of list) {
    uzly++;
    if (n.place) { if (!D.places[n.place]) err.push(`start.${goal}.${n.id}: нет площадки «${n.place}»`); continue; }
    if (!risks.includes(n.risk)) err.push(`${n.id}: risk «${n.risk}»`);
    fineRefs(n.id, n.fines);
    for (const c of n.children || []) {
      uzly++;
      if (!risks.includes(c.risk)) err.push(`${n.id}.${c.id}: risk «${c.risk}»`);
      fineRefs(`${n.id}.${c.id}`, c.fines);
      if (c.dest) {
        c.dest.forEach((k) => { if (!D.places[k]) err.push(`${n.id}.${c.id}: нет площадки «${k}»`); });
        if (!c.here || !c.here.can || !c.here.cannot) err.push(`${n.id}.${c.id}: нет here.can или here.cannot`);
      } else if (!c.why || !c.safer) {
        err.push(`${n.id}.${c.id}: без dest нужны why и safer`);
      } else if (c.saferGoto && !n.children.some((x) => x.id === c.saferGoto && x.dest)) {
        err.push(`${n.id}.${c.id}: saferGoto «${c.saferGoto}» не ведёт на безопасную связку того же шага`);
      }
    }
  }
}
// Цели, повторы идентификаторов, заголовки шагов
for (const g of D.goals) {
  if (!D.start[g.id] || !D.start[g.id].length) err.push(`цель ${g.id}: нет стартовых блоков`);
  const ids = (D.start[g.id] || []).map((n) => n.id);
  ids.filter((x, i) => ids.indexOf(x) !== i).forEach((x) => err.push(`цель ${g.id}: повтор стартового блока «${x}»`));
  for (const n of D.start[g.id] || []) {
    if (n.children && !n.nextTitle) err.push(`${g.id}.${n.id}: нет nextTitle`);
    const cids = (n.children || []).map((c) => c.id);
    cids.filter((x, i) => cids.indexOf(x) !== i).forEach((x) => err.push(`${g.id}.${n.id}: повтор связки «${x}»`));
  }
}
// Площадки стартового шага
for (const [k, p] of Object.entries(D.platforms || {})) {
  if (!risks.includes(p.risk)) err.push(`platforms.${k}: risk «${p.risk}»`);
  fineRefs(`platforms.${k}`, p.fines);
}
// Пояснения и календарь
for (const x of D.explain) if (!x.id || !x.title || !x.basis) err.push(`пояснение ${x.id || '?'}: нет id, title или basis`);
for (const c of D.calendar || []) {
  if (!c.group || !c.when || !c.what || !c.law) err.push(`календарь «${c.when || '?'}»: пустое поле`);
  (c.forms || []).forEach((fm) => { if (fm !== 'all' && !tags.has(fm)) err.push(`календарь «${c.when}»: форма «${fm}»`); });
}
// Пустые строки, undefined и «то же» во всех текстах
const walk = (v, where) => {
  if (typeof v === 'string') { if (!v.trim() || v.includes('undefined')) err.push(`${where}: пустой текст или undefined`); if (/^то же/.test(v)) err.push(`${where}: «то же» без расшифровки`); }
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, where + '[' + i + ']'));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, where + '.' + k);
};
walk(D, 'SCHEMA');
// Страница «Маркировка по шагам»
const mfile = path.join(__dirname, '..', 'markirovka.js');
const mctx = { window: {} };
vm.runInNewContext(fs.readFileSync(mfile, 'utf8'), mctx, { filename: mfile });
const M = mctx.window.MARK;
for (const p of M.platforms) if (!(D.platforms || {})[p.id]) err.push(`маркировка: площадки «${p.id}» нет в platforms`);
for (const fo of D.forms) if (!M.ordData[fo.id] && !M.ordData[fo.col]) err.push(`маркировка: нет данных для ОРД формы ${fo.id}`);
walk(M, 'MARK');

const verify = Object.entries(D.fines).filter(([, f]) => f.verify).map(([k]) => k);
console.log(`Схема: ${uzly} узлов, ${Object.keys(D.places).length} площадок, ${Object.keys(D.fines).length} штрафов, на сверке: ${verify.join(', ') || 'нет'}`);
if (err.length) { console.log('Ошибки:\n- ' + err.join('\n- ')); process.exit(1); }
console.log('Ошибок в данных схемы нет.');

