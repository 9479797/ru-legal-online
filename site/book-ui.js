/* Рекламная оценка продвижения и продажи для первой цели. Без сетевых зависимостей. */
window.BookUI = {
  create({ D, S, esc, curForm, saveBar }) {
    const scopes = { promotion: 'Продвижение', sale: 'Продажа' };
    const channels = [
      ['site', 'Свой сайт', 'Страница материала и предложение о покупке.'],
      ['vkshop', 'Товары VK', 'Карточка товара и условия предложения.'],
      ['market', 'Книжный сервис или маркетплейс', 'Карточка материала в выбранном внешнем сервисе.'],
      ['donut', 'VK Донат', 'Регулярная подписка на материалы и дополнения.'],
      ['tgbot', 'Telegram-бот', 'Предложение материала в боте и условия площадки.']
    ];
    const fmt = () => S.format === 'print' ? 'Печатные материалы' : 'Цифровой файл';
    const selected = () => channels.find(c => c[0] === S.salePlace) || channels[0];
    const list = a => '<ul>' + a.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>';
    const box = (title, content, extra = '') => '<section class="note journey ' + extra + '"><h3>' + esc(title) + '</h3>' + content + '</section>';
    const placeId = p => p?.id || selected()[0];
    const nonPurchase = (b, p) => !b?.republish && !b?.routeFormatCheck?.includes(placeId(p)) && (placeId(p) === 'none' || ['vk','tg'].includes(placeId(p)));
    const incompatible = p => S.format === 'print' && placeId(p) === 'donut';
    function publicationInfo(a, b) {
      if (!b || b.uncommitted) return null;
      const id = b.publicationPlatform || (a?.id === 'bloggers' ? S.publisher || '' : null);
      if (id === null) return null;
      const option = (D.bookPublishers || []).find(p => p.id === id);
      if (!option || id === 'other') return {name:option?.name || 'Не выбрана', risk:'y', needsCheck:true, title:'Уточните площадку публикации', text:'Способ договорённости с блогером не определяет место размещения. Выберите площадку, прежде чем оценивать рекламный путь.'};
      if (id === 'site') return {name:option.name, risk:'g', text:'Это сайт блогера, а не собственный сайт продавца. Отдельно проверьте публикацию, рекламные обязанности и страницу предложения.'};
      const source = D.start.book.find(n => n.id === (id === 'dzen' ? 'rutube' : id));
      if (id === 'instagram') {
        const plannedAd = ['bl-paid','bl-barter','bl-partner'].includes(b.id);
        return {name:option.name,risk:'r',text:plannedAd
          ? 'В этом маршруте заказано рекламное размещение у блогера. Реклама в Instagram запрещена, включая бартер и партнёрское продвижение.'
          : 'Содержание публикации другого автора нужно проверить отдельно. Само упоминание товара не устанавливает рекламный характер, но рекламное размещение в Instagram запрещено.',
          blocked:plannedAd,needsCheck:!plannedAd,
          title:plannedAd ? 'Рекламное размещение в Instagram запрещено' : 'Проверьте публикацию блогера в Instagram'};
      }
      return {name:option.name, risk:source.risk, text:source.details, blocked:false, needsCheck:id === 'tiktok', title:id === 'tiktok' ? 'Подтвердите текущую допустимость рекламы в TikTok' : ''};
    }
    function publicationIssue(a, b) {
      if (b?.why || b?.uncommitted) return null;
      const info = publicationInfo(a, b);
      return info && (info.blocked || info.needsCheck) ? info : null;
    }
    function publicationNotice(a, b) {
      const info = publicationInfo(a, b);
      return info ? box('Площадка публикации: ' + info.name, '<p>' + esc(info.text) + '</p>', info.risk === 'g' ? '' : 'attention') : '';
    }
    function publicationChoice(a) {
      if (a?.id !== 'bloggers') return '';
      return '<div class="note publication-settings"><label for="publisher">Где выйдет публикация?</label><select id="publisher" aria-describedby="publisher-help"><option value="">Не выбрана</option>' + (D.bookPublishers || []).map(p => '<option value="' + esc(p.id) + '"' + (S.publisher === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select><p id="publisher-help">Выберите площадку, на которой блогер расскажет о вашем материале. Место продажи выбирается отдельно. Для взаимного пиара проверьте оба размещения.</p></div>';
    }
    function giftOutcome(b) {
      return box('Результат: книга передана без обязательства обзора', '<p>Публикация и переходы покупателей не гарантированы. Если обзор появится, оцените его отдельно. При договорённости об обязательном размещении выберите бартер.</p>' + list(b.here.can));
    }
    function verification(p, b) {
      if (b?.id === 'tg-ads' && placeId(p) === 'site') return {title:'Telegram Ads: подтвердите страницу назначения', text:'Откройте настройки именно вашего формата Telegram Ads и проверьте, можно ли указать эту страницу сайта. Кнопка должна открывать обещанный материал. Пока поддержка ссылки не подтверждена, схема не показывает этот переход как готовый к запуску.'};
      if (S.format !== 'print' && placeId(p) === 'vkshop') return { title: 'Цифровой файл в «Товарах» VK: требуется проверка', text: 'Проверьте в действующих правилах раздела «Товары», можно ли разместить именно ваш цифровой файл и выбранный способ его продажи. Это условие пока не подтверждено. Это не вывод о законодательном запрете. Для печатных материалов рассматривается отдельная карточка товара.' };
      if (S.format !== 'print' && placeId(p) === 'market') return { title: 'Цифровой материал: уточните сервис', text: 'Выберите конкретный книжный сервис и подтвердите поддержку выбранного формата. Наличие электронных книг на площадке не подтверждает приём произвольного файла от любого продавца. До проверки путь к оформлению здесь не подтверждён; это не законодательный запрет цифровых книг.' + (b?.marketReview ? ' Для перехода из VK также проверьте условия ссылки, а для VK Рекламы — поддержку внешней карточки выбранным форматом.' : '') };
      if (placeId(p) === 'market' && b?.marketReview) return { title: 'Переход на маркетплейс: проверьте условия', text: 'Уточните конкретный маркетплейс и карточку книги. Для VK Рекламы проверьте поддержку внешней ссылки выбранным форматом объявления; для цифрового файла — также правила его размещения на маркетплейсе. После подтверждения условий маршрут ведёт к карточке предложения.' };
      if (b?.routeFormatCheck?.includes(placeId(p))) return {title:'Подтвердите ссылку выбранного рекламного формата',text:b.routeConditions[placeId(p)] + ' В настройках выбранного объявления проверьте допустимый тип ссылки и откройте её как читатель. Пока это условие не подтверждено, схема не показывает готовый переход к заказу.'};
      return null;
    }
    const verificationBox = q => box(q.title, '<p>' + esc(q.text) + '</p>', 'attention');
    const serviceConditions = p => placeId(p) === 'donut' ? 'До подключения подтвердите действующие правила Доната для своего сообщества, включая возрастные ограничения. Актуальный текст этих условий пока не подтверждён; схема показывает модель подписки, а не готовность конкретного сообщества к запуску.' : '';
    const productName = p => placeId(p) === 'donut' && S.format !== 'print' ? 'Доступ по подписке' : fmt();
    function sampleItems(p) { return ['Указать объём бесплатного фрагмента и способ получения.', 'Отделить отправку фрагмента от необязательной подписки на рекламные письма.', placeId(p) === 'donut' ? 'Дать переход к условиям подписки: состав материалов, период доступа и регулярность платежей.' : 'Дать понятный переход к полной версии с её ценой и условиями.']; }
    function saleItems() {
      return ['Оценить содержание, оформление и контекст предложения: является ли конкретный материал рекламой.', 'Проверить описание продукта, цену и заявленные условия; сведения в объявлении и в месте продажи должны согласовываться.', 'Для рекламного материала определить применимые требования к содержанию, сведениям о рекламодателе и продавце, маркировке и учёту.', 'Отдельно проверить заявления о результате, скидках, сроках и доступности предложения.', 'До приёма оплаты отдельно проверить условия покупки и возврата, способ оплаты, необходимые документы и работу с данными покупателя.'];
    }
    function paymentPath(b, p) {
      const sample = S.sample || (b && b.sample);
      const id = placeId(p);
      const path = id === 'donut' ? ['Предложение подписки', 'Состав, цена и период подписки', 'Условия подключения и прекращения'] : [id === 'tgbot' ? 'Читатель открывает описание в боте' : id === 'vkshop' ? 'Читатель открывает карточку в VK' : id === 'market' ? 'Читатель открывает карточку в выбранном сервисе' : 'Читатель открывает страницу на вашем сайте', 'Смотрит состав, формат и цену', id === 'tgbot' ? 'Переход к оформлению заказа в боте' : 'Решает, переходить ли к заказу'];
      return (sample ? ['Бесплатный фрагмент'] : []).concat(path);
    }
    function pathway(items) { return '<ol class="journey-path">' + items.map(t => '<li>' + esc(t) + '</li>').join('') + '</ol>'; }
    function navigation() {
      return '<div class="journey-nav"><button type="button" class="wbtn" data-book-scope="'+(S.scope==='promotion'?'sale':'promotion')+'">'+(S.scope==='promotion'?'Посмотреть условия в месте продажи':'Вернуться к собранной связке')+'</button></div><p class="sub">'+(S.scope==='promotion'?'Откроется раздел «Продажа». Если вы выбрали конкретное место заказа, оно сохранится.':'Откроется выбор площадки и способа продвижения. Ранее выбранная связка сохранится.')+'</p>';
    }
    function buyerExample(p) {
      const print=S.format==='print', id=placeId(p);
      if(id==='donut')return 'Читатель видит: «Подписчикам доступны памятки и новая таблица каждый месяц». Он знакомится с составом доступа, ценой, периодом оплаты и условиями прекращения подписки.';
      if(id==='tgbot')return print ? 'Читатель выбирает в боте комплект печатных памяток. Бот показывает состав и цену. До оплаты покупатель должен понимать, что заказывает печатный комплект, а не файл.' : 'Читатель выбирает в боте памятку PDF, смотрит описание и цену. Если цифровая покупка совершается внутри бота, Telegram требует оплату в Stars — внутренних единицах сервиса.';
      if(id==='market')return print ? 'Читатель открывает карточку комплекта печатных памяток в выбранном сервисе. По фотографиям и описанию он видит состав, формат и цену, затем может начать оформление заказа.' : 'Например, у вас PDF с таблицами. Сначала нужно узнать, принимает ли выбранный сервис именно такой файл от такого продавца. Наличие чужих электронных книг на площадке этого не подтверждает.';
      if(id==='vkshop')return print ? 'В карточке «Комплект из пяти печатных памяток А5» показаны фотографии, состав и цена. Читатель понимает, что заказывает именно этот комплект.' : 'Например, вы предлагаете PDF, а не печатный экземпляр. Нужно подтвердить правила цифровых товаров в каталоге VK; переименование файла в «печатную памятку» проблему не решает.';
      return print ? 'На вашем сайте человек видит комплект печатных памяток: фотографии, количество, размер и цену. Кнопка «Заказать» открывает форму заказа этого комплекта.' : 'На вашем сайте человек видит: «Памятка PDF, 12 страниц», оглавление, образец таблицы и цену. Кнопка «Заказать» открывает форму заказа этого файла.';
    }
    function exampleBox(p) { return '<div class="guide-example"><h4>Пример: что увидит читатель</h4><p>'+esc(buyerExample(p))+'</p></div>'; }
    function boundaryNote() { return '<details class="scope-help"><summary>Что ещё нужно проверить перед приёмом оплаты</summary><p>Эта схема объясняет публикации и описание предложения. Она не подключает оплату и не оформляет документы за продавца. До запуска отдельно проверьте условия покупки и возврата, способ оплаты, выдачу нужного покупателю документа и работу с его данными.</p></details>'; }

    function outcome(b, p) {
      if (nonPurchase(b, p)) return box(placeId(p) === 'none' ? 'Результат без перехода к покупке' : 'Результат: переход к информации', '<p>' + esc(placeId(p) === 'none' ? (/promo/.test(b?.id || '') ? 'Человек ознакомился с условиями участия в розыгрыше. Покупка в этот результат не включена.' : 'Человек получил ответ или полезную информацию. Переход к заказу в этот результат не включён.') : 'Человек открывает «' + p.name + '». Здесь маршрут перехода заканчивается. Сам по себе переход не означает покупку. Для проверки предложения выберите раздел «Продажа» и фактическое место заказа.') + '</p><p>' + esc(b?.routeConditions?.[placeId(p)] || '') + '</p>' + navigation());
      if (incompatible(p)) return box('Подписка и печатный экземпляр — разные продукты', '<p>Донат открывает доступ к материалам. Для заказа и доставки печатных материалов выберите другое место продажи.</p>' + navigation());
      const q = verification(p, b);
      if (q) return verificationBox(q) + exampleBox(p) + ((S.sample || b?.sample) ? box('Бесплатный фрагмент', list(sampleItems(p))) : '') + navigation();
      const transfer = b && b.transfer;
      const republish = b && b.republish;
      const title = republish ? 'Результат: публикация копии' : transfer ? 'Результат: перенос аудитории' : placeId(p) === 'donut' ? 'Как работает подписка' : 'Что произойдёт после перехода';
      const content = republish ? '<p>Копия ролика опубликована на площадке «' + esc(p.name) + '». Переход зрителей из исходного канала этим не подтверждён. Для переноса аудитории отдельно проверьте сообщение о другом канале и ссылку на него.</p>' : transfer ? '<p>Человек переходит в «' + esc(p.name) + '». Этот маршрут может завершаться здесь. Если нужно разобрать покупку, отдельно выберите раздел «Продажа» и фактическое место заказа.</p>' : pathway(paymentPath(b, p)) + ((S.sample || b?.sample) ? '<details><summary>Что предусмотреть для бесплатного фрагмента</summary>' + list(sampleItems(p)) + '</details>' : '') + exampleBox(p) + '<p>Открытие страницы и даже формы заказа ещё не означает оплату. Здесь показано, какое предложение увидит человек после вашей публикации.</p>' + boundaryNote();
      return box(title, content + (serviceConditions(p) && !transfer && !republish ? '<p>' + esc(serviceConditions(p)) + '</p>' : '') + navigation());
    }
    function renderStage() {
      const section = scopes[S.scope];
      const chosen=S.saleChosen!==false;
      const origin=(D.start.book||[]).find(n=>n.id===S.path?.[0]);
      const method=origin?.children?.find(n=>n.id===S.path?.[1]);
      const context=box(chosen?'Вы проверяете предложение: '+selected()[1]:'Выберите, где размещено предложение', '<p>'+esc(origin&&method?'Вы перешли из связки: '+origin.name+' → '+method.name+'.':'Вы открыли раздел проверки предложения в месте продажи.')+'</p><p>Здесь разбираем описание материала, цену и условия, которые увидит покупатель.</p><button type="button" class="wbtn" data-book-scope="promotion">Вернуться к собранной связке</button>', 'sale-context');
      const cards = channels.map(([id, title, desc]) => '<button type="button" class="sale-choice' + (chosen && selected()[0] === id ? ' chosen' : '') + '" data-sale-place="' + id + '" aria-pressed="' + (chosen && selected()[0] === id) + '"><b>' + esc(title) + '</b><span>' + esc(desc) + '</span></button>').join('');
      const choices=box('Где покупатель увидит ваше предложение?', '<p>Выберите сайт, каталог, подписку или бота. После выбора ниже появятся пояснение и пример для этого места.</p><div class="sale-choices">' + cards + '</div>');
      if(!chosen) return context + choices;
      return context + choices +
        (incompatible() ? box('Подписка и печатный экземпляр — разные продукты', '<p>Донат открывает доступ к материалам. Для продажи и доставки печатных материалов выберите сайт, карточку VK, маркетплейс или отдельно проверяемую модель бота.</p>') : verification() ? verificationBox(verification()) + exampleBox() + (S.sample ? box('Бесплатный фрагмент', list(sampleItems())) : '') :
        box('Предложение в месте продажи', pathway(paymentPath()) + exampleBox()) +
        box('Что проверить в предложении', list(saleItems())) +
        ((S.sample && S.scope === 'sale') ? box('Необязательный бесплатный фрагмент', list(sampleItems())) : '')) +
        (serviceConditions() && !incompatible() ? box('Условия сервиса требуют подтверждения', '<p>' + esc(serviceConditions()) + '</p>', 'attention') : '') +
        (selected()[0] === 'tgbot' ? box('Где покупатель будет платить?', '<p>' + (S.format==='print' ? 'Вы выбрали печатные материалы. Правило Telegram Stars для цифровых покупок нельзя автоматически переносить на этот формат.' : 'Если вы продаёте файл внутри Telegram-бота, Telegram требует оплату в Stars — внутренних единицах сервиса. Если бот открывает сайт с отдельным предложением, выберите «Свой сайт» и проверьте, где фактически происходит продажа. Одна внешняя ссылка не подтверждает соблюдение правил Telegram.') + '</p>', 'attention') : '') +
        boundaryNote() + navigation() + saveBar();
    }
    function summaryBlocks(b, p, a) {
      const blocks = [['Раздел и формат', [scopes[S.scope] + ' · ' + fmt()]]];
      if (b?.uncommitted) { blocks.push(['Результат', ['Книга передана без обязательства обзора. Публикация и переходы покупателей не гарантированы. Если обзор появится — оцените его отдельно.']]); return blocks; }
      const publication = publicationInfo(a, b);
      if (publication) blocks.push(['Фактическая площадка публикации', [publication.name, publication.text]]);
      const issue = publicationIssue(a, b);
      if (issue) { blocks.push(['Статус маршрута', [issue.title, issue.blocked ? 'Рекламный путь здесь не продолжается.' : 'Готовность рекламного размещения не подтверждена.']]); return blocks; }
      if (a && ['telegram', 'youtube'].includes(a.id)) blocks.push(['Риск исходной площадки', [a.details]]);
      if (a && ['instagram', 'tiktok'].includes(a.id)) blocks.push(['Условия исходной площадки', [a.details]]);
      if (S.scope === 'promotion' && (!b || (b.dest && !b.dest.includes(p?.id)))) { blocks.push(['Маршрут не завершён', ['Выберите способ и результат на следующих шагах. Переход к заказу ещё не выбран.']]); return blocks; }
      if (b?.why) { blocks.push(['Результат', [b.review ? 'Требуется проверка. Маршрут покупки не подтверждён.' : 'Предупреждающий тупик. Путь покупки здесь не продолжается.']]); return blocks; }
      if (nonPurchase(b, p)) { blocks.push(['Результат', [placeId(p) === 'none' ? 'Ответ или публикация без перехода к покупке.' : b?.transfer ? 'Перенос аудитории в «' + p.name + '». Покупка в этот итог не включена.' : 'Переход к информации в «' + p.name + '». Покупка в этот итог не включена.', b?.routeConditions?.[placeId(p)] || 'Место заказа проверяется отдельно.']]); return blocks; }
      if (incompatible(p)) { blocks.push(['Несовместимая модель', ['Донат открывает подписной доступ, а не продаёт и доставляет печатный экземпляр. Выберите место заказа книги.']]); return blocks; }
      const q = verification(p, b);
      if (q) { blocks.push([q.title, [q.text]], ['Пример: что увидит читатель', [buyerExample(p)]]); if (S.sample || b?.sample) blocks.push(['Бесплатный фрагмент', sampleItems(p)]); return blocks; }
      if (b?.republish) blocks.push(['Результат', ['Копия ролика опубликована на площадке «' + p.name + '». Переход аудитории этим не подтверждён; покупка в этот итог не включена.']]);
      else if (b?.transfer) blocks.push(['Результат', ['Перенос аудитории в «' + p.name + '». Покупка в этот итог не включена.']]);
      else {
        blocks[0][1] = [scopes[S.scope] + ' · ' + productName(p)];
        blocks.push([placeId(p) === 'donut' ? 'Путь подписчика' : 'Путь до оформления заказа', paymentPath(b, p)]);
        blocks.push(['Пример: что увидит читатель', [buyerExample(p)]]);
        if (serviceConditions(p)) blocks.push(['Условия сервиса требуют подтверждения', [serviceConditions(p)]]);
        if (S.sample || b?.sample) blocks.push(['Бесплатный фрагмент', sampleItems(p)]);
      }
      return blocks;
    }
    function summary() {
      if(S.saleChosen===false) return {title:'Проверка предложения',path:'Место предложения не выбрано',blocks:[['Следующий шаг',['Выберите сайт, каталог, подписку или бота. Итог для конкретного места ещё не сформирован.']]],legal:'Рабочая версия 25.11.2026. Это разбор, а не юридическое заключение.'};
      if (incompatible() || verification()) return { title: scopes[S.scope] + ' · ' + fmt(), path: selected()[1], blocks: summaryBlocks(), legal: 'Рабочая версия 25.11.2026 · v10. Пояснения и примеры. Это разбор, а не юридическое заключение.' };
      return { title: scopes[S.scope] + ' · ' + productName() + ' · ' + curForm().name, path: selected()[1], blocks: summaryBlocks().concat([['Проверка предложения', saleItems()]]), legal: 'Рабочая версия 25.11.2026 · v10. Пояснения и примеры. Это разбор, а не юридическое заключение. Платежи, договоры и нерешённые условия сервисов проверяются под конкретную модель.' };
    }
    return { renderStage, outcome, summaryBlocks, summary, navigation, nonPurchase, incompatible, verification, publicationInfo, publicationIssue, publicationNotice, publicationChoice, giftOutcome };
  }
};
