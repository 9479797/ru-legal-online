/* Единая схема: миграция выбора и отсутствие переключателя вариантов. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const legacy=fs.readFileSync(__dirname+'/../risk.html','utf8');
assert(!html.includes('id="route-mode"'),'Меню «Варианты связки» должно быть удалено');
assert(html.includes('data-route-mode="all"'),'Все варианты должны показываться вместе');
assert(html.includes("platforms((D.start[S.goal] || []).map(resolve), 'all', S.goal"),'Интерфейс должен выбирать все карточки');
assert(!html.includes('function changeRouteMode('),'Переключатель двух схем больше не нужен');
assert(legacy.includes("window.location.replace('index.html')"),'Старый risk.html должен вести к общей схеме');
const start=html.indexOf("const stateKey = 'skhema-state-all';");
const end=html.indexOf("if(typeof S.saleChosen !== 'boolean')",start);
assert(start>=0 && end>start,'Блок восстановления выбора должен существовать');
const restore=(data)=>{
  const c={store:{get:(k,d)=>k in data?JSON.parse(JSON.stringify(data[k])):d}};
  vm.runInNewContext(html.slice(start,end)+'\nglobalThis.current=S;globalThis.storageKey=stateKey;',c);
  return {state:c.current,key:c.storageKey};
};
const ordinary={goal:'book',form:'ip',scope:'promotion',path:['vk','vk-expert','site'],format:'file'};
const risk={goal:'book',form:'ip',scope:'promotion',path:['youtube','yt-blogger'],format:'print'};
let out=restore({'skhema-state-ordinary':ordinary,'skhema-state-risk':risk});
assert.equal(out.key,'skhema-state-all');
assert.equal(out.state.path.join('/'),'vk/vk-expert/site','При объединении не терять более полный выбранный маршрут');
assert.equal(out.state.format,'file');
out=restore({'skhema-state-ordinary':ordinary,'skhema-state-risk':{...risk,path:['youtube','yt-blogger','site','extra']}});
assert.equal(out.state.path.join('/'),'youtube/yt-blogger/site/extra','Сохранить более полный рискованный маршрут');
const unified={goal:'book',path:['telegram','tg-ads','tg'],scope:'promotion',form:'ip',format:'file'};
out=restore({'skhema-state-all':unified,'skhema-state-ordinary':ordinary,'skhema-state-risk':risk});
assert.equal(out.state.path.join('/'),'telegram/tg-ads/tg','Уже сохранённый единый маршрут приоритетнее старых режимов');
console.log('Unified scheme: no route-mode menu, legacy URL redirects, saved choices migrate.');
