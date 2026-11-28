// Проверка данных схемы продвижения: node scripts/proverka_skhemy.js
// Ищет ссылки на несуществующие штрафы и площадки, пустые поля и неизвестные уровни риска.
// Код выхода 1, если есть ошибки.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = path.join(__dirname, '..', 'site', 'data.js');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
const ytfile = path.join(__dirname, '..', 'site', 'youtube-funnels.js');
vm.runInNewContext(fs.readFileSync(ytfile, 'utf8'), ctx, { filename: ytfile });
const tgfile = path.join(__dirname, '..', 'site', 'telegram-funnels.js');
vm.runInNewContext(fs.readFileSync(tgfile, 'utf8'), ctx, { filename: tgfile });
const p0file = path.join(__dirname, '..', 'site', 'p0-legal-review.js');
vm.runInNewContext(fs.readFileSync(p0file, 'utf8'), ctx, { filename: p0file });
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
const mfile = path.join(__dirname, '..', 'site', 'markirovka.js');
const mctx = { window: {} };
vm.runInNewContext(fs.readFileSync(mfile, 'utf8'), mctx, { filename: mfile });
const M = mctx.window.MARK;
for (const p of M.platforms) if (!(D.platforms || {})[p.id]) err.push(`маркировка: площадки «${p.id}» нет в platforms`);
for (const fo of D.forms) if (!M.ordData[fo.id] && !M.ordData[fo.col]) err.push(`маркировка: нет данных для ОРД формы ${fo.id}`);
walk(M, 'MARK');

// Регрессия: TikTok-варианты, окончания и одноэкранное переключение режимов.
for (const name of ['instagram-legal.js','consult-legal.js','route-matrix.js','card-help.js','goal1-copy.js','desktop-board.js']) {
  const filename = path.join(__dirname, '..', 'site', name);
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), ctx, { filename });
}
const telegram = D.start.book.find(x=>x.id==='telegram');
const telegramIDs=['tg-own-info','tg-sample','tg-independent','tg-gift','tg-barter','tg-affiliate','tg-mutual'];
for(const id of telegramIDs){
  const n=telegram?.children?.find(x=>x.id===id);
  if(!n){err.push('Telegram: отсутствует '+id);continue;}
  const method=ctx.window.Goal1Copy.methods[id];
  if(method?.examples?.length!==2)err.push('Telegram: нет двух примеров '+id);
  if(!D.routeMatrix.rows.some(x=>x.method===id))err.push('Telegram: отсутствует маршрут '+id);
  for(const dest of n.dest||[])if(!D.bookPlaces[dest])err.push('Telegram: нет назначения '+id+'/'+dest);
}
if(telegram?.children?.find(x=>x.id==='tg-ads')?.dest?.includes('site'))err.push('Официальный Telegram Ads не должен вести напрямую на сайт');
if(!telegram?.children?.find(x=>x.id==='tg-sample')?.sample)err.push('Telegram: бесплатный фрагмент без флага');
if(!telegram?.children?.find(x=>x.id==='tg-gift')?.uncommitted)err.push('Telegram: подарок должен завершаться без обязательной публикации');
if(telegram?.children?.find(x=>x.id==='tg-vpn')?.saferGoto)err.push('Telegram: реклама VPN ошибочно предлагает сменить площадку');
for (const pl of ['youtube','tiktok'])for(const n of D.start.book.find(x=>x.id===pl)?.children||[])
  if(/^[YТ][1-5] · /.test(n.name))err.push('Не удалён служебный префикс '+n.id+': '+n.name);
const tik = D.start.book.find(x => x.id === 'tiktok');
const needed = ['tt-direct', 'tt-chat', 'tt-sample', 'tt-independent', 'tt-gift-independent', 'tt-barter'];
for (const id of needed) {
  const n = tik.children.find(x => x.id === id);
  if (!n) { err.push('TikTok: нет карточки ' + id); continue; }
  if (!D.routeMatrix.rows.some(x => x.method === id)) err.push('TikTok: нет маршрута ' + id);
  if (!ctx.window.Goal1Copy.methods[id]) err.push('TikTok: нет парных примеров ' + id);
  for (const dest of n.dest || []) if (!D.bookPlaces[dest]) err.push('TikTok ' + id + ': нет назначения ' + dest);
}
for (const [mode, id] of [['ordinary','tt-direct'], ['ordinary','tt-gift-independent'],['risk','tt-barter'],['risk','tt-blogger']]) {
  const p = ctx.window.DesktopBoard.platforms(D.start.book, mode, 'book').find(x => x.id === 'tiktok');
  if (!p?.children?.some(x => x.id === id)) err.push('TikTok ' + mode + ': не показан ' + id);
}
if (!tik.children.find(x=>x.id==='tt-sample')?.sample) err.push('TikTok: бесплатный фрагмент не включается на своём пути');

