/* Первая последовательная ревизия всех целей: консультация, 28.11.2026. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=__dirname+'/../',ctx={window:{}};
for(const p of ['data.js','instagram-legal.js'])vm.runInNewContext(fs.readFileSync(base+p,'utf8'),ctx,{filename:p});
const D=ctx.window.SCHEMA;
const previous=JSON.parse(JSON.stringify(D.start));
vm.runInNewContext(fs.readFileSync(base+'consult-legal.js','utf8'),ctx,{filename:'consult-legal.js'});
const consulted=D.start.consult;
const at=id=>consulted.find(p=>p.id===id), node=(id,k)=>at(id).children.find(n=>n.id===k);
assert.equal(consulted.length,previous.consult.length,'Количество площадок консультации');
for(const [goal,roots] of Object.entries(D.start)){
  if(goal==='consult')continue;
  assert.equal(JSON.stringify(roots),JSON.stringify(previous[goal]),'Нельзя менять другие цели: '+goal);
}
for(const p of previous.consult){
  const n=at(p.id);assert(n,'Площадка исчезла: '+p.id);
  const old=p.children||[],fresh=n.children||[];
  assert.equal(JSON.stringify(fresh.map(x=>x.id)),JSON.stringify(old.map(x=>x.id)),'Состав вариантов изменён: '+p.id);
  for(const c of old){
    const x=node(p.id,c.id);
    assert.equal(JSON.stringify(x.dest),JSON.stringify(c.dest),'Переход изменён: '+c.id);
  }
}
assert.equal(at('vk').risk,'g');
assert.equal(node('vk','k-vk-post').risk,'y');
assert(node('vk','k-vk-post').details.includes('Цена или ссылка сами по себе'));
assert(!node('vk','k-vk-post').fines.length,'Штраф за собственную справочную карточку VK');
assert.equal(node('tg','k-tg-chat').name,'Ответ на вопрос о консультации');
assert.equal(node('tg','k-tg-chat').risk,'g');
assert(!node('tg','k-tg-chat').details.includes('Клиенты будут присылать анализы'));
assert.equal(node('youtube','consult-yt-tg').risk,'g');
assert.equal(node('tiktok','consult-tt-tg').risk,'g');
assert.equal(node('rutube','consult-rt-desc').risk,'y');
assert(D.consultLegal&&D.consultLegal.status==='working');
for(const page of ['index.html']){
 const h=fs.readFileSync(base+page,'utf8');
 assert(h.indexOf('src="instagram-legal.js"')<h.indexOf('src="consult-legal.js"'),'Порядок загрузки '+page);
 assert(h.indexOf('src="consult-legal.js"')<h.indexOf('src="route-matrix.js"'),'Порядок загрузки '+page);
}
vm.runInNewContext(fs.readFileSync(base+'route-matrix.js','utf8'),ctx);
vm.runInNewContext(fs.readFileSync(base+'desktop-board.js','utf8'),ctx);
const B=ctx.window.DesktopBoard;
const all=B.platforms(consulted);
const paths=arr=>arr.flatMap(p=>p.children?p.children.map(x=>p.id+'/'+x.id):[p.id]);
assert.equal(JSON.stringify(paths(all).slice().sort()),JSON.stringify(paths(consulted).slice().sort()),'Потери в едином списке');
const rank=B.riskRank;
for(const p of all)if(p.children)assert(p.children.every((n,i)=>!i||rank(p.children[i-1])<=rank(n)),'Порядок: '+p.id);
for(const id of ['k-vk-expert','k-vk-post'])assert(all.find(p=>p.id==='vk').children.some(x=>x.id===id),id+' исчез');
assert.equal(all.find(p=>p.id==='vk').risk,'g','VK разрешён');
assert(all.find(p=>p.id==='tg').children.some(x=>x.id==='k-tg-chat'),'Ответ в Telegram скрыт');
assert(all.find(p=>p.id==='youtube').children.some(x=>x.id==='consult-yt-tg'),'Ссылка в YouTube скрыта');
assert(all.find(p=>p.id==='tiktok').children.some(x=>x.id==='consult-tt-tg'),'Ссылка в TikTok скрыта');
assert(all.find(p=>p.id==='vk').children.some(x=>x.risk==='r'),'Не потерять риск отдельного объявления в VK');
console.log('Консультации: '+paths(consulted).length+' вариантов, все id и переходы сохранены, другие девять целей неизменны.');
