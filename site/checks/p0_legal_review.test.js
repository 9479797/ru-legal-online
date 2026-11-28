/* P0 review regression: legal rule checks, not approval of an actual ad. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=__dirname+'/../',ctx={window:{}};
for(const f of ['data.js','instagram-legal.js','consult-legal.js','youtube-funnels.js','telegram-funnels.js','p0-legal-review.js','route-matrix.js','book-ui.js','desktop-board.js']){
  vm.runInNewContext(fs.readFileSync(base+f,'utf8'),ctx,{filename:f});
}
const D=ctx.window.SCHEMA,byId=(p,id)=>D.start.book.find(x=>x.id===p).children.find(x=>x.id===id);
const P0=['word','target','tg-vpn','yt-vpn','tt-ads','tt-vpn','bl-doctor','bl-banned','dir-med'];
for(const id of P0)assert(D.start.book.some(p=>p.children?.some(x=>x.id===id)),id+' missing');
assert.equal(byId('bloggers','bl-paid').risk,'y','Paid post cannot be green before actual platform is chosen');
assert.equal(byId('tiktok','tt-ads').risk,'y','Foreign advertising account alone is not an absolute prohibition');
assert(byId('tiktok','tt-ads').review,'TikTok Ads must require further review');
assert(!byId('tiktok','tt-vpn').saferGoto,'Cannot redirect advertising of VPN to same content on another platform');
assert(byId('telegram','tg-vpn').details.includes('10.8'));
assert(byId('youtube','yt-vpn').details.includes('10.8'));
assert(byId('bloggers','bl-doctor').details.includes('исключения'));
assert(!byId('bloggers','bl-banned').fines.includes('meta_pay'),'Meta payment penalty cannot be automatic without transaction proof');
assert(byId('direct','dir-med').details.includes('п.6 ч.5'));
assert.equal(byId('instagram','target').risk,'r');
const bloggers=D.start.book.find(x=>x.id==='bloggers');
const scenario=p=>{const S={scope:'promotion',goal:'book',path:['bloggers','bl-paid','site'],format:'file',form:'ip',salePlace:'site',publisher:p,sample:false};return ctx.window.BookUI.create({D,S,esc:x=>String(x),curForm:()=>D.forms.find(f=>f.id==='ip'),saveBar:()=>''});};
for(const place of ['','other','telegram','youtube','tiktok']){
  const ui=scenario(place),info=ui.publicationInfo(bloggers,byId('bloggers','bl-paid'));
  assert(info.needsCheck,place+' should not be approved without platform verification');
  assert(ui.publicationIssue(bloggers,byId('bloggers','bl-paid')),'Missing warning for '+place);
}
const prohibited=scenario('instagram').publicationInfo(bloggers,byId('bloggers','bl-paid'));
assert(prohibited.blocked,'Paid Instagram integration must be blocked');
const index=fs.readFileSync(base+'index.html','utf8');
assert(index.indexOf('src="p0-legal-review.js"')>index.indexOf('src="telegram-funnels.js"'));
assert(index.indexOf('src="p0-legal-review.js"')<index.indexOf('src="route-matrix.js"'));
console.log('P0 regression: 9 scenarios inspected, review-only TikTok Ads, influencer platform warning and VPN blocking.');
