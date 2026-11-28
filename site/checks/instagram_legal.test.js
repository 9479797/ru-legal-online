/* Регрессионная проверка только цепочек Instagram, 28.11.2026. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../', c={window:{}};
const load=f=>vm.runInNewContext(fs.readFileSync(root+f,'utf8'),c,{filename:f});
load('data.js');
const old=JSON.parse(JSON.stringify(c.window.SCHEMA));
load('instagram-legal.js');
const D=c.window.SCHEMA;
assert.equal(D.platforms.instagram.risk,'y');
assert.deepEqual(Array.from(D.platforms.instagram.fines),[]);
assert.equal(D.instagramLegal.checked,'28.11.2026');
for(const goal of Object.keys(old.start)) {
  const before=old.start[goal].filter(x=>x.id!=='instagram');
  const after=D.start[goal].filter(x=>x.id!=='instagram');
  assert.equal(JSON.stringify(after),JSON.stringify(before),'Чужая площадка изменена: '+goal);
}
let ordinary=0,banned=0;
for(const [goal,starts] of Object.entries(D.start)) {
  const p=starts.find(x=>x.id==='instagram');
  if(!p)continue;
  assert.equal(new Set(p.children.map(x=>x.id)).size,p.children.length,'Повтор ID: '+goal);
  if(goal==='adsell') {assert.equal(p.risk,'r');continue;}
  assert.equal(p.risk,'y','Риск всей площадки: '+goal);
  const info=p.children.find(x=>x.id==='ig-info'||/-ig-info$/.test(x.id));
  assert(info&&info.risk==='y'&&info.dest.length,'Нет маршрута собственных сведений: '+goal);
  assert(info.details.includes('Цена')||info.details.includes('цена'),'Нет цены в пояснении: '+goal);
  assert(!info.fines.length,'Автоматический штраф за информирование: '+goal);
  ordinary++;
  const red=p.children.filter(x=>x.risk==='r');
  assert(red.length,'Нет запрета самостоятельной рекламы: '+goal);
  banned+=red.length;
}
const book=D.start.book.find(x=>x.id==='instagram');
for(const id of ['author','bio','source','dm','tglink']) {
 const n=book.children.find(x=>x.id===id);
 assert(n&&!n.fines.includes('meta_ad'),'Автоматический штраф за информационный маршрут '+id);
}
const guide=book.children.find(x=>x.id==='ig-info').guide;
assert(guide&&guide.examples.length===2,'Не хватает примеров');
load('route-matrix.js');load('book-ui.js');load('card-help.js');load('goal1-copy.js');load('desktop-board.js');
assert.equal(D.routeMatrix.rows.length,65);
assert.equal(Object.keys(c.window.Goal1Copy.methods).length,65);
for(const [goal,starts] of Object.entries(D.start)) {
 const p=starts.find(x=>x.id==='instagram');if(!p)continue;
 const normal=c.window.DesktopBoard.platforms(starts,'ordinary').find(x=>x.id==='instagram');
 const risk=c.window.DesktopBoard.platforms(starts,'risk').find(x=>x.id==='instagram');
 const all=[...(normal?.children||[]),...(risk?.children||[])];
 assert.equal(all.length,p.children.length,'Потеря карточки при разбиении: '+goal);
 assert.equal(new Set(all.map(x=>x.id)).size,all.length,'Дублирование карточки: '+goal);
 if(goal!=='adsell')assert(normal.children.some(x=>/-ig-info$/.test(x.id)||x.id==='ig-info'),'Не виден инфомаршрут: '+goal);
}
const S={goal:'book',scope:'promotion',form:'ip',format:'file',publisher:'instagram',path:[]};
const ui=c.window.BookUI.create({D,S,esc:s=>String(s),curForm:()=>D.forms.find(f=>f.id==='ip'),saveBar:()=>''});
const bloggers=D.start.book.find(x=>x.id==='bloggers');
assert(ui.publicationInfo(bloggers,bloggers.children.find(n=>n.id==='bl-paid')).blocked,'Платная реклама блогера разрешена');
assert(ui.publicationInfo(bloggers,bloggers.children.find(n=>n.id==='bl-barter')).blocked,'Бартерная реклама блогера разрешена');
assert(ui.publicationInfo(bloggers,bloggers.children.find(n=>n.id==='bl-partner')).blocked,'Партнёрская реклама блогера разрешена');
const mutual=ui.publicationInfo(bloggers,bloggers.children.find(n=>n.id==='bl-mutual'));
assert(mutual.needsCheck&&!mutual.blocked,'Взаимное упоминание должно пройти проверку');
const index=fs.readFileSync(root+'index.html','utf8'),risk=fs.readFileSync(root+'risk.html','utf8');
for(const html of [index,risk]){
 const first=html.indexOf('src="data.js"'),legal=html.indexOf('src="instagram-legal.js"'),matrix=html.indexOf('src="route-matrix.js"');
 assert(first>=0&&first<legal&&legal<matrix,'Неверный порядок скриптов');
 for(const [,code] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(code);
}
const marking=fs.readFileSync(root+'markirovka.js','utf8');
assert(marking.includes('Обычная информация о товарах'),'Нет пояснения об информационных публикациях на странице маркировки');
console.log('Instagram: '+ordinary+' целей со справочными сообщениями, '+banned+' запрещённых сценариев; обе вкладки и 65 маршрутов первой цели сохранены.');
