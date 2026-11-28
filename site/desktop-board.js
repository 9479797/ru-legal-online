/* Presentation only: preserve every route, separate existing risk categories. */
(function(root){
 const isRisk=(p,n)=>p.risk!=='g'||n?.risk==='r'||!!n?.review;
 function platforms(nodes,mode){
   return nodes.map(p=>p.children ? {...p,...(mode==='risk'&&p.risk==='g'?{name:p.name+' · опасные действия',details:'В этом разделе показаны действия с высоким риском, а не все варианты на площадке. '+(p.details||'')}:{}),children:p.children.filter(n=>isRisk(p,n)===(mode==='risk'))} : p)
     .filter(p=>p.children?p.children.length:isRisk(p)===(mode==='risk'));
 }
 function decorate(host, context={}){
   const stages=[1,2,3].map(n=>host.querySelector('#step-'+n));
   if(!stages[0])return;
   const board=document.createElement('div');board.className='route-board';board.setAttribute('aria-label','Обзор трёх этапов');
   const titles=['Площадка',context.goal==='book'?'Как вы рассказываете о материале':'Как вы привлекаете аудиторию','Чем заканчивается связка'];
   stages.forEach((stage,i)=>{
     if(!stage){stage=document.createElement('section');stage.className='step board-empty';stage.innerHTML='<div class="sh"><span class="num">0'+(i+1)+'</span><h2>'+titles[i]+'</h2></div><p>Выберите '+(i===1?'площадку в первой колонке.':'способ рассказать о материале во второй колонке.')+'</p>';}
     if(i===1 && context.platform) stage.dataset.brand=context.platform;
     const title=stage.querySelector('h2');
     if(title){title.setAttribute('aria-label',title.textContent);title.textContent=titles[i];}
     const choices=stage.querySelector(':scope > .row:has(> .opt)');
     if(choices){choices.classList.add('board-choices');choices.setAttribute('aria-label','Варианты: '+titles[i]);}
     if(i===2&&!choices&&!stage.classList.contains('board-empty')){
       const original=document.createElement('div');original.id='board-terminal';original.hidden=true;
       [...stage.children].filter(x=>!x.classList.contains('sh')).forEach(x=>original.append(x));
       const titleText=title?.getAttribute('aria-label')||'Разбор выбранного действия';
       stage.insertAdjacentHTML('beforeend','<div class="board-terminal-label"><b></b><p>Для этого действия нет обычного продолжения к покупке. Откройте объяснение и возможную альтернативу.</p><button type="button" class="cta" data-open-terminal>Открыть разбор</button></div>');
       stage.querySelector('.board-terminal-label b').textContent=titleText;stage.append(original);
     }
     board.append(stage);
   });
   host.prepend(board);
   const outcome=host.querySelector('#step-4');
   if(outcome){outcome.hidden=true;stages[2]?.insertAdjacentHTML('beforeend','<div class="board-result-action"><span>Связка собрана</span><button type="button" class="cta" data-open-result>Посмотреть итог</button></div>');}
 }
 root.DesktopBoard={platforms,isRisk,decorate};
})(window);
