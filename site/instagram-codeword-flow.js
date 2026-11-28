/* Прототип одной связки: рекламный Instagram-пост с кодовым словом
   → ответ в директ → бесплатный PDF → отдельная оценка сайта/Telegram.
   ТОЛЬКО цель book, режим risk, формат file и включённый фрагмент.
   Не выполняет рассылку, не регистрирует рекламу и не обходится с персональными данными.
   Проверено по ст. 3, ч. 10.7 ст. 5 38-ФЗ; письму ФАС № АК/32908/25 (09.04.2025). */
(function(root){
  'use strict';
  const choices = {
    site: {
      title:'Собственный сайт',
      sub:'Страница с описанием полного PDF, ценой и условиями',
      assessment:'Сайт — отдельное место размещения. Описание собственного файла на своей странице может носить справочный характер, а рекламное выделение оценивается отдельно. Запрет уже опубликованной рекламы в Instagram от этого не исчезает.'
    },
    tg: {
      title:'Свой Telegram-канал',
      sub:'Публикация с бесплатным фрагментом и возможной ссылкой на полную версию',
      assessment:'Пост в Telegram проверяется как самостоятельная публикация: собственные сведения не всегда реклама, но рекламный материал требует отдельной оценки ограничений площадки и обязанностей по маркировке. Переход из Instagram запрет исходного рекламного поста не устраняет.'
    }
  };
  function active(S,mode){
    return !!S && (mode==='all'||mode==='risk') && S.scope==='promotion' && S.goal==='book'
      && S.format==='file' && S.sample===true
      && S.path?.[0]==='instagram' && S.path?.[1]==='word';
  }
  function destination(id){return choices[id] ? id : 'site';}
  function steps(id){
    const place=choices[destination(id)];
    return [
      {state:'r',label:'Запрет при рекламном характере',title:'Исходный пост в Instagram',
        text:'В выбранном рискованном примере публикация рекламирует гайд и предлагает написать кодовое слово «ГАЙД». Если это реклама, размещать её в Instagram нельзя, даже когда полную ссылку выдают позже.'},
      {state:'y',label:'Оценить сообщение',title:'Ответ в директ',
        text:'Человек сам написал слово, автор или бот отвечает в пределах запроса. Автоматический ответ не исправляет исходный рекламный пост. Один запрос не равен согласию на дальнейшую рекламную рассылку.'},
      {state:'y',label:'Отдельное действие',title:'Бесплатный фрагмент PDF',
        text:'В ответ отправляются обещанные, например две страницы гайда. Бесплатность не подтверждает законность исходной публикации; дальнейшее рекламное предложение оценивается отдельно.'},
      {state:'y',label:'Оценить другое место',title:'Дальше — '+place.title,
        text:place.assessment}
    ];
  }
  function render({dest,esc}){
    const escape=typeof esc==='function'?esc:x=>String(x);
    const current=destination(dest);
    const cards=steps(current).map((n,i)=>
      '<li class="ig-flow-node ig-flow-'+n.state+'"><span class="ig-flow-count">'+(i+1)+'</span>'+
      '<div><span class="ig-flow-status">'+escape(n.label)+'</span><h4>'+escape(n.title)+'</h4><p>'+escape(n.text)+'</p></div></li>'
    ).join('');
    const targets=Object.entries(choices).map(([id,p])=>
      '<button type="button" class="ig-flow-choice'+(current===id?' chosen':'')+'" data-ig-flow-dest="'+id+
      '" aria-pressed="'+(current===id)+'"><b>'+escape(p.title)+'</b><span>'+escape(p.sub)+'</span></button>'
    ).join('');
    return '<section class="ig-codeword-flow" aria-label="Полный разбор цепочки с кодовым словом">'+
      '<div class="ig-flow-intro"><b>Разбор выбранной рискованной связки</b>'+
      '<p>Цифровой файл + бесплатный фрагмент. Это учебная последовательность, а не инструкция по размещению рекламы в Instagram.</p></div>'+
      '<ol class="ig-flow-steps">'+cards+'</ol>'+
      '<div class="ig-flow-dest"><h4>Выберите место следующей публикации</h4>'+
      '<div class="ig-flow-dest-row" role="group" aria-label="Следующее место после директа">'+targets+'</div></div>'+
      '<p class="ig-flow-caution">Даже если дальнейшее сообщение — справочная информация, оно не делает исходную рекламу в Instagram законной.</p>'+
      '<details class="ig-flow-legal"><summary>Почему нельзя исправить рекламу кодовым словом?</summary>'+
      '<p>Юридически оценивается само распространение исходного сообщения. Перевод ссылки в директ или Telegram не отменяет запрета на рекламу в Instagram по части 10.7 статьи 5 Закона № 38-ФЗ. Для справочных публикаций ФАС учитывает содержание, формат и принадлежность страницы продавцу.</p>'+
      '<p><a href="https://www.consultant.ru/document/cons_doc_LAW_503349/" target="_blank" rel="noopener noreferrer">Письмо ФАС № АК/32908/25</a> · '+
      '<a href="https://www.consultant.ru/document/cons_doc_LAW_58968/f67f81c57fdcdacc2643d19d59369f7e185e1156/" target="_blank" rel="noopener noreferrer">статья 5 Закона о рекламе</a></p>'+
      '</details></section>';
  }
  function summary({dest}){
    const list=steps(dest);
    return [['Проверка цепочки: Instagram → директ → бесплатный PDF → следующее место',
      list.map((n,i)=>(i+1)+'. '+n.title+' — '+n.label+'. '+n.text)],
      ['Правовой итог',['Рекламный исходный пост в Instagram запрещён. Кодовое слово, личный ответ, бесплатный PDF и переход на другую площадку запрет не снимают. Если исходная публикация фактически не реклама — её требуется оценить как самостоятельный информационный сценарий.']]];
  }
  root.InstagramCodewordFlow={active,destination,steps,render,summary};
})(window);