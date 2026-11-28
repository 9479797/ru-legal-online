/* Переключение режимов в рамках одной страницы без потери выбора каждого режима. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const db={
  'skhema-state-ordinary':{goal:'book',form:'self',path:['vk','vk-reply','site'],scope:'promotion',format:'file',sample:false},
  'skhema-state-risk':{goal:'book',form:'ip',path:['youtube','yt-blogger','site'],scope:'promotion',format:'print',sample:true}
};
const clone=x=>JSON.parse(JSON.stringify(x));
const store={get:(k,d)=>db[k]===undefined?d:clone(db[k]),set:(k,v)=>db[k]=clone(v)};
const D={forms:[{id:'self'},{id:'ip'}],goals:[{id:'book'}],bookPublishers:[]};
const control={value:'ordinary'},status={textContent:''},doc={body:{dataset:{routeMode:'ordinary'}}};
let renders=0,cancels=0;
const c={D,store,routeMode:'ordinary',stateKey:'skhema-state-ordinary',document:doc,
  $:s=>s==='#route-mode'?control:status,
  motion:{cancelScroll(){cancels++;}},
  dlg:{open:false,close(){}},render(){renders++;}};
vm.createContext(c);
vm.runInContext(html.slice(html.indexOf('let S = Object.assign('),html.indexOf('const bookUI = '))+'\nglobalThis.state=S;',c);
vm.runInContext(html.slice(html.indexOf('function changeRouteMode('),html.indexOf('function openRiskOptions(')),c);
const identity=c.state;
assert.equal(identity.goal,'book');
assert.equal(identity.path.join('/'),'vk/vk-reply/site');
c.changeRouteMode('risk');
assert.strictEqual(c.state,identity,'Вложенный интерфейс должен сохранить ссылку на объект состояния');
assert.equal(c.state.path.join('/'),'youtube/yt-blogger/site');
assert.equal(doc.body.dataset.routeMode,'risk');
assert.equal(control.value,'risk');
c.state.path=['youtube','yt-affiliate','site'];
c.changeRouteMode('ordinary');
assert.equal(c.state.path.join('/'),'vk/vk-reply/site');
assert.equal(c.state.format,'file');
c.changeRouteMode('risk');
assert.equal(c.state.path.join('/'),'youtube/yt-affiliate/site');
assert.equal(c.state.sample,true);
const prev=renders;
c.changeRouteMode('risk');assert.equal(renders,prev,'Повторный выбор не должен перезагружать страницу');
assert.equal(renders,3);assert.equal(cancels,3);
assert(!html.includes("window.location.assign(next === 'risk'"),'Не открывать второй HTML-документ');
console.log('One-page route-mode navigation: both selections restored, no document reload.');
