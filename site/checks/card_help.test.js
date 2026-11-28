const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/../',c={window:{}};
for(const f of ['data.js','card-help.js','goal1-copy.js'])vm.runInNewContext(fs.readFileSync(root+f,'utf8'),c);
const d=c.window.SCHEMA,before=JSON.stringify(d),nodes=Object.values(d.start).flatMap(ps=>ps.flatMap(p=>p.children||[]));
const esc=s=>String(s).replace(/[&<>"]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x]));
c.esc=esc;c.list=xs=>'<ul>'+xs.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
const page=fs.readFileSync(root+'index.html','utf8');
vm.runInNewContext(page.slice(page.indexOf('function cardDetails('),page.indexOf('\nfunction cardLiability')),c);
for(const n of nodes){
 const help=c.window.CardHelp.get(n);assert(help.explanation&&help.examples.length===2,n.id);
 const html=c.cardDetails(n);assert(!html.includes('undefined'),n.id);assert(html.includes(esc(n.details||'')),n.id);
 if(n.guide){assert(html.includes(esc(n.guide.note)),n.id);for(const source of n.guide.sources)assert(html.includes(esc(source.url)),n.id);}
}
assert.equal(JSON.stringify(d),before,'Rendering help must not rewrite classifications, fines or routes');
const get=id=>c.window.CardHelp.get(nodes.find(n=>n.id===id));
assert(get('bl-gift').explanation.includes('не требуете публикацию'));
assert(get('bl-barter').explanation.includes('в обмен'));
assert(get('tt-dm').explanation.includes('конкретному человеку'));
assert(get('bl-banned').explanation.includes('ограничение'));
assert(get('bl-doctor').explanation.includes('профессии'));
assert(!page.includes('data-guide='),'One explanation button per card');
assert(!page.includes('function openGuide('),'No obsolete separate dialog');
console.log(`Unified help: ${nodes.length} method cards have two examples; all original details, guide caveats and sources preserved; legal data unchanged.`);
