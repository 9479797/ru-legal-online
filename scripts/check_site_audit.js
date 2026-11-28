/* Audit gate, не юридическое заключение: node scripts/check_site_audit.js
 * --release: запрещает выпуск, если нет 86 проверенных кейсов с источниками.
 * Обычный прогон подтверждает полноту реестра, а не допустимость рекламы.
 */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),site=path.join(root,'site');
const audit=path.join(root,'reviews','ru-reklama-online','site-route-audit','2026-11-28');
const C={window:{}};
for(const file of ['data.js','instagram-legal.js','consult-legal.js','youtube-funnels.js','telegram-funnels.js','route-matrix.js']){
  vm.runInNewContext(fs.readFileSync(path.join(site,file),'utf8'),C,{filename:file});
}
const D=C.window.SCHEMA;
const register=JSON.parse(fs.readFileSync(path.join(audit,'registry-v1.json'),'utf8'));
const sources=JSON.parse(fs.readFileSync(path.join(audit,'sources-v1.json'),'utf8'));
const issues=[];
const actual=D.start.book.flatMap(p=>(p.children||[]).map(n=>({key:p.id+'/'+n.id,p,n})));
const byKey=new Map(register.methods.map(x=>[x.platform_id+'/'+x.method_id,x]));
const byId=new Map(D.routeMatrix.rows.map(x=>[x.platform+'/'+x.method,x]));
if(actual.length!==register.methods.length)issues.push('Методов в коде и реестре разное количество');
if(byKey.size!==register.methods.length)issues.push('Повторяющиеся ID в реестре');
if(sources.sources.length===0)issues.push('Пустой реестр источников');
const counts={conditional:0,'not-applicable':0,terminal:0};
for(const {key,p,n} of actual){
 const item=byKey.get(key),row=byId.get(key);
 if(!item){issues.push('Нет паспорта '+key);continue}
 if(!row){issues.push('Нет матрицы '+key);continue}
 const dest=row.destinations.filter(x=>x.state==='conditional').map(x=>x.id);
 if(item.title!==n.name)issues.push('Устарело название '+key);
 if(item.ui_risk!==n.risk)issues.push('Устарел риск интерфейса '+key);
 if(JSON.stringify(item.possible_destinations)!==JSON.stringify(dest))issues.push('Устарели назначения '+key);
 if(item.matrix_cells!==row.destinations.length)issues.push('Неверное число ячеек '+key);
 if(item.legal_audit_status!=='NOT_REVIEWED'){
   if(!item.last_legal_approval||!item.case_approval||item.source_evidence==='NOT_LINKED_PER_CASE')
     issues.push('Заявлена правовая приёмка без доказательств '+key);
 }
 for(const target of row.destinations){
   if(!(target.state in counts))issues.push('Неизвестное состояние матрицы '+key+': '+target.state);
   else counts[target.state]++;
 }
}
for(const item of register.methods){
 const key=item.platform_id+'/'+item.method_id;
 if(!actual.some(x=>x.key===key))issues.push('Лишний паспорт '+key);
}
for(const [state,count] of Object.entries(counts))
 if(register.matrix[state]!==count)issues.push('Неверный итог '+state+' : '+register.matrix[state]+' / '+count);
if(actual.length!==register.matrix.methods)issues.push('Не совпадает сумма методов');
if(counts.conditional+counts['not-applicable']+counts.terminal!==register.matrix.cells)issues.push('Не совпадает сумма ячеек');
const get=(platform,id)=>D.start.book.find(p=>p.id===platform)?.children.find(x=>x.id===id);
if(get('telegram','tg-ads').dest.includes('site'))issues.push('В базовом Telegram Ads запрещён прямой сайт');
if(!get('telegram','tg-gift').uncommitted)issues.push('Подарок Telegram ошибочно гарантирует обзор');
if(!get('youtube','yt-gift').uncommitted)issues.push('Подарок YouTube ошибочно гарантирует обзор');
if(!get('tiktok','tt-gift-independent').uncommitted)issues.push('Подарок TikTok ошибочно гарантирует обзор');
const index=fs.readFileSync(path.join(site,'index.html'),'utf8');
if(!index.includes('data-route-mode="all"'))issues.push('Единая схема не включена');
if(index.includes('id="route-mode"'))issues.push('Старый переключатель всё ещё виден');
const unapproved=register.methods.filter(m=>m.legal_audit_status!=='CASE_VERIFIED_WITH_CONDITIONS'&&m.legal_audit_status!=='BLOCKED');
if(process.argv.includes('--release')&&unapproved.length)issues.push('Выпуск запрещён: нет индивидуальной приёмки '+unapproved.length+' способов');
console.log(JSON.stringify({methods:actual.length,matrix_cells:register.matrix.cells,states:counts,source_documents:sources.sources.length,unapproved:unapproved.length,issues:issues.length,mode:process.argv.includes('--release')?'release':'inventory'},null,2));
if(issues.length){console.error(issues.join('\n'));process.exit(1);}
