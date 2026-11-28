const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const scope = {};
vm.runInNewContext(fs.readFileSync(__dirname + '/../frontend-motion.js', 'utf8'), scope);
const { routeBetween, roundedPath } = scope.FrontendMotion;
function crosses(a, b, r) {
  return a.x === b.x
    ? a.x > r.left && a.x < r.right && Math.max(a.y,b.y) > r.top && Math.min(a.y,b.y) < r.bottom
    : a.y > r.top && a.y < r.bottom && Math.max(a.x,b.x) > r.left && Math.min(a.x,b.x) < r.right;
}
let cases = 0;
// A selected card may be in any row/column. All other cards remain obstacles.
for (const columns of [1,3,5]) {
  const width = 80 + columns * 156;
  const rects = [];
  for (const stageY of [100,700]) for (let row=0;row<2;row++) for (let col=0;col<columns;col++) {
    const left=40+col*156, top=stageY+row*196;
    rects.push({left:left-5,right:left+140+5,top:top-5,bottom:top+180+5});
  }
  const headings = [
    {left:35,right:width-30,top:25,bottom:75},
    {left:35,right:width-30,top:620,bottom:675}
  ];
  const blocks=rects.concat(headings);
  for(let source=0;source<columns*2;source++) for(let target=columns*2;target<rects.length;target++) {
    const a=rects[source],b=rects[target];
    const start={x:(a.left+a.right)/2,y:a.bottom+3},end={x:(b.left+b.right)/2,y:b.top-3};
    const points=routeBetween(start,end,blocks,width);
    assert(points && points.length>=2,`No route: ${columns}/${source}/${target}`);
    assert.equal(points[0].x,start.x); assert.equal(points[0].y,start.y);
    assert.equal(points.at(-1).x,end.x); assert.equal(points.at(-1).y,end.y);
    for(let i=1;i<points.length;i++) {
      const p=points[i-1],q=points[i];
      assert(p.x===q.x||p.y===q.y,'Diagonal segment');
      assert(!blocks.some(r=>crosses(p,q,r)),`Crossed a card or heading: ${columns}/${source}/${target}`);
    }
    assert(!/NaN|undefined|Infinity/.test(roundedPath(points)));
    cases++;
  }
}
assert.equal(routeBetween({x:20,y:30},{x:40,y:90},[{left:0,right:200,top:40,bottom:70}],100),null,'A closed corridor must not get an unsafe fallback');
console.log(`Frontend routing: ${cases} row/column selections avoid cards and headings; blocked corridor stays closed.`);

function motionRuntime(reduce) {
  let clock=0,id=0;
  const pending=new Map(),listeners={};
  const win={scrollY:100,innerHeight:800,scrollTo({top}){this.scrollY=top;},addEventListener(type,fn){listeners[type]=fn;}};
  const c={window:win,document:{documentElement:{scrollHeight:4000}},performance:{now:()=>clock},requestAnimationFrame(fn){pending.set(++id,fn);return id;},cancelAnimationFrame(key){pending.delete(key);}};
  vm.runInNewContext(fs.readFileSync(__dirname + '/../frontend-motion.js','utf8'),c);
  const motion=win.FrontendMotion.create({host:{},bar:{offsetHeight:100},reduce});
  const target={getBoundingClientRect:()=>({top:2000-win.scrollY})};
  return {win,motion,target,listeners,pending,tick(now){clock=now;const frames=[...pending.values()];pending.clear();frames.forEach(fn=>fn(now));}};
}
const moving=motionRuntime(false);
moving.motion.scrollToElement(moving.target);
assert.equal(moving.win.scrollY,100,'Scroll must not jump immediately');
moving.tick(100); assert.equal(moving.win.scrollY,100,'Keep the selected card visible briefly');
moving.tick(1560); assert(moving.win.scrollY>700&&moving.win.scrollY<1300,'Scroll passes through the middle');
moving.listeners.wheel(); assert.equal(moving.pending.size,0,'Wheel input cancels automatic scrolling');
const stoppedAt=moving.win.scrollY;moving.tick(5000);assert.equal(moving.win.scrollY,stoppedAt);
moving.motion.scrollToElement(moving.target); moving.tick(8000);assert.equal(moving.win.scrollY,1878);
const still=motionRuntime(true);still.motion.scrollToElement(still.target);
assert.equal(still.win.scrollY,1878);assert.equal(still.pending.size,0,'Reduced motion skips animation');
console.log('Scroll: gradual movement, brief selection pause, manual interruption and reduced-motion behavior verified.');
