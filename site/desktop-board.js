/* Presentation only: preserve every route and show all risks together. */
(function(root){
 /* Вкладка описывает правовой статус действия, а не запрет площадки.
    Зелёный или жёлтый статус ребёнка не наследует автоматически риск родителя. */
 // Единая схема: риск относится к конкретной карточке, не наследуется от дочерних.
 // Красные (r) выше жёлтых (y), жёлтые выше обычных (g).
 const riskRank = n => n?.risk === 'r' ? 0 : n?.risk === 'y' ? 1 : 2;
 function sortNodes(items){
   return [...items].sort((a,b)=>riskRank(a)-riskRank(b));
 }
 function platforms(nodes){
   return sortNodes(nodes.map(p=>p.children ? {...p,children:sortNodes(p.children)} : p));
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
     if(i===2&&!choices&&!stage.classList.contains('board-empty')&&!stage.querySelector('.ig-codeword-flow')){
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
 root.DesktopBoard={platforms,riskRank,sortNodes,decorate};
})(window);
