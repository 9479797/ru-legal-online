const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const boundary = source.indexOf('/* Локальная предлагаемая редакция');
assert(boundary > 0);
const run = text => { const c = {window:{}}; vm.runInNewContext(text,c); return c.window; };
const before = run(source.slice(0,boundary)).SCHEMA;
const afterWindow = run(source);
const after = afterWindow.SCHEMA;
assert.equal(after.goals.length,10);
assert.equal(after.forms.length,6);
for (const id of before.goals.map(g=>g.id).filter(id=>id!=='book')) assert.equal(JSON.stringify(after.start[id]),JSON.stringify(before.start[id]),'Изменилась другая цель: '+id);
for (const p of before.start.book) {
  const n = after.start.book.find(n=>n.id===p.id);
  assert(n,'Удалена площадка '+p.id);
  for (const c of p.children||[]) assert(n.children.some(x=>x.id===c.id),'Удалена связка '+c.id);
}
assert.equal(after.start.book.flatMap(p=>p.children||[]).length,64);
for (const [id,p] of Object.entries(after.bookPlaces)) {
  assert(after.places[id]); assert(p.can && p.cannot && p.check);
}
vm.runInNewContext(fs.readFileSync(path.join(root,'book-ui.js'),'utf8'),{window:afterWindow});
let cases=0;
for(const format of ['file','print']) for(const scope of ['sale']) for(const salePlace of ['site','vkshop','market','donut','tgbot']) for(const f of after.forms) {
  const S={format,scope,salePlace,form:f.id,sample:true};
  const ui=afterWindow.BookUI.create({D:after,S,esc:String,curForm:()=>f,saveBar:()=>''});
  const result=ui.summary();
  assert(!JSON.stringify(result).includes('undefined'));
  assert(result.blocks.length);
  assert(ui.renderStage().includes(format==='file'&&salePlace==='vkshop'?'Цифровой файл в «Товарах» VK: требуется проверка':format==='file'&&salePlace==='market'?'Цифровой материал: уточните сервис':salePlace==='tgbot'?'бот':salePlace==='donut'?'Донат':'Предложение в месте продажи'));
  if(format==='file'&&salePlace==='vkshop') {
    assert(ui.verification());
    assert(!result.blocks.some(b=>b[0]==='Путь до оформления заказа'));
    assert(JSON.stringify(result).includes('Это не вывод о законодательном запрете'));
  }
  if(format==='print'&&salePlace==='vkshop') assert(!ui.verification());
  if(format==='file'&&salePlace==='market') {
    assert(ui.verification());
    assert(!result.blocks.some(b=>b[0]==='Путь до оформления заказа'));
    assert(result.blocks.some(b=>b[0]==='Бесплатный фрагмент'));
    assert(ui.renderStage().includes('Отделить отправку фрагмента'));
  }
  if(format==='print'&&salePlace==='donut') assert(result.blocks.some(b=>b[0]==='Несовместимая модель'));
  if(format==='file'&&salePlace==='donut') {
    const path = result.blocks.find(b=>b[0]==='Путь подписчика');
    assert(path && path[1].includes('Условия подключения и прекращения'));
    assert(!path[1].includes('Файл или доступ получен'));
    assert(result.title.includes('Доступ по подписке'));
    assert(result.blocks.some(b=>b[0]==='Условия сервиса требуют подтверждения'));
    assert(ui.renderStage().includes('включая возрастные ограничения'));
  }
  if(format==='file'&&salePlace==='tgbot') assert(result.blocks.find(b=>b[0]==='Путь до оформления заказа')[1].includes('Переход к оформлению заказа в боте'));
  cases++;
}
const S={goal:'book',format:'file',scope:'promotion',salePlace:'site',form:'ip',sample:false,publisher:'vk'};
const ui=afterWindow.BookUI.create({D:after,S,esc:String,curForm:()=>after.forms[3],saveBar:()=>''});
assert(!JSON.stringify(ui.summaryBlocks({why:['запрет']},{name:'тест'})).includes('Путь до оформления заказа'));
assert(!JSON.stringify(ui.summaryBlocks({transfer:true},{name:'VK'})).includes('Путь до оформления заказа'));
const links=after.start.book.flatMap(p=>p.children||[]);
for(const b of links) if((b.fines||[]).includes('marking')) assert(b.fines.includes('adlabel'),'Раздельные составы erid и пометки: '+b.id);
const ownIds=['book-site-page','book-site-article','book-site-email','book-site-sample'];
for(const id of ownIds) assert.deepEqual(Array.from(links.find(b=>b.id===id).dest),['site','market']);
assert.equal(after.bookPlaces.market.name,'Книжный сервис или маркетплейс');
assert(links.find(b=>b.id==='book-site-email').here.can.some(t=>t.includes('немедленно прекращать')));
assert(links.find(b=>b.id==='book-market-ads').here.can.some(t=>t.includes('erid')));
assert(links.find(b=>b.id==='book-market-ads').fines.includes('marking'));
assert(!links.find(b=>b.id==='book-market-card').short.includes('получение'));
for(const id of ['book-site-email','vk-mail']) assert(links.find(b=>b.id===id).details.includes('Прежнего ограничения только собственными товарами в этом тексте нет'));
for(const id of ['site','market']) assert(!after.bookPlaces[id].check.some(c=>/чеки|платежи|получения/.test(c.text)));

