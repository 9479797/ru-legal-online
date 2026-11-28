/* Проверка единой доски: все цели и уровни риска в каждом шаге. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../',c={window:{}};
for(const name of ['data.js','instagram-legal.js','consult-legal.js','route-matrix.js','desktop-board.js'])vm.runInNewContext(fs.readFileSync(root+name,'utf8'),c);
const D=c.window.SCHEMA,B=c.window.DesktopBoard;
const all=ps=>ps.flatMap(p=>p.children?p.children.map(n=>p.id+'/'+n.id):[p.id]);
const byRank=xs=>xs.every((n,i)=>i===0||B.riskRank(xs[i-1])<=B.riskRank(n));
let total=0;
for(const [goal,ps] of Object.entries(D.start)){
 const resolved=ps.map(n=>n.place?Object.assign({id:n.id},D.places[n.place]):n);
 const original=JSON.stringify(resolved);
 const ordered=B.platforms(resolved);
 assert.equal(JSON.stringify(all(ordered).slice().sort()),JSON.stringify(all(resolved).slice().sort()),goal+' теряет карточки');
 assert.equal(JSON.stringify(resolved),original,goal+' меняет исходник');
 assert(byRank(ordered),goal+' неверный порядок первого шага');
 for(const p of ordered)if(p.children)assert(byRank(p.children),goal+' неверный порядок второго шага: '+p.id);
 total+=all(ordered).length;
}
assert.equal(total,379);
const book=B.platforms(D.start.book);
const ig=book.find(p=>p.id==='instagram');
assert(ig.children.some(n=>n.id==='word'));
assert(ig.children.some(n=>n.id==='ig-info'));
assert(ig.children.some(n=>n.id==='target'));
assert(byRank(ig.children),'Красные варианты Instagram должны быть выше');
assert.equal(book.find(p=>p.id==='vk').risk,'g','VK не должен быть обозначен запрещённым');
const index=fs.readFileSync(root+'index.html','utf8');
const risk=fs.readFileSync(root+'risk.html','utf8');
assert(!index.includes('id="route-mode"'),'Старый селектор не удалён');
assert(index.includes('childrenOf(a).map'),'Вторая колонка должна сортироваться');
assert(index.includes('childrenOf(b).map'),'Третья колонка должна сортироваться');
assert(risk.includes('location.replace'),'Старая risk.html должна перенаправлять');
for(const html of [index,risk])for(const [,code] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(code);
console.log('Desktop: '+total+' маршрутов, все цели и 3 колонки сортируются r/y/g, одна страница.');
