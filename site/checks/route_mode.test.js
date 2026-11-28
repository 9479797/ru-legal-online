const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const db={'skhema-state-ordinary':{goal:'book',form:'self',path:['vk','vk-reply','site'],format:'file',sample:false},'skhema-state-risk':{goal:'course',form:'ip',path:['instagram','author'],format:'print',sample:true},'skhema-settings':{goal:'course',form:'ip',format:'print',sample:true}};
const store={get:(k,d)=>db[k]===undefined?d:JSON.parse(JSON.stringify(db[k])),set:(k,v)=>db[k]=JSON.parse(JSON.stringify(v))};
const D={forms:[{id:'self'},{id:'ip'}],goals:[{id:'book'},{id:'course'}],bookPublishers:[]};
function page(mode){
 const c={D,store,routeMode:mode,stateKey:'skhema-state-'+mode,window:{location:{assign:url=>c.url=url}}};
 vm.createContext(c);
 vm.runInContext(html.slice(html.indexOf('let S = Object.assign('),html.indexOf('const bookUI = '))+'\nglobalThis.state=S;',c);
 vm.runInContext(html.slice(html.indexOf('function changeRouteMode('),html.indexOf('function openRiskOptions(')),c);return c;
}
let normal=page('ordinary');assert.equal(normal.state.goal,'book','Other section settings must not overwrite a saved goal');assert.equal(normal.state.form,'self');
normal.changeRouteMode('risk');assert.equal(normal.url,'risk.html');
let risk=page('risk');assert.equal(risk.state.path.join('/'),'instagram/author');risk.state.path.push('site');risk.changeRouteMode('ordinary');assert.equal(risk.url,'index.html');
normal=page('ordinary');assert.equal(normal.state.path.join('/'),'vk/vk-reply/site');assert.equal(normal.state.format,'file');
risk=page('risk');assert.equal(risk.state.path.join('/'),'instagram/author/site');assert.equal(risk.state.sample,true);
risk.changeRouteMode('risk');assert.equal(risk.url,undefined,'Reselecting current section must not reload or reset it');
console.log('Same-tab sections: both directions navigate and restore independent goals, settings and selected stages.');
