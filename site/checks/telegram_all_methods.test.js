/* Telegram: 9 способов и 81 ячейка первой цели. Структура, не правовое заключение. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../',ctx={window:{}};
for(const f of ['data.js','instagram-legal.js','route-matrix.js'])vm.runInNewContext(fs.readFileSync(root+f,'utf8'),ctx,{filename:f});
const D=ctx.window.SCHEMA,platform=D.start.book.find(p=>p.id==='telegram');
assert(platform,'Telegram отсутствует в первой цели');
const expected=['tg-expert','tg-reply','tg-post','tg-posev','tg-ads','tg-bot','tg-promo','tg-move','tg-vpn'];
assert.deepEqual(Array.from(platform.children,n=>n.id),expected,'Состав способов Telegram изменился');
assert.equal(D.routeMatrix.targets.length,9);
let conditional=0,notApplicable=0,terminal=0;
for(const b of platform.children){
  const row=D.routeMatrix.rows.find(r=>r.platform==='telegram'&&r.method===b.id);
  assert(row,b.id+' отсутствует в матрице');
  assert.equal(row.destinations.length,9);
  assert.equal(new Set(row.destinations.map(x=>x.id)).size,9);
  assert(['g','y','r'].includes(b.risk),b.id+' — некорректный уровень риска');
  assert(b.name&&b.short,b.id+' — нет имени или описания');
  const warning=!!(b.why||b.uncommitted);
  if(warning)assert(!b.dest?.length,b.id+' — предупреждение имеет продолжение');
  else assert(b.dest?.length,b.id+' — маршрут не имеет продолжения');
  for(const cell of row.destinations){
    const expectedState=warning?'terminal':b.dest.includes(cell.id)?'conditional':'not-applicable';
    assert.equal(cell.state,expectedState,b.id+'/'+cell.id+' — расхождение состояния');
    assert(cell.reason?.trim(),b.id+'/'+cell.id+' — нет причины');
    if(cell.state==='conditional'){
      assert(D.bookPlaces[cell.id],b.id+'/'+cell.id+' — нет места назначения');
      assert(b.routeConditions?.[cell.id],b.id+'/'+cell.id+' — отсутствуют условия');
      conditional++;
    }else if(cell.state==='terminal')terminal++;
    else notApplicable++;
  }
}
assert.deepEqual([conditional,notApplicable,terminal],[40,32,9],
  'Изменилось распределение 81 состояния Telegram');
const find=id=>platform.children.find(x=>x.id===id);
assert.deepEqual(Array.from(find('tg-ads').dest),['tg','tgbot','site']);
assert.deepEqual(Array.from(find('tg-bot').dest),['tgbot','site']);
assert.deepEqual(Array.from(find('tg-move').dest),['vk']);
assert(!find('tg-vpn').dest?.length && find('tg-vpn').why?.length,
  'Предупреждение по VPN не должно вести к покупке');
const inventory=JSON.parse(fs.readFileSync(root+'checks/goal1-route-inventory.json','utf8'));
const saved=inventory.rows.filter(r=>r.platform==='telegram');
assert.equal(saved.length,expected.length,'Реестр Telegram не полон');
for(const row of saved){
 const live=D.routeMatrix.rows.find(r=>r.platform===row.platform&&r.method===row.method);
 assert(live,'Нет способа '+row.method);
 for(const c of live.destinations)assert.equal(row.targets[c.id],c.state,row.method+'/'+c.id);
}
console.log(JSON.stringify({platform:'telegram',methods:9,cells:81,conditional,notApplicable,terminal}));
