/* Регрессия одного прототипного сценария: Instagram / word / file / sample. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../',c={window:{}};
const load=f=>vm.runInNewContext(fs.readFileSync(root+f,'utf8'),c,{filename:f});
for(const p of ['data.js','instagram-legal.js','consult-legal.js','route-matrix.js','desktop-board.js','instagram-codeword-flow.js'])load(p);
const D=c.window.SCHEMA,Flow=c.window.InstagramCodewordFlow,Board=c.window.DesktopBoard;
const state={goal:'book',scope:'promotion',path:['instagram','word'],format:'file',sample:true,igFlowDest:'site'};
assert(Flow.active(state,'all'));
for(const [key,val] of [['goal','course'],['format','print'],['scope','sale'],['sample',false]]){
 const copy={...state,[key]:val};
 assert(!Flow.active(copy,'all'),'Только выбранный сценарий: '+key);
}
assert(!Flow.active(state,'ordinary'),'Обычные маршруты неизменны');
assert(!Flow.active({...state,path:['instagram','target']},'all'),'Таргет не изменён');
assert.equal(Flow.destination('unknown'),'site');
for(const id of ['site','tg']){
 const html=Flow.render({dest:id,esc:x=>String(x)});
 assert(html.includes('class="ig-codeword-flow"'));
 assert(html.includes('data-ig-flow-dest="site"'));
 assert(html.includes('data-ig-flow-dest="tg"'));
 assert(html.includes('data-ig-flow-dest="'+id+'" aria-pressed="true"'));
 assert.equal((html.match(/class="ig-flow-node/g)||[]).length,4,'Четыре действия');
 assert(html.includes('размещать её в Instagram нельзя'));
 assert(html.includes('не исправляет исходный рекламный пост'));
 assert(html.includes('не равен согласию'));
 const result=Flow.summary({dest:id});
 assert.equal(result.length,2);
 assert(result[0][1][3].includes(id==='tg'?'Telegram':'Собственный сайт'));
 assert(result[1][1][0].includes('не снимают'));
}
const all=Board.platforms(D.start.book),insta=all.find(n=>n.id==='instagram');
assert(insta.children.some(n=>n.id==='word'));
assert(insta.children.some(n=>n.id==='ig-info'),'Информационный вариант сохранён рядом с рисковым');
assert.equal(D.routeMatrix.rows.length,65,'Новых методов для одной учебной цепочки нет');
for(const p of ['index.html']){
 const s=fs.readFileSync(root+p,'utf8');
 assert(s.includes('src="instagram-codeword-flow.js"'),'Модуль не подключён');
 assert(s.includes('window.InstagramCodewordFlow.active(S, routeMode)'),'Нет проверки выбранной связки');
 assert(s.includes('data-ig-flow-dest'),'Не подключена смена назначения');
 assert(s.includes('InstagramCodewordFlow.summary'),'Экспорт не обновлён');
 for(const [,script] of s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(script);
}
const desktop=fs.readFileSync(root+'desktop-board.js','utf8');
assert(desktop.includes("!stage.querySelector('.ig-codeword-flow')"),'Шаги скрыты в диалоге');

// Проверка обработчика клика из настоящей страницы: выбор меняется,
// вызывается render (там состояние записывается в localStorage), фокус не прокручивает страницу.
const page=fs.readFileSync(root+'index.html','utf8');
const start=page.indexOf("  const igDestination = e.target.closest('[data-ig-flow-dest]');");
const end=page.indexOf("  const help = e.target.closest('[data-help]');",start);
assert(start>=0 && end>start,'Обработчик смены места должен присутствовать');
const handler=page.slice(start,end);
const persisted=[];
const status={textContent:''};
const ctx={window:c.window,S:{...state},routeMode:'all',
  render(){persisted.push(JSON.parse(JSON.stringify(ctx.S)));},
  document:{querySelector(selector){
    if(selector==='#route-status')return status;
    if(selector.startsWith('[data-ig-flow-dest='))return {focus(options){
      assert.equal(options.preventScroll,true,'Смена места не должна прокручивать экран');
    }};
    return null;
  }}};
vm.createContext(ctx);
for(const id of ['tg','site','tg']){
  const e={target:{closest(selector){
    return selector==='[data-ig-flow-dest]'?{dataset:{igFlowDest:id}}:null;
  }}};
  vm.runInContext('(function(e){'+handler+'})(e)',Object.assign(ctx,{e}));
  assert.equal(ctx.S.igFlowDest,id,'Выбор места должен меняться');
  assert.equal(persisted.at(-1).igFlowDest,id,'render должен сохранить изменённый выбор');
}
assert.equal(status.textContent,'Следующее место цепочки: Telegram');
assert.equal(persisted.length,3,'Каждая смена должна инициировать сохранение');
assert(page.includes('store.set(stateKey, S);'),'render обязан сохранять маршрут и место в localStorage');

console.log('Instagram codeword: one risk route, 4 inspected actions, 2 destinations, export, no changes to 65 existing book routes.');