// Проверяется настоящая функция экспорта из index.html, включая условия назначения.
const pageSource=fs.readFileSync(path.join(root,'index.html'),'utf8');
const summarySource=pageSource.slice(pageSource.indexOf('function summaryParts()'),pageSource.indexOf('/* Скачивание файла:'));
const context={D:after,S,bookUI:ui,curForm:()=>after.forms[3],fv:f=>f.ip,chain:()=>[]};
vm.runInNewContext(summarySource,context);
let marketCases=0;
for(const a of after.start.book) for(const b of a.children||[]) if(b.dest?.includes('market')) {
  const p=Object.assign({id:'market'},after.bookPlaces.market);
  context.chain=()=>[a,b,p];
  S.format='file';
  let r=context.summaryParts();
  assert(r.blocks.some(x=>x[0]==='Цифровой материал: уточните сервис'),b.id);
  assert(!r.blocks.some(x=>x[0]==='Путь до оформления заказа'),b.id);
  assert(r.blocks.some(x=>x[0]==='Действия выбранного маршрута'),b.id);
  if(b.id==='book-site-email') assert(JSON.stringify(r).includes('немедленно прекращать'));
  if(b.id==='book-market-ads') assert(JSON.stringify(r).includes('erid'));
  if(b.sample) assert(r.blocks.some(x=>x[0]==='Бесплатный фрагмент'));
  S.format='print';r=context.summaryParts();
  assert.equal(r.blocks.some(x=>x[0]==='Путь до оформления заказа'),!b.marketReview,b.id);
  marketCases++;
}
S.format='file';
const email=links.find(b=>b.id==='book-site-email');
context.chain=()=>[after.start.book.find(n=>n.id==='site'),email,Object.assign({id:'site'},after.bookPlaces.site)];
assert(JSON.stringify(context.summaryParts()).includes('Сохранить текст и версию согласия'));
const platform=after.start.book.find(n=>n.id==='telegram');
assert(ui.summaryBlocks(email,{id:'market',name:'Сервис'},platform).some(x=>x[0]==='Риск исходной площадки'));
const vk=after.start.book.find(p=>p.id==='vk');
assert.equal(vk.children.length,11);
const tgReply=links.find(b=>b.id==='tg-reply');
assert(tgReply && tgReply.dest.includes('site') && tgReply.dest.includes('vkshop'));
assert(tgReply.here.cannot.some(t=>t.includes('Автоматически подписывать')));
for(const b of after.start.book.find(p=>p.id==='instagram').children) {
  assert.equal(b.guide.examples.length,2,'Два примера: '+b.id);
  assert(b.guide.note.includes('учебные'));
}
const reply=links.find(b=>b.id==='vk-reply');
assert(reply && reply.here.cannot.some(t=>t.includes('Автоматически подписывать')));
assert.deepEqual(Array.from(reply.dest),['site','vkshop']);
assert(!links.find(b=>b.id==='vk-tg').fines.includes('vpn'));
assert(!links.find(b=>b.id==='vk-shop').fines.includes('kassa'));
for(const id of ['vk-post','vk-ads']) {
  const b=links.find(b=>b.id===id);
  assert(b.dest.includes('market'));
  assert(ui.verification({id:'market'},b));
  assert(!ui.summaryBlocks(b,{id:'market',name:'Маркетплейс'}).some(x=>x[0]==='Путь до оформления заказа'));
}
assert(!ui.summaryBlocks(reply,{id:'vkshop',name:'VK'}).some(x=>x[0]==='Путь до оформления заказа'));
assert(ui.outcome(reply,{id:'vkshop',name:'VK'}).includes('требуется проверка'));
S.format='print';
assert(ui.summaryBlocks(reply,{id:'vkshop',name:'VK'}).some(x=>x[0]==='Путь до оформления заказа'));
S.format='file';
assert.deepEqual(Array.from(links.find(b=>b.id==='tg-bot').dest),['tgbot','site']);
for(const id of ['yt-move','tt-move']) {
  const b=links.find(b=>b.id===id);
  assert(b.republish && !b.transfer);
  const result=ui.summaryBlocks(b,{id:'vk',name:'VK'});
  assert(result.some(x=>x[0]==='Результат'&&x[1][0].includes('Копия ролика опубликована')));
  assert(!result.some(x=>x[0]==='Путь до оформления заказа'));
}
for(const dest of ['site','tgbot']) {
  const result=ui.summaryBlocks(links.find(b=>b.id==='tg-bot'),{id:dest,name:dest});
  const path=result.find(b=>b[0]==='Путь до оформления заказа')[1];
  assert.equal(path.includes('Переход к оформлению заказа в боте'),dest==='tgbot');
}
S.format='print';
assert(ui.summaryBlocks(links.find(b=>b.id==='vk-donut'),{id:'donut',name:'VK Донат'}).some(x=>x[0]==='Несовместимая модель'));
S.format='file';
// VIDEO/RT v7: проверяется реальный экспорт маршрута, а не только строки данных.
const v6=run(source.slice(0,source.indexOf('/* Рабочая v7'))).SCHEMA;
for(const p of after.start.book.filter(p=>!['youtube','tiktok','rutube','telegram','bloggers','direct'].includes(p.id))) assert.equal(JSON.stringify(p),JSON.stringify(v6.start.book.find(n=>n.id===p.id)),'Изменён несогласованный участок: '+p.id);
for(const id of ['book-yt-tg','book-tt-tg']) {
  const b=links.find(c=>c.id===id),a=after.start.book.find(n=>n.children?.some(c=>c.id===id));
  assert(!b.fines.includes('vpn'));
  assert(b.transfer && !b.republish);
  context.chain=()=>[a,b,Object.assign({id:'tg'},after.bookPlaces.tg)];
  const result=context.summaryParts();
  assert(result.blocks.some(x=>x[0]==='Результат'&&x[1].some(t=>t.startsWith('Перенос аудитории'))));
  assert(!result.blocks.some(x=>x[0]==='Путь до оформления заказа'));
  assert(!result.blocks.filter(x=>x[0].startsWith('Ответственность')).flat(2).some(t=>String(t).includes(after.fines.vpn.title)));
}
assert(!links.find(c=>c.id==='yt-blogger').here.cannot.some(t=>t==='Договор с выходом после 31.12.2026'));
assert(links.find(c=>c.id==='yt-blogger').here.cannot.some(t=>t.includes('отметку YouTube')));
assert(links.find(c=>c.id==='tt-bio').here.cannot.some(t=>t.includes('любому аккаунту')));
assert(links.find(c=>c.id==='tt-dm').here.cannot.some(t=>t.includes('отдельного согласия')));
assert(!links.find(c=>c.id==='tt-video').short.includes('запас'));
assert(links.find(c=>c.id==='tt-ads').review);
for(const id of ['yt-vpn','tt-vpn']) {
  const b=links.find(c=>c.id===id);
  assert(b.fines.includes('vpn') && b.why.length);
  assert(!JSON.stringify(b).includes('Штраф выше'));
}
const dz=links.find(c=>c.id==='dzen-promo');
assert(['marking','adlabel','erir','content'].every(k=>dz.fines.includes(k)));
assert(!links.find(c=>c.id==='rt-blogger').here.cannot.some(t=>t.includes('стоимости в акте')));
for(const a of after.start.book.filter(p=>['youtube','tiktok','rutube'].includes(p.id))) for(const b of a.children) {
  const old=v6.start.book.find(p=>p.id===a.id).children.find(c=>c.id===b.id);
  assert(old && JSON.stringify(b.dest)===JSON.stringify(old.dest),'Изменены назначения: '+b.id);
}
// v8: настоящий проход цепочки и экспорт учитывают площадку, подарок и сохранённые старые пути.
const routingSource=pageSource.slice(pageSource.indexOf('const place ='),pageSource.indexOf('function card('));
const routing={D:after,S,bookUI:ui,window:{}};
vm.runInNewContext(routingSource+'\nthis.actualChain=chain;',routing);
context.chain=()=>routing.actualChain();
let publicationCases=0;
for(const publisher of ['',...after.bookPublishers.map(p=>p.id)]) {
  S.publisher=publisher;
  S.path=['bloggers','bl-paid','site'];
  const result=context.summaryParts();
  const gated=['','other','instagram','tiktok'].includes(publisher);
  assert.equal(result.blocks.some(x=>x[0]==='Путь до оформления заказа'),!gated,publisher);
  assert(result.blocks.some(x=>x[0]==='Фактическая площадка публикации'),publisher);
  if(publisher==='instagram') assert(JSON.stringify(result).includes('запрещено'));
  if(publisher==='telegram'||publisher==='youtube') assert(JSON.stringify(result).includes('переходный период'));
  S.path=['bloggers','bl-gift','site'];
  const gift=context.summaryParts();
  assert.equal(routing.actualChain().length,2,'Старое назначение подарка не продолжается');
  assert(gift.blocks.some(x=>x[0]==='Результат'&&x[1].some(t=>t.includes('не гарантированы'))));
  assert(!gift.blocks.some(x=>x[0]==='Путь до оформления заказа'||x[0].startsWith('Ответственность')));
  publicationCases++;
}
S.publisher='instagram'; S.path=['direct','dir-tg','site'];
let published=context.summaryParts();
assert(published.blocks.some(x=>x[0]==='Фактическая площадка публикации'&&x[1][0]==='Telegram'));
assert(published.blocks.some(x=>x[0]==='Путь до оформления заказа'));
S.path=['telegram','tg-ads','site'];
published=context.summaryParts();
assert(published.blocks.some(x=>x[0]==='Telegram Ads: подтвердите страницу назначения'));
assert(!published.blocks.some(x=>x[0]==='Путь до оформления заказа'));
assert(!after.start.book.flatMap(p=>p.children||[]).find(c=>c.id==='tg-bot').fines.includes('kassa'));
assert(!after.start.book.flatMap(p=>p.children||[]).find(c=>c.id==='dir-retarget').fines.includes('mailing'));
assert(!JSON.stringify(after.bookPlaces.tgbot.check).match(/выдач|достав|чек|налог/));
const v7=run(source.slice(0,source.indexOf('/* Рабочая v8'))).SCHEMA;
for(const p of after.start.book.filter(p=>!['telegram','bloggers','direct'].includes(p.id))) assert.equal(JSON.stringify(p),JSON.stringify(v7.start.book.find(n=>n.id===p.id)),'v8 изменила другую площадку: '+p.id);
for(const n of after.start.book) for(const c of n.children||[]) {
  const old=v7.start.book.flatMap(p=>p.children||[]).find(n=>n.id===c.id);
  assert.equal(JSON.stringify(c.dest),JSON.stringify(old.dest),'v8 изменила назначения '+c.id);
}
S.publisher='vk'; S.path=[];
console.log('v8: '+publicationCases+' вариантов площадки в реальной цепочке и экспорте; подарок не обещает обзор/покупку, Директ учитывает Telegram, условия Ads и граница бота сохранены.');
for(const page of ['index.html','markirovka.html']) {
  const text=fs.readFileSync(path.join(root,page),'utf8');
  assert(!text.includes('fonts.googleapis.com'));
  if(page==='index.html') { assert(!text.includes('<option value="delivery">')); assert(text.includes('id="scope-help"')); }
  for(const match of text.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1],{filename:page});
  for(const match of text.matchAll(/<script src="([^"]+)"/g)) assert(fs.existsSync(path.join(root,match[1])));
}
console.log('Проверено: 10 целей, 6 статусов, все 56 прежних связок сохранены, 8 добавлены, другие 9 целей не изменены.');
console.log('Проверено '+cases+' сочетаний формата, раздела, места заказа и статуса; сохранённые итоги не продолжают тупики и перенос аудитории как покупку.');
console.log('Обе HTML-страницы: синтаксис скриптов, относительные зависимости и отсутствие загрузки внешних шрифтов — без ошибок.');
console.log('Бот/сайт различаются в итогах; Донат сохраняет подписку; копии видео не превращаются в перенос аудитории или покупку.');
console.log('VK: 11 карточек; ответ не подписывает на рассылку; новые переходы на маркетплейс условны; цифровой каталог не выдаёт готовый путь; печатный каталог сохраняет путь; лишние VPN/ККТ-составы убраны.');
console.log('PROMO02: четыре новых назначения без новых id; '+marketCases+' входов в market проверены в настоящем экспорте для файла/печати; согласие, маркировка, фрагмент и риски не теряются при условии назначения.');
