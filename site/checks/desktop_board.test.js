const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../',c={window:{}};
for(const f of ['data.js','instagram-legal.js','youtube-funnels.js','telegram-funnels.js','route-matrix.js','desktop-board.js'])vm.runInNewContext(fs.readFileSync(root+f,'utf8'),c);
const D=c.window.SCHEMA,B=c.window.DesktopBoard;
const pairs=ps=>ps.flatMap(p=>p.children?p.children.map(n=>p.id+'/'+n.id):[p.id]);
let total=0;
for(const [goal,ps] of Object.entries(D.start)){
 const resolved=ps.map(n=>n.place?Object.assign({id:n.id},D.places[n.place]):n);
 const before=JSON.stringify(resolved),normal=B.platforms(resolved,'ordinary'),risk=B.platforms(resolved,'risk');
 const ns=pairs(normal),rs=pairs(risk),all=pairs(resolved);
 assert(!ns.some(x=>rs.includes(x)),goal+' duplicated method');
 assert.deepEqual([...ns,...rs].sort(),[...all].sort(),goal+' lost a method');
 assert.equal(JSON.stringify(resolved),before,'Filtering mutated data');
 total+=all.length;
}
const normal=B.platforms(D.start.book,'ordinary'),risk=B.platforms(D.start.book,'risk');
assert(normal.some(p=>p.id==='instagram'));assert(risk.some(p=>p.id==='instagram'));
assert(normal.find(p=>p.id==='instagram').children.some(n=>n.id==='ig-info'));
assert(!risk.find(p=>p.id==='instagram').children.some(n=>n.id==='ig-info'));
assert(risk.find(p=>p.id==='instagram').children.some(n=>n.id==='target'));
assert(!normal.find(p=>p.id==='direct').children.some(n=>n.id==='dir-med'));
assert(risk.find(p=>p.id==='direct').children.some(n=>n.id==='dir-med'));
assert.equal(normal.find(p=>p.id==='vk').children.length,11);
const index=fs.readFileSync(root+'index.html','utf8'),risky=fs.readFileSync(root+'risk.html','utf8');
assert.equal(risky,index.replace('data-route-mode="ordinary"','data-route-mode="risk"').replace('<title>Схема продвижения — доработка интерфейса</title>','<title>Рискованные и запрещённые варианты — схема продвижения</title>'));
for(const html of [index,risky]){
 for(const [,code] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(code);
 assert(html.includes('data-open-result'));assert(html.includes('stateKey'));
}
console.log('Desktop pages: '+total+' route/root choices partitioned without loss; book platforms ordinary='+normal.length+', risk='+risk.length+'; scripts and page parity checked.');
