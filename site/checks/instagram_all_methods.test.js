/* Инвентаризация всех 8 способов Instagram и 72 состояний матрицы цели book.
 * Структурная регрессия, не правовая оценка и не браузерный E2E. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../',ctx={window:{}};
for(const file of ['data.js','instagram-legal.js','route-matrix.js']){
  vm.runInNewContext(fs.readFileSync(root+file,'utf8'),ctx,{filename:file});
}
const D=ctx.window.SCHEMA,ig=D.start.book.find(p=>p.id==='instagram');
assert(ig,'Instagram отсутствует в первой цели');
const expected=['author','ig-info','bio','source','dm','tglink','word','target'];
assert.deepEqual(Array.from(ig.children,c=>c.id),expected,'Список способов Instagram изменился — перепроверьте реестр');
const targetIds=D.routeMatrix.targets;
assert.equal(targetIds.length,9);
const destinations=D.bookPlaces;
let conditional=0,notApplicable=0,terminal=0;
for(const b of ig.children){
  const row=D.routeMatrix.rows.find(r=>r.platform==='instagram'&&r.method===b.id);
  assert(row,'Нет строки в матрице для '+b.id);
  assert.equal(row.destinations.length,9,b.id+' — количество состояний');
  assert.equal(new Set(row.destinations.map(x=>x.id)).size,9,b.id+' — повторы назначений');
  assert(['g','y','r'].includes(b.risk),b.id+' — неизвестный риск');
  assert(b.guide&&b.guide.examples?.length===2,b.id+' — отсутствуют два примера');
  assert(b.name&&b.short,b.id+' — пустая карточка');
  const isTerminal=Boolean(b.why||b.uncommitted);
  if(isTerminal)assert(!b.dest?.length,b.id+' — предупреждение не должно получать маршрут заказа');
  else assert(b.dest?.length,b.id+' — тупик без объяснения');
  for(const cell of row.destinations){
    assert(targetIds.includes(cell.id),'Неизвестное назначение '+cell.id);
    const expectedState=isTerminal?'terminal':b.dest.includes(cell.id)?'conditional':'not-applicable';
    assert.equal(cell.state,expectedState,b.id+'/'+cell.id+' — статус не совпадает с маршрутом');
    assert(cell.reason?.trim(),b.id+'/'+cell.id+' — отсутствует объяснение');
    if(cell.state==='conditional'){
      assert(destinations[cell.id],b.id+'/'+cell.id+' — нет места назначения');
      assert(b.routeConditions[cell.id]?.trim(),b.id+'/'+cell.id+' — нет условия перехода');
      conditional++;
    }else if(cell.state==='terminal')terminal++;
    else notApplicable++;
  }
}
assert.deepEqual([conditional,notApplicable,terminal],[47,7,18],
  'Изменились 72 состояния Instagram — нужна повторная инвентаризация');
const info=ig.children.find(x=>x.id==='ig-info');
assert.deepEqual(Array.from(info.dest),['none','site','vk','vkshop','tg','market']);
const word=ig.children.find(x=>x.id==='word');
assert(word.why?.length>0,'Пост с кодовым словом не должен выглядеть разрешённым');
const target=ig.children.find(x=>x.id==='target');
assert(target.why?.length>0,'Таргет не должен выглядеть разрешённым');
console.log(JSON.stringify({platform:'instagram',methods:8,cells:72,conditional,notApplicable,terminal}));