const youtube = D.start.book.find(x => x.id === 'youtube');
const youtubeIDs = [
  'yt-expert','yt-own-info','yt-desc','yt-sample','yt-independent','yt-gift',
  'yt-barter','yt-blogger','yt-affiliate','yt-sponsor','yt-shorts',
  'yt-move','book-yt-tg','yt-vpn'
];
for (const id of youtubeIDs) {
  const n = youtube?.children?.find(x => x.id === id);
  if (!n) { err.push('YouTube: нет карточки ' + id); continue; }
  if (!D.routeMatrix.rows.some(x => x.method === id)) err.push('YouTube: нет окончания ' + id);
  const c = ctx.window.Goal1Copy.methods[id];
  if (!c?.examples || c.examples.length !== 2) err.push('YouTube: нет двух примеров ' + id);
  for (const dest of n.dest || []) if (!D.bookPlaces[dest]) err.push('YouTube ' + id + ': нет назначения ' + dest);
}
for (const [mode,id] of [
  ['ordinary','yt-expert'],['ordinary','yt-own-info'],['ordinary','yt-sample'],
  ['ordinary','yt-independent'],['ordinary','yt-gift'],['ordinary','yt-shorts'],
  ['risk','yt-desc'],['risk','yt-barter'],['risk','yt-blogger'],
  ['risk','yt-affiliate'],['risk','yt-sponsor'],['risk','yt-vpn']
]) {
  const p = ctx.window.DesktopBoard.platforms(D.start.book, mode, 'book').find(x => x.id === 'youtube');
  if (!p?.children?.some(x => x.id === id)) err.push('YouTube: неверный режим '+mode+' для '+id);
}
if (!youtube?.children?.find(x=>x.id==='yt-sample')?.sample) err.push('YouTube: не включается фрагмент');
if (!youtube?.children?.find(x=>x.id==='yt-gift')?.uncommitted) err.push('YouTube: подарок ошибочно обещает обзор');
if (youtube?.children?.find(x=>x.id==='yt-vpn')?.saferGoto) err.push('YouTube: реклама VPN не должна вести к простому копированию ролика');
if (!youtube?.children?.find(x=>x.id==='yt-shorts')?.details.includes('некликабельны')) err.push('YouTube: нет проверки некликабельности Shorts URL');
if (youtube?.children?.find(x=>x.id==='book-yt-tg')?.risk !== 'g') err.push('YouTube: нейтральная ссылка ошибочно отмечена как реклама');

if (!tik.children.find(x=>x.id==='tt-gift-independent')?.uncommitted) err.push('TikTok: подарок без условий должен завершаться без обещания обзора');
// Единая схема: все цвета сохраняются, режимы не скрывают карточки.
const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const inline = /<script>\s*([\s\S]*?)<\/script>/.exec(html);
if (!inline) err.push('index.html: нет кода интерфейса');
else { try { new vm.Script(inline[1]); } catch (e) { err.push('index.html: ошибка синтаксиса '+e.message); } }
if (!html.includes('data-route-mode="all"')) err.push('Схема не переведена в единый режим');
if (!html.includes("map(resolve), 'all', S.goal")) err.push('Неверный набор карточек');
if (html.includes('id="route-mode"')) err.push('Остался переключатель «Варианты связки»');
if (html.includes('scrollToStep(')) err.push('Осталась автопрокрутка выбора');
if (!html.includes('S.path = S.path.slice(0, num - 1)')) err.push('Кнопка этапа не возвращает к выбору');
for(const module of ['youtube-funnels.js','telegram-funnels.js','desktop-board.js']) {
  if(!html.includes('<script src="'+module+'"></script>')) err.push('Не подключён модуль '+module);
}
const riskAlias = fs.readFileSync(path.join(__dirname,'..','site','risk.html'),'utf8');
if(!riskAlias.includes("window.location.replace('index.html')"))err.push('Старый risk.html не перенаправляет в общую схему');
for(const [goal,raw] of Object.entries(D.start)){
  const nodes=raw.map(n=>n.place?Object.assign({id:n.id},D.places[n.place]):n);
  const all=ctx.window.DesktopBoard.platforms(nodes,'all',goal);
  const ids=xs=>xs.flatMap(p=>p.children?p.children.map(n=>p.id+'/'+n.id):[p.id]);
  if(JSON.stringify(ids(all).sort())!==JSON.stringify(ids(nodes).sort()))err.push('Единая схема потеряла карточки '+goal);
  const order=xs=>xs.every((n,i)=>i===0||({r:0,y:1,g:2}[xs[i-1].risk]??3)<=({r:0,y:1,g:2}[n.risk]??3));
  if(!order(all))err.push('Площадки идут не в порядке риска '+goal);
  for(const p of all)if(p.children&&!order(p.children))err.push('Способы идут не в порядке риска '+goal+'/'+p.id);
}

const verify = Object.entries(D.fines).filter(([, f]) => f.verify).map(([k]) => k);
console.log(`Схема: ${uzly} узлов, ${Object.keys(D.places).length} площадок, ${Object.keys(D.fines).length} штрафов, на сверке: ${verify.join(', ') || 'нет'}`);
if (err.length) { console.log('Ошибки:\n- ' + err.join('\n- ')); process.exit(1); }
console.log('Ошибок в данных схемы нет.');
