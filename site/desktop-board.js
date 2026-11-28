/* Presentation only: preserve every route, separate existing risk categories. */
(function(root){
 /* Вкладка описывает правовой статус действия, а не запрет площадки.
    Зелёный или жёлтый статус ребёнка не наследует автоматически риск родителя. */
 const restrictedAdResources=new Set(['telegram','tg','youtube','tiktok']);
 function isRisk(p,n,goal){
   if(!n) return p.risk==='r'||p.risk==='y';
   if(n.section==='risk') return true;
   if(n.section==='ordinary') return false;
   if(n.risk==='r'||n.review) return true;
   // Информация о собственных продуктах на своей странице Instagram
   // оценивается отдельно от рекламы и не попадает в запрещённые маршруты.
   if(p.id==='instagram') return false;
   if(restrictedAdResources.has(p.id)){
     // Продажа рекламных размещений здесь остаётся рискованной даже при
     // прежнем зелёном статусе шаблонных карточек "договор"/"биржа".
     if(goal==='adsell') return true;
     // Для других целей жёлтый сценарий означает рекламный риск ресурса.
     return n.risk==='y';
   }
   // VK, Директ, Rutube, сайт, база и работа с партнёрами
   // не становятся запрещёнными из-за обычных условий размещения.
   return false;
 }
 // Один список во всех трёх колонках: красный → жёлтый → обычный.
 // Сортировка стабильная и не меняет исходные объекты/маршруты.
 const riskOrder={r:0,y:1,g:2};
 function riskFirst(nodes){
   return nodes.map((n,i)=>({n,i})).sort((a,b)=>
     (riskOrder[a.n.risk]??3)-(riskOrder[b.n.risk]??3) || a.i-b.i
   ).map(x=>x.n);
 }
 function allPlatforms(nodes){
   return riskFirst(nodes.map(p=>p.children
     ? {...p,children:riskFirst(p.children)}
     : p));
 }
 function platforms(nodes,mode,goal){
   if(mode==='all') return allPlatforms(nodes);
   return nodes.map(p=>{
     if(!p.children) return p;
     const children=p.children.filter(n=>isRisk(p,n,goal)===(mode==='risk'));
     if(mode!=='risk') return {...p,children};
     if(p.risk==='g'){
       const allowedPlatform=['vk','direct','rutube','site'].includes(p.id);
       return {...p,children,scenarioOnly:true,
         name:p.name + (allowedPlatform?' · риск отдельного объявления':' · риск отдельных действий'),
         short:allowedPlatform
           ? 'Реклама на площадке «'+p.name+'» разрешена. Здесь риск в конкретном объявлении, а не запрет площадки.'
           : 'В этом разделе показаны отдельные нарушения, а не запрет всего способа продвижения.',
         details:allowedPlatform
           ? 'Сама площадка доступна для рекламы. Высокий риск относится только к выбранному объявлению, его содержанию, статусу рекламодателя или соблюдению обязанностей. '+(p.details||'')
           : 'Здесь показаны отдельные опасные действия. Остальные варианты этого канала или способа находятся в обычном разделе. '+(p.details||'')};
     }
     return {...p,children};
   }).filter(p=>p.children?p.children.length:isRisk(p,null,goal)===(mode==='risk'));
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
 root.DesktopBoard={platforms,isRisk,riskFirst,decorate};
})(window);
