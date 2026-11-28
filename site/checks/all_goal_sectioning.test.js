/* Единая схема: все варианты 10 целей, красные → жёлтые → обычные.
   Цвет площадки определяется её собственным статусом, а не отдельной карточкой. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=__dirname+'/../',c={window:{}};
for(const n of ['data.js','instagram-legal.js','consult-legal.js','route-matrix.js','desktop-board.js'])
 vm.runInNewContext(fs.readFileSync(dir+n,'utf8'),c,{filename:n});
const D=c.window.SCHEMA,B=c.window.DesktopBoard;
const goals=Object.entries(D.start),ids=ps=>ps.flatMap(p=>p.children?p.children.map(n=>p.id+'/'+n.id):[p.id]);
assert.equal(goals.length,10,'Должны быть все десять целей');
let total=0,ig=0;
for(const [goal,raw] of goals){
 const original=JSON.stringify(raw);
 const unified=B.platforms(raw);
 assert.equal(JSON.stringify(ids(unified).slice().sort()),JSON.stringify(ids(raw).slice().sort()),'Потеря варианта: '+goal);
 assert.equal(ids(unified).length,ids(raw).length,'Дубликат: '+goal);
 assert.equal(new Set(ids(unified)).size,ids(unified).length,'Повтор ID: '+goal);
 assert.equal(JSON.stringify(raw),original,'Изменение исходных данных при сортировке: '+goal);
 const rank=n=>B.riskRank(n);
 const sorted=xs=>xs.every((v,i)=>!i||rank(xs[i-1])<=rank(v));
 assert(sorted(unified),'Порядок площадок нарушен: '+goal);
 for(const p of unified)if(p.children)assert(sorted(p.children),'Порядок способов: '+goal+'/'+p.id);
 for(const p of raw){
   const dest=p.children||[];
   for(const n of dest){
     if(n.risk==='r')assert(unified.find(x=>x.id===p.id).children.some(x=>x.id===n.id),'Потерян запрет: '+n.id);
     if(n.risk==='y')assert(unified.find(x=>x.id===p.id).children.some(x=>x.id===n.id),'Потерян условный вариант: '+n.id);
   }
 }
 const vk=unified.find(x=>x.id==='vk');
 if(vk)assert.equal(vk.risk,'g','VK ошибочно объявлен запрещённой площадкой: '+goal);
 const insta=unified.find(x=>x.id==='instagram');
 if(insta&&goal!=='adsell'){
   ig++;
   assert(insta.children.some(n=>n.instagramInfo),'Нет информации о собственном продукте: '+goal);
   assert(insta.children.some(n=>n.risk==='r'),'Нет запрещённой рекламы: '+goal);
 }
 total+=ids(raw).length;
}
assert.equal(total,379,'Должны сохраниться 379 вариантов');
assert.equal(D.routeMatrix.rows.length,65,'Должны сохраниться 65 методов материалов');
assert.equal(ig,8,'Информация Instagram должна быть в восьми целях');
const html=fs.readFileSync(dir+'index.html','utf8');
assert(!html.includes('id="route-mode"'),'Переключатель разделов не убран');
assert(html.includes('data-route-mode="all"'),'Не включена единая схема');
assert(html.includes('DesktopBoard.sortNodes(n.dest.map'),'Третий шаг не сортируется');
assert(html.includes('childrenOf(a).map'),'Второй шаг не сортируется');
assert(!html.includes('Красные карточки показаны сверху как более рискованные'),'Не добавлять запрещённую подпись');
for(const [,script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(script);
const legacy=fs.readFileSync(dir+'risk.html','utf8');
assert(legacy.includes("location.replace('index.html')"),'Старая ссылка должна вести в общую схему');
console.log('Единая схема: '+goals.length+' целей, '+total+' вариантов, 65 книжных методов, порядок r/y/g на всех карточках; VK сохраняет собственный статус.');
