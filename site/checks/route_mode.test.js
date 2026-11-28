/* Единая страница и бережная миграция сохранённых выборов из двух прежних разделов. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const risk=fs.readFileSync(__dirname+'/../risk.html','utf8');
assert(!html.includes('id="route-mode"'),'Селектор двух режимов не удалён');
assert(!html.includes('function changeRouteMode('),'Старая навигация по режимам осталась');
assert(risk.includes("location.replace('index.html')"),'Старый URL должен вести на общую страницу');
const source=html.slice(html.indexOf("const routeMode = 'all';"),html.indexOf("const bookUI = "));
assert(source.includes("const stateKey = 'skhema-state-all'"),'Одна запись настроек');
const D={forms:[{id:'ip'},{id:'self'}],goals:[{id:'book'},{id:'course'}],bookPublishers:[]};
function load(data){
 const db=JSON.parse(JSON.stringify(data));
 const store={get:(k,v)=>db[k]===undefined?v:JSON.parse(JSON.stringify(db[k]))};
 const ctx={D,store};vm.createContext(ctx);vm.runInContext(source+'\nglobalThis.state=S;globalThis.key=stateKey;',ctx);
 return ctx;
}
const legacyRisk={goal:'book',form:'self',path:['instagram','word'],format:'file',sample:true,igFlowDest:'tg'};
const legacyOrd={goal:'course',form:'ip',path:['vk','k-vk-expert'],format:'print',sample:false};
let ctx=load({'skhema-state-risk':legacyRisk,'skhema-state-ordinary':legacyOrd,'skhema-settings':{goal:'course'}});
assert.equal(ctx.key,'skhema-state-all');
assert.equal(ctx.state.path.join('/'),'instagram/word','Рискованный ранее путь не должен пропасть');
assert.equal(ctx.state.goal,'book','Настройки не должны случайно переписать цель');
assert.equal(ctx.state.igFlowDest,'tg','Выбор прототипа сохраняется');
ctx=load({'skhema-state-all':legacyOrd,'skhema-state-risk':legacyRisk});
assert.equal(ctx.state.path.join('/'),'vk/k-vk-expert','Новая единая запись имеет приоритет');
ctx=load({'skhema-settings':{goal:'course',form:'self',format:'print'}});
assert.equal(ctx.state.goal,'course','Первоначальные настройки сохраняются');
console.log('Единый режим: один адрес и ключ хранения, переходы из старых разделов восстановлены.');
