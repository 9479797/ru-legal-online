/* Полнота окончаний первой цели. Это карта сценариев, не разрешение размещения. */
(function () {
  const D = window.SCHEMA;
  const targets = ['none','site','vk','vkshop','tg','market','donut','tgbot','rutube'];
  const offers = ['site','vk','vkshop','tg','market','donut','tgbot'];
  const informational = new Set(['author','bio','source','dm','tg-expert','tg-reply','vk-expert','vk-reply','yt-expert','rt-expert','tt-expert','tt-bio','tt-dm','book-site-page','book-site-article','book-site-sample']);
  const external = new Set(['tg-post','tg-posev','vk-post','vk-mail','vk-ads','vk-adblogger','vk-posev','yt-desc','yt-blogger','rt-desc','dzen-promo','rt-blogger','tt-video','tt-blogger','bl-paid','bl-barter','bl-partner','bl-mutual','dir-search','dir-rsya','dir-retarget','dir-tg','book-site-email']);
  const fixed = {
    'tglink':['tg'], 'tg-move':['vk'], 'vk-tg':['tg'], 'book-yt-tg':['tg'], 'book-tt-tg':['tg'],
    'yt-move':['vk','rutube'], 'tt-move':['vk','rutube'],
    'vk-shop':['vkshop'], 'vk-donut':['donut'], 'book-market-card':['market'], 'book-market-ads':['market'],
    'tg-bot':['tgbot','site'], 'tg-ads':['tg','tgbot','site'],
    'tg-promo':['none','site','vkshop','market'], 'vk-promo':['none','site','vkshop','market']
  };
  const conditions = {
    none:'Без перехода к покупке: ответ, полезная публикация или условия розыгрыша имеют самостоятельный результат.',
    site:'Описание и условия на сайте должны соответствовать публикации. Оцените рекламный характер конкретного материала.',
    vk:'Это переход в сообщество, а не подтверждённая покупка. Место заказа выбирается отдельно.',
    tg:'Это переход в канал, а не подтверждённая покупка. Риск рекламы в Telegram сохраняется.',
    vkshop:'Проверьте конкретную карточку и формат. Для цифрового файла правила каталога пока не подтверждены.',
    market:'Выберите конкретный сервис, карточку и поддерживаемый формат материала. Для файла маршрут остаётся условным.',
    donut:'Это подписной доступ к материалам. Печатный экземпляр через эту модель не предлагается; условия сервиса требуют проверки.',
    tgbot:'Проверьте правила Telegram и содержание предложения. Для цифровых продаж внутри бота применяются правила Stars; оформление заказа проверяется отдельно.',
    rutube:'Публикация копии ролика. Переход аудитории и покупка этим не подтверждаются.'
  };
  D.bookPlaces.none = {
    name:'Без перехода к покупке',risk:'g',short:'Ответить на вопрос или дать полезную информацию без ссылки на заказ.',
    details:'Не каждый вопрос или полезная публикация должен вести к покупке. Например: читатель спрашивает, какие темы разобраны, а автор отвечает списком тем. Рекламный характер и условия исходного сообщения всё равно оцениваются отдельно.',
    can:['Завершить ответ или публикацию без предложения покупки'],cannot:['Считать любой личный ответ разрешением на последующую рекламную рассылку'],check:[],fines:[]
  };
  for (const [id,title] of [['vk','Свое сообщество в VK'],['tg','Свой канал в Telegram']]) {
    const p=D.bookPlaces[id];p.name=title;p.short='Переход к информации в '+(id==='vk'?'сообществе':'канале')+'. Место заказа проверяется отдельно.';
  }
  D.bookPlaces.tgbot.name='Предложение материала в Telegram-боте';
  const rows=[];
  for(const a of D.start.book) for(const b of a.children||[]) {
    const previous=(b.dest||[]).slice();
    const rename=t=>t.replace(/Печатная книга/g,'Печатные материалы').replace(/печатная книга/g,'печатные материалы').replace(/печатной книги/g,'печатных материалов').replace(/печатную книгу/g,'печатные материалы').replace(/о книге/g,'о материале').replace(/книги/g,'материала').replace(/книгу/g,'материал');
    a.short=rename(a.short);
    b.name=rename(b.name); b.short=rename(b.short);
    if(a.nextTitle) a.nextTitle=rename(a.nextTitle);
    if(b.id==='tg-expert') b.name='Экспертная публикация в канале';
    if(b.id==='tg-reply') b.short='Ответьте по существу вопроса; ссылка на предложение нужна не всегда.';
    if(b.id==='bl-mutual') b.details='Оцените каждую встречную публикацию по содержанию, оформлению и фактической договорённости. Обмен рекламными размещениями без денежной оплаты не освобождает от рекламных обязанностей. Если конкретный материал признан рекламой, проверьте допустимость площадки, применимость включения страницы в перечень РКН, маркировку и учёт. Обычное экспертное сотрудничество нельзя автоматически приравнивать к рекламе.';
    if(b.id==='bl-mutual') b.here.can=['Согласовать содержание и даты встречных публикаций','Для каждой рекламной публикации определить маркировку и учёт'];
    if(b.id==='bl-partner') b.here.cannot=b.here.cannot.map(x=>x==='Выплаты физлицу без статуса без удержания налога'?'Выплачивать вознаграждение без проверки обязанностей плательщика и статуса получателя':x);
    if(b.id==='bl-partner') b.here.can=b.here.can.map(x=>x==='Отдельный erid под каждого партнёра'?'Определить erid и учёт для фактического креатива и цепочки размещения':x);
    if(b.id==='tg-reply') b.here.can[1]='При необходимости дать ссылку на выбранное предложение после проверки его условий';
    if(b.id==='dir-search') b.here.can=b.here.can.map(x=>x==='Ведёт на страницу памятки на сайте'?'Выбрать подходящую страницу предложения и проверить поддержку ссылки':x);
    if(b.id==='book-site-sample') b.here.can=b.here.can.map(x=>x==='Дать понятный переход к предложению полной версии'?'При необходимости дать понятный переход к предложению полной версии':x);
    const terminal=!!(b.why||b.uncommitted);
    if(!terminal && !fixed[b.id] && !informational.has(b.id) && !external.has(b.id)) throw new Error('Не разобран способ первой цели: '+b.id);
    if(!terminal) b.dest=fixed[b.id] ? fixed[b.id].slice() : (informational.has(b.id)?['none',...offers]:offers.slice());
    const allowed=terminal?[]:b.dest;
    if (['tt-video','tt-blogger'].includes(b.id)) b.publicationPlatform='tiktok';
    b.routeFormatCheck = /^(dir-|vk-ads|vk-adblogger|dzen-promo)/.test(b.id) ? allowed.filter(k=>!previous.includes(k) && k !== 'none') : [];
    b.routeConditions={};
    for(const k of allowed) b.routeConditions[k]=conditions[k]+(b.republish?' Копия должна пройти отдельную оценку содержания на новой площадке.':'')+(/^(dir-|vk-ads|vk-adblogger|dzen-promo|tg-ads)/.test(b.id)?' Подтвердите поддержку такой ссылки выбранным рекламным форматом.':'');
    rows.push({platform:a.id,method:b.id,name:b.name,previous,destinations:targets.map(k=>({id:k,state:allowed.includes(k)?'conditional':terminal?'terminal':'not-applicable',reason:allowed.includes(k)?b.routeConditions[k]:terminal?(b.uncommitted?'Подарок не гарантирует публикацию или переход.':b.review?'Модель требует отдельной проверки; готовое продолжение не подтверждено.':'Предупреждающий маршрут сохраняет запрет; окончание не делает его допустимым.'):'Узкий сценарий: '+(b.republish?'размещение копии':b.transfer?'переход в указанный канал':'действие внутри выбранного сервиса')+'. Для другого действия выберите соответствующий способ.'}))});
  }
  D.routeMatrix={date:'25.11.2026',targets,rows,scope:'Полнота сценариев первой цели; условные переходы не являются правовым разрешением.'};
  D.review.date='25.11.2026';
  D.review.status='Рабочая версия · v9';
  D.review.scope='Сверена матрица окончаний 64 способов первой цели. Добавлены отсутствующие переходы и результат без покупки; переход в канал отделён от заказа. Условия сервисов и спорные правовые вопросы остаются открытыми.';
})();
