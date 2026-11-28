const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../',c={window:{}};
const load=f=>vm.runInNewContext(fs.readFileSync(root+f,'utf8'),c);
load('data.js');load('instagram-legal.js');load('youtube-funnels.js');load('telegram-funnels.js');load('p0-legal-review.js');const before=JSON.parse(JSON.stringify(c.window.SCHEMA));
load('route-matrix.js');load('book-ui.js');load('card-help.js');load('goal1-copy.js');load('desktop-board.js');
const D=c.window.SCHEMA, page=fs.readFileSync(root+'index.html','utf8');
for(const id of Object.keys(before.start).filter(x=>x!=='book'))assert.equal(JSON.stringify(D.start[id]),JSON.stringify(before.start[id]),id);
assert.equal(D.routeMatrix.rows.length,86);
assert.equal(JSON.stringify(D.places),JSON.stringify(before.places),'Shared destinations for other goals changed');
const S={goal:'book',format:'file',scope:'promotion',salePlace:'site',form:D.forms[0].id,sample:false,publisher:'vk',path:[]};
const esc=s=>String(s).replace(/[&<>"]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x]));
Object.assign(c,{D,S,esc,saveBar:()=>'',list:xs=>'<ul>'+xs.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'});
c.bookUI=c.window.BookUI.create({D,S,esc,curForm:()=>D.forms.find(f=>f.id===S.form),saveBar:()=>''});
vm.runInNewContext(page.slice(page.indexOf('const place ='),page.indexOf('\nfunction card(')),c);
vm.runInNewContext(page.slice(page.indexOf('function cardDetails('),page.indexOf('\nfunction cardLiability')),c);
vm.runInNewContext(page.slice(page.indexOf('function curForm()'),page.indexOf('\nfunction redPanel(')),c);
vm.runInNewContext(page.slice(page.indexOf('function summaryParts()'),page.indexOf('/* Скачивание файла:')),c);
const chain=()=>vm.runInNewContext('chain()',c);
let cases=0,routeCount=0,terminal=0;
for(const a of D.start.book)for(const b of a.children||[]){
 const old=before.start.book.find(x=>x.id===a.id).children.find(x=>x.id===b.id);
 assert.equal(b.risk,old.risk);assert.equal(JSON.stringify(b.fines),JSON.stringify(old.fines));
 assert(c.window.CardHelp.get(b).examples.length===2,b.id);
 const row=D.routeMatrix.rows.find(x=>x.method===b.id);
 assert.equal(row.destinations.length,9);assert(new Set(row.destinations.map(x=>x.id)).size===9);
 if(b.why||b.uncommitted)terminal++;else routeCount+=b.dest.length;
 for(const format of ['file','print'])for(const form of D.forms)for(const sample of [false,true])for(const publisher of a.id==='bloggers'?['',...D.bookPublishers.map(x=>x.id)]:['vk'])for(const k of D.routeMatrix.targets){
   Object.assign(S,{format,form:form.id,sample,path:[a.id,b.id,k],publisher});
   const nodes=chain(),issue=c.bookUI.publicationIssue(a,b);
   const applies=!b.why&&!b.uncommitted&&!issue&&b.dest.includes(k);
   assert.equal(nodes.length,applies?3:2,[a.id,b.id,k].join('/'));
   const result=c.summaryParts();
   assert(!/undefined|NaN/.test(JSON.stringify(result)),b.id+'/'+k);
   if(applies){
     const p=nodes[2];c.testNodes=nodes;
     const html=vm.runInNewContext('finalPanel(testNodes[1],testNodes[2],testNodes[0].name)',c);
     assert(!/undefined|NaN/.test(html),b.id+'/'+k);
     assert(!/undefined|NaN/.test(vm.runInNewContext('cardDetails(testNodes[2])',c)),b.id+'/'+k);
     const noOrder=c.bookUI.nonPurchase(b,p)||b.transfer||b.republish||c.bookUI.incompatible(p)||c.bookUI.verification(p,b);
     if(noOrder)assert(!result.blocks.some(x=>x[0]==='Путь до оформления заказа'),b.id+'/'+k);
     assert(result.blocks.some(x=>x[0]==='Действия выбранного маршрута'||x[0]==='Можно'),b.id+'/'+k);
   }else assert(!result.blocks.some(x=>x[0]==='Путь до оформления заказа'),b.id+'/'+k);
   cases++;
 }
}
const find=id=>D.start.book.flatMap(p=>p.children||[]).find(b=>b.id===id);
for(const id of ['dm','tg-reply','vk-reply','tt-dm'])for(const k of ['none','site','vkshop','market','tgbot'])assert(find(id).dest.includes(k),id+'/'+k);
for(const id of ['yt-move','tt-move'])assert.deepEqual(Array.from(find(id).dest),['vk','rutube']);
assert.deepEqual(Array.from(find('vk-shop').dest),['vkshop']);
assert.deepEqual(Array.from(find('book-market-card').dest),['market']);
assert.equal(D.routeMatrix.rows.reduce((n,r)=>n+r.destinations.length,0),774);
assert(page.indexOf('src="instagram-legal.js"')>page.indexOf('src="data.js"'));
assert(page.indexOf('src="route-matrix.js"')>page.indexOf('src="instagram-legal.js"'));
assert(page.indexOf('src="route-matrix.js"')<page.indexOf('src="book-ui.js"'));
assert.deepEqual(Array.from(find('tg-ads').dest),['tg','tgbot'],'Базовый Telegram Ads ведёт только внутри Telegram');
console.log(JSON.stringify({methods:86,cells:774,potentialEndings:routeCount,terminalMethods:terminal,checkedStateCombinations:cases}));
