/* TikTok 28.11.2026: audit all nine existing groups without inventing a ban or losing links. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../',ctx={window:{}};
const load=p=>vm.runInNewContext(fs.readFileSync(root+p,'utf8'),ctx,{filename:p});
for(const p of ['data.js','instagram-legal.js','consult-legal.js'])load(p);
const before=JSON.parse(JSON.stringify(ctx.window.SCHEMA.start));
load('tiktok-legal.js');
const D=ctx.window.SCHEMA;
assert.equal(D.tiktokLegal.checked,'28.11.2026');
assert.equal(D.tiktokLegal.groups,9);
assert.equal(D.tiktokLegal.variants,59);
let examined=0;
const ids=arr=>arr.map(n=>n.id).join('|');
for(const [goal,roots] of Object.entries(D.start)){
 const t=roots.find(n=>n.id==='tiktok'),old=before[goal].find(n=>n.id==='tiktok');
 assert.equal(!!t,!!old,'TikTok group created or removed in '+goal);
 const originalOther=before[goal].filter(n=>n.id!=='tiktok');
 const newOther=roots.filter(n=>n.id!=='tiktok');
 assert.equal(JSON.stringify(newOther),JSON.stringify(originalOther),'Other platform changed: '+goal);
 if(!t)continue;
 assert.equal(t.risk,'y','TikTok must not be labelled banned platform: '+goal);
 assert.equal(t.fines.length,0,'Platform must not automatically trigger sanctions: '+goal);
 assert(t.details.includes('не доказательство ограничения доступа'),'Mixing service and RKN limits: '+goal);
 assert.equal(ids(t.children),ids(old.children),'Card set/order lost: '+goal);
 for(let i=0;i<t.children.length;i++){
  const c=t.children[i],previous=old.children[i];
  assert.equal(JSON.stringify(c.dest),JSON.stringify(previous.dest),'Destination changed '+goal+'/'+c.id);
  assert.equal(c.republish,previous.republish,'Republish changed '+goal+'/'+c.id);
  assert.equal(c.transfer,previous.transfer,'Transfer changed '+goal+'/'+c.id);
  assert.equal(c.review,previous.review,'Review flag changed '+goal+'/'+c.id);
  assert(c.risk==='g'||c.risk==='y'||c.risk==='r','Invalid risk '+c.id);
  assert(!/10 000\+|советы об обходе блокировок — запрещённая информация|ролик без объекта рекламирования.*цены.*ссылки.*не реклама|Ролик .* с призывом купить — реклама/.test(c.details||''),'Obsolete absolute claim: '+c.id);
  if(c.tiktokInfo){
   assert.equal(c.guide.examples.length,2,'Missing paired examples: '+c.id);
   assert.equal(c.guide.checked,'28.11.2026');
  }
  if(c.id.endsWith('-tt-expert')||c.id==='tt-expert')assert.equal(c.fines.length,0,'Information must not carry automatic fine: '+c.id);
  if(c.id.endsWith('-tt-vpn')||c.id==='tt-vpn')assert(c.why.some(x=>x.includes('10.8')),'Explicit ad ban missing: '+c.id);
  if(c.id.endsWith('-tt-blogger')||c.id==='tt-blogger')assert(c.details.includes('более 10 тысяч'),'Registry threshold: '+c.id);
  if(c.id.endsWith('-tt-tg')||c.id==='book-tt-tg')assert(!c.fines?.length,'Neutral link auto-fined: '+c.id);
  examined++;
 }
}
assert.equal(examined,59);
assert(!D.start.partner.some(n=>n.id==='tiktok'),'Do not silently invent partner path');
for(const f of ['route-matrix.js','desktop-board.js'])load(f);
assert.equal(D.routeMatrix.rows.length,65,'All book methods must remain');
const all=x=>x.flatMap(p=>p.children?p.children.map(n=>p.id+'/'+n.id):[p.id]);
let combined=0;
for(const [goal,roots] of Object.entries(D.start)){
 const ordered=ctx.window.DesktopBoard.platforms(roots);
 assert.equal(JSON.stringify(all(ordered).sort()),JSON.stringify(all(roots).sort()),'Lost method: '+goal);
 for(const p of ordered){if(!p.children)continue;
  for(let i=1;i<p.children.length;i++)assert(ctx.window.DesktopBoard.riskRank(p.children[i-1])<=ctx.window.DesktopBoard.riskRank(p.children[i]),'Risk order: '+goal+'/'+p.id);
 }
 combined+=all(roots).length;
}
assert.equal(combined,379,'All routes retained');
load('book-ui.js');
const state={goal:'book',scope:'promotion',format:'file',sample:false,salePlace:'site',publisher:'tiktok',path:[]};
const ui=ctx.window.BookUI.create({D,S:state,esc:String,curForm:()=>D.forms[0],saveBar:()=>''});
const ownTikTok=D.start.book.find(n=>n.id==='tiktok');
const ownVideo=ownTikTok.children.find(n=>n.id==='tt-video');
assert(!ui.publicationIssue(ownTikTok,ownVideo),'Ordinary/conditional TikTok route wrongly blocked');
assert(ui.publicationNotice(ownTikTok,ownVideo).includes('TikTok'),'TikTok caution must remain visible');
const blogger=D.start.book.find(n=>n.id==='bloggers');
assert(ui.publicationIssue(blogger,blogger.children.find(n=>n.id==='bl-paid')),'Paid blogger TikTok placement must still be gated');
const html=fs.readFileSync(root+'index.html','utf8');
assert(html.indexOf('src="consult-legal.js"')<html.indexOf('src="tiktok-legal.js"'));
assert(html.indexOf('src="tiktok-legal.js"')<html.indexOf('src="route-matrix.js"'));
assert(html.includes('n.tiktokInfo'),'Paired examples must be rendered');
for(const [,src] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(src);
console.log('TikTok audit: '+D.tiktokLegal.groups+' groups, '+examined+' choices, 379 total and 65 book routes; preserved destinations and other platforms.');
