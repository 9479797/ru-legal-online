/* Кнопка этапа возвращает к выбору, без автопрокрутки после выбора карточки. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),calls=[];
const list={scrollTop:210,scrollLeft:0,closest:()=>({id:'step-1'})};
const stage={querySelector:()=>list};
const c={S:{scope:'promotion',path:['instagram','author','site'],form:'ip',goal:'book',format:'file',sample:true},
  window:{scrollX:0,scrollY:350,scrollTo:o=>calls.push(['position',o.top])},
  document:{getElementById:()=>stage,querySelectorAll:()=>[list],querySelector:()=>({focus:o=>calls.push(['focus',o.preventScroll])})},
  motion:{cancelScroll:()=>calls.push('cancel')},render:()=>{calls.push('render');list.scrollTop=0;}};
vm.runInNewContext(html.slice(html.indexOf('function returnToChoice('),html.indexOf("document.addEventListener('click'")),c);
assert(!html.includes('scrollToStep('),'Автопрокрутка при выборе карточки удалена');
c.returnToChoice(2);assert.equal(c.S.path.join('/'),'instagram');assert.equal(list.scrollTop,210);
assert.deepEqual(calls,['cancel','render',['position',350],['focus',true]],'Сохраняется исходный экран');
assert.equal(c.S.form,'ip');assert.equal(c.S.goal,'book');assert.equal(c.S.format,'file');assert.equal(c.S.sample,true);
c.returnToChoice(1);assert.equal(c.S.path.join('/'),'','Шаг 1 возвращает к выбору площадки');
c.S.path=['telegram','tg-reply','site'];c.returnToChoice(3);assert.equal(c.S.path.join('/'),'telegram/tg-reply','Шаг 3 возвращает к назначению');
console.log('Stage navigation: return to current choice without autoscroll, preserve settings and viewport.');
