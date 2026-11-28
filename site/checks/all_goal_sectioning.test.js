/* Аудит вкладок всех десяти целей: различаем площадку и конкретную публикацию.
   Юридические статусы: справочная информация / рекламные ограничения / запрет. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=__dirname+'/../',ctx={window:{}};
for(const p of ['data.js','instagram-legal.js','consult-legal.js','route-matrix.js','desktop-board.js'])
  vm.runInNewContext(fs.readFileSync(dir+p,'utf8'),ctx,{filename:p});
const D=ctx.window.SCHEMA,B=ctx.window.DesktopBoard;
const goals=Object.entries(D.start);
assert.equal(goals.length,10,'Проверяйте все десять целей');
let total=0,ig=0,vkHigh=0,restricted=0;
for(const [goal,raw] of goals){
  const ordinary=B.platforms(raw,'ordinary',goal),risky=B.platforms(raw,'risk',goal);
  const names=xs=>xs.flatMap(p=>p.children?p.children.map(n=>p.id+'/'+n.id):[p.id]);
  const a=names(raw),o=names(ordinary),r=names(risky);
  assert.equal(new Set(a).size,a.length,goal+' повтор ID в исходнике');
  assert.equal(new Set(o).size,o.length,goal+' повтор обычной карточки');
  assert.equal(new Set(r).size,r.length,goal+' повтор рискованной карточки');
  assert(!o.some(x=>r.includes(x)),goal+' карточка попала в две вкладки');
  assert.equal(JSON.stringify([...o,...r].sort()),JSON.stringify(a.slice().sort()),goal+' потерян маршрут');
  total+=a.length;
  for(const p of risky){
    if(p.id==='vk'){
      assert(p.scenarioOnly,goal+' VK нельзя называть запрещённой площадкой');
      assert(p.short.includes('разрешена'),goal+' нет пояснения VK');
      assert.equal(p.risk,'g',goal+' нельзя повышать риск VK целиком');
      for(const n of p.children)assert(n.risk==='r'||n.review,goal+' в риск VK перенесено законное действие');
      vkHigh+=p.children.length;
    }
    if(['direct','rutube'].includes(p.id) && p.risk==='g')assert(p.scenarioOnly,goal+' разрешённая площадка показана как запрещённая');
  }
  const insta=raw.find(n=>n.id==='instagram');
  if(insta){
    const ia=ordinary.find(n=>n.id==='instagram'),ir=risky.find(n=>n.id==='instagram');
    const all=insta.children||[];
    assert.equal((ia?.children.length||0)+(ir?.children.length||0),all.length,goal+' потерял Instagram');
    for(const n of ia?.children||[])assert(n.risk!=='r',goal+' запретная реклама в обычной вкладке Instagram');
    for(const n of ir?.children||[])assert(n.risk==='r'||n.review,goal+' информация ошибочно запрещена в Instagram');
    if(goal!=='adsell') {
      ig++;
      const own=ia.children.find(n=>n.instagramInfo);
      assert(own && own.guide.examples.length===2,goal+' нет описания своего продукта');
      assert(!own.fines.length,goal+' на справочной информации назначен штраф за рекламу');
    }
  }
  for(const pid of ['youtube','tg','telegram','tiktok']){
    const p=raw.find(n=>n.id===pid);if(!p)continue;
    const one=ordinary.find(n=>n.id===pid),two=risky.find(n=>n.id===pid);
    for(const n of p.children||[]){
      if(n.risk==='g'&&goal!=='adsell')assert(one?.children?.some(x=>x.id===n.id),goal+' информационное действие '+n.id+' попало под запрет ресурса');
      if(n.risk==='y')assert(two?.children?.some(x=>x.id===n.id),goal+' упущена проверка риска рекламного размещения '+n.id);
      if(goal==='adsell')assert(two?.children?.some(x=>x.id===n.id),goal+' реклама на ограниченном ресурсе попала в обычные варианты');
    }
    restricted++;
  }
}
assert.equal(total,379,'Нарушена полнота маршрутов после восстановления');
assert.equal(D.routeMatrix.rows.length,65,'Первая цель вернулась к старой версии');
assert.equal(ig,8,'Информация о собственных товарах покрыта не во всех целях');
assert(vkHigh>0,'Нет проверки рискованных креативов VK');
for(const page of ['index.html','risk.html']){
  const content=fs.readFileSync(dir+page,'utf8');
  assert(content.includes("desktop-board.js"),page+' нет фильтра');
  assert(content.includes('document.body.dataset.routeMode, S.goal'),page+' нет цели при распределении');
  assert(content.includes('Площадка разрешена · риск отдельного объявления'),page+' нет оговорки о доступной площадке');
  for(const [,s] of content.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
    new vm.Script(s,{filename:page});
}
console.log('All goals: '+goals.length+', routes: '+total+', own Instagram: '+ig+', VK high-risk actions: '+vkHigh+', restricted resource groups: '+restricted+'. Partition OK.');
