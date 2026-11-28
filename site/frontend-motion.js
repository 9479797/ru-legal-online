/* Orthogonal card routing and interruptible motion. No changes to legal data. */
(function (root) {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const round = n => Math.round(n * 2) / 2;

  function intersects(a, b, r) {
    return a.x === b.x
      ? a.x > r.left && a.x < r.right && Math.max(a.y, b.y) > r.top && Math.min(a.y, b.y) < r.bottom
      : a.y > r.top && a.y < r.bottom && Math.max(a.x, b.x) > r.left && Math.min(a.x, b.x) < r.right;
  }

  // Coordinate-compressed A*: gaps between rows/columns are valid corridors.
  function routeBetween(start, end, obstacles, width) {
    const yMin = Math.min(start.y, end.y) - 28;
    const yMax = Math.max(start.y, end.y) + 28;
    const blocks = obstacles.filter(r => r.bottom >= yMin && r.top <= yMax);
    const unique = values => [...new Set(values.map(round))].sort((a, b) => a - b);
    const xs = unique([8, width - 8, start.x, end.x, ...blocks.flatMap(r => [r.left - 1, r.right + 1])]).filter(x => x >= 4 && x <= width - 4);
    const ys = unique([start.y, end.y, ...blocks.flatMap(r => [r.top - 1, r.bottom + 1])]).filter(y => y >= yMin && y <= yMax);
    const nx = xs.length, size = nx * ys.length;
    const begin = ys.indexOf(round(start.y)) * nx + xs.indexOf(round(start.x));
    const finish = ys.indexOf(round(end.y)) * nx + xs.indexOf(round(end.x));
    if (begin < 0 || finish < 0) return null;
    const point = id => ({ x: xs[id % nx], y: ys[Math.floor(id / nx)] });
    const blocked = new Uint8Array(size);
    for (let id = 0; id < size; id++) {
      const p = point(id);
      blocked[id] = blocks.some(r => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom) ? 1 : 0;
    }
    if (blocked[begin] || blocked[finish]) return null;
    const costs = new Float64Array(size * 3).fill(Infinity);
    const parents = new Int32Array(size * 3).fill(-1);
    const heap = [];
    const push = item => {
      heap.push(item); let i = heap.length - 1;
      while (i) { const p = (i - 1) >> 1; if (heap[p].f <= item.f) break; heap[i] = heap[p]; i = p; }
      heap[i] = item;
    };
    const pop = () => {
      const first = heap[0], last = heap.pop();
      if (heap.length) {
        let i = 0;
        while (i * 2 + 1 < heap.length) {
          let c = i * 2 + 1;
          if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++;
          if (heap[c].f >= last.f) break;
          heap[i] = heap[c]; i = c;
        }
        heap[i] = last;
      }
      return first;
    };
    const heuristic = id => { const p = point(id); return Math.abs(p.x - end.x) + Math.abs(p.y - end.y); };
    costs[begin * 3] = 0;
    push({ state: begin * 3, cost: 0, f: heuristic(begin) });
    let found = -1;
    while (heap.length) {
      const current = pop();
      if (current.cost !== costs[current.state]) continue;
      const id = Math.floor(current.state / 3), oldDir = current.state % 3;
      if (id === finish) { found = current.state; break; }
      const x = id % nx, y = Math.floor(id / nx), a = point(id);
      const next = [];
      if (x > 0) next.push([id - 1, 1]);
      if (x + 1 < nx) next.push([id + 1, 1]);
      if (y > 0) next.push([id - nx, 2]);
      if ((y + 1) * nx < size) next.push([id + nx, 2]);
      for (const [nid, dir] of next) {
        if (blocked[nid]) continue;
        const b = point(nid);
        if (blocks.some(r => intersects(a, b, r))) continue;
        const state = nid * 3 + dir;
        const cost = current.cost + Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + (oldDir && dir !== oldDir ? 18 : 0);
        if (cost >= costs[state]) continue;
        costs[state] = cost; parents[state] = current.state;
        push({ state, cost, f: cost + heuristic(nid) });
      }
    }
    if (found < 0) return null;
    const points = [];
    for (let state = found; state >= 0; state = parents[state]) points.push(point(Math.floor(state / 3)));
    points.reverse();
    return points.filter((p, i) => !i || i === points.length - 1 || !((points[i - 1].x === p.x && p.x === points[i + 1].x) || (points[i - 1].y === p.y && p.y === points[i + 1].y)));
  }

  function roundedPath(points) {
    let d = 'M ' + points[0].x + ' ' + points[0].y;
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i - 1], p = points[i], b = points[i + 1];
      const before = Math.hypot(p.x - a.x, p.y - a.y), after = Math.hypot(b.x - p.x, b.y - p.y);
      const radius = Math.min(9, before / 2, after / 2);
      if (!before || !after) continue;
      const x1 = p.x + (a.x - p.x) * radius / before, y1 = p.y + (a.y - p.y) * radius / before;
      const x2 = p.x + (b.x - p.x) * radius / after, y2 = p.y + (b.y - p.y) * radius / after;
      d += ' L ' + x1 + ' ' + y1 + ' Q ' + p.x + ' ' + p.y + ' ' + x2 + ' ' + y2;
    }
    const last = points[points.length - 1];
    return d + ' L ' + last.x + ' ' + last.y;
  }

  function create({ host, bar, reduce = false }) {
    let signature = '', scrollFrame = 0;
    const NS = 'http://www.w3.org/2000/svg';
    const svgEl = (tag, attrs) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };
    function sync(context) {
      document.documentElement.style.setProperty('--route-height', bar.offsetHeight + 'px');
      const box = host.getBoundingClientRect();
      const cards = [...host.querySelectorAll('.opt.sel')].filter(el => el.querySelector('[data-pick]'));
      cards.sort((a, b) => Number(a.querySelector('[data-pick]').dataset.pick) - Number(b.querySelector('[data-pick]').dataset.pick));
      const rect = el => { const r = el.getBoundingClientRect(); return { left: round(r.left - box.left), right: round(r.right - box.left), top: round(r.top - box.top), bottom: round(r.bottom - box.top) }; };
      const obstacles = [...host.querySelectorAll('.opt,.sh,.restart-hint,.publication-settings')].map(rect).map(r => ({ left:r.left-5, right:r.right+5, top:r.top-5, bottom:r.bottom+5 }));
      const keys = cards.map(el => el.querySelector('[data-pick]').dataset.id);
      const routes = [];
      for (let i = 1; i < cards.length; i++) {
        const a = rect(cards[i - 1]), b = rect(cards[i]);
        const source = {x:a.left-5,y:round((a.top+a.bottom)/2)};
        const target = {x:b.left-5,y:round((b.top+b.bottom)/2)};
        const rail=8;
        routes.push({key:context+':'+keys.slice(0,i+1).join('/'),d:roundedPath([source,{x:rail,y:source.y},{x:rail,y:target.y},target])});
      }
      const nextSignature = box.width + '|' + box.height + '|' + JSON.stringify(routes);
      if (signature === nextSignature && host.querySelector('.route-lines')) return;
      signature = nextSignature;
      host.querySelector('.route-lines')?.remove();
      if (!routes.length) return;
      const svg = svgEl('svg', { class:'route-lines', 'aria-hidden':'true', width:box.width, height:box.height });
      host.prepend(svg);
      for (const r of routes) {
        const path = svgEl('path', { d:r.d, class:'route-stroke' });
        const head = svgEl('path', { d:'M -8 -5 L 0 0 L -8 5', class:'route-head' });
        svg.append(path, head);
        const length = path.getTotalLength();
        const end = path.getPointAtLength(length);
        const before = path.getPointAtLength(Math.max(0, length - 1));
        head.setAttribute('transform', 'translate(' + end.x + ' ' + end.y + ') rotate(' + Math.atan2(end.y-before.y,end.x-before.x)*180/Math.PI + ')');
      }
    }

    function cancelScroll() { if (scrollFrame) cancelAnimationFrame(scrollFrame); scrollFrame = 0; }
    function scrollToElement(el) {
      if (!el) return;
      cancelScroll();
      const from = window.scrollY;
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const to = clamp(from + el.getBoundingClientRect().top - bar.offsetHeight - 22, 0, max);
      const distance = Math.abs(to - from);
      if (reduce || distance < 3) { window.scrollTo({ top:to, behavior:'instant' }); return; }
      const start = performance.now() + 160, duration = clamp(distance * 2.1, 1450, 2800);
      const move = now => {
        const t = clamp((now - start) / duration, 0, 1);
        const eased = t * t * (3 - 2 * t);
        window.scrollTo({ top:from + (to - from) * eased, behavior:'instant' });
        if (t < 1) scrollFrame = requestAnimationFrame(move); else scrollFrame = 0;
      };
      scrollFrame = requestAnimationFrame(move);
    }
    for (const event of ['wheel','touchstart','pointerdown']) window.addEventListener(event, cancelScroll, { passive:true });
    window.addEventListener('keydown', e => { if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)) cancelScroll(); });
    return { sync, scrollToElement, cancelScroll };
  }
  root.FrontendMotion = { create, routeBetween, roundedPath };
})(typeof window === 'undefined' ? globalThis : window);
