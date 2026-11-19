// Проверка данных схемы продвижения: node scripts/proverka_skhemy.js
// Ищет ссылки на несуществующие штрафы и площадки, пустые поля и неизвестные уровни риска.
// Код выхода 1, если есть ошибки.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = path.join(__dirname, '..', 'site', 'data.js');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
const D = ctx.window.SCHEMA;
const err = [];
const forms = D.forms.map((f) => f.id);
const risks = ['g', 'y', 'r'];

for (const [k, f] of Object.entries(D.fines)) {
  for (const fm of forms) if (!f[fm]) err.push(`штраф ${k}: нет суммы для формы ${fm}`);
  if (!f.title || !f.law) err.push(`штраф ${k}: нет title или law`);
}
const fineRefs = (where, list) => (list || []).forEach((k) => { if (!D.fines[k]) err.push(`${where}: нет штрафа «${k}»`); });

for (const [k, p] of Object.entries(D.places)) {
  if (!risks.includes(p.risk)) err.push(`площадка ${k}: risk «${p.risk}»`);
  for (const f of ['name', 'short', 'details']) if (!p[f]) err.push(`площадка ${k}: нет ${f}`);
  if (!p.can || !p.cannot) err.push(`площадка ${k}: нет can или cannot`);
  fineRefs(`площадка ${k}`, p.fines);
  (p.check || []).forEach((c) => (c.forms || []).forEach((fm) => { if (!forms.includes(fm)) err.push(`площадка ${k}: форма «${fm}» в check`); }));
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
const verify = Object.entries(D.fines).filter(([, f]) => f.verify).map(([k]) => k);
console.log(`Схема: ${uzly} узлов, ${Object.keys(D.places).length} площадок, ${Object.keys(D.fines).length} штрафов, на сверке: ${verify.join(', ') || 'нет'}`);
if (err.length) { console.log('Ошибки:\n- ' + err.join('\n- ')); process.exit(1); }
console.log('Ошибок в данных схемы нет.');
