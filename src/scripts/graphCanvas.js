import { createGraphLayout } from '../lib/graphLayout.mjs';
import { graphEdgeKey, graphKinds } from '../lib/graphModel.mjs';

export function initializeGraphCanvas(canvas, { onSelect, onStatus, copy, createWorker = () => new Worker(new URL('./graphLayoutWorker.js', import.meta.url), { type: 'module' }) }) {
  const ctx = canvas.getContext('2d');
  if (!ctx) { onStatus(copy.notAvailable); return null; }
  let graph = { nodes: [], edges: [] }, byId = new Map(), indexed = [], positions = new Float32Array(), selected = '', path = null;
  let worker, fallback, job = 0, frame = 0, width = 800, height = 560, autoFit = true, ready = false, dragging, hover = '';
  let camera = { x: 0, y: 0, scale: 1 };
  const pointers = new Map(), tooltip = canvas.parentElement.querySelector('[data-graph-tooltip]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const radius = node => Math.min(13, 3.5 + Math.log2((node.degree || 0) + 1) * 1.2);
  const world = (x, y) => ({ x: (x - width / 2) / camera.scale + camera.x, y: (y - height / 2) / camera.scale + camera.y });
  const screen = (x, y) => ({ x: (x - camera.x) * camera.scale + width / 2, y: (y - camera.y) * camera.scale + height / 2 });
  function schedule() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); }); }
  function bounds(ids) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    graph.nodes.forEach((node, index) => {
      if (ids && !ids.has(node.id)) return;
      minX = Math.min(minX, positions[index * 2]); maxX = Math.max(maxX, positions[index * 2]);
      minY = Math.min(minY, positions[index * 2 + 1]); maxY = Math.max(maxY, positions[index * 2 + 1]);
    });
    return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
  }
  function fit(ids, automatic = false) {
    const box = bounds(ids);
    if (!box) { camera = { x: 0, y: 0, scale: 1 }; schedule(); return; }
    camera.x = (box.minX + box.maxX) / 2; camera.y = (box.minY + box.maxY) / 2;
    camera.scale = Math.max(0.04, Math.min(3, (width - 70) / Math.max(60, box.maxX - box.minX + 40), (height - 70) / Math.max(60, box.maxY - box.minY + 40)));
    if (!automatic) autoFit = false;
    schedule();
  }
  function zoom(factor, anchor = { x: width / 2, y: height / 2 }) {
    const before = world(anchor.x, anchor.y);
    camera.scale = Math.min(8, Math.max(0.04, camera.scale * factor));
    const after = world(anchor.x, anchor.y);
    camera.x += before.x - after.x; camera.y += before.y - after.y; autoFit = false; schedule();
  }
  function draw() {
    const style = getComputedStyle(canvas), dpr = Math.min(2, window.devicePixelRatio || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = style.backgroundColor; ctx.fillRect(0, 0, width, height);
    const foreground = style.color;
    const colors = graphKinds.map((_, index) => style.getPropertyValue('--graph-color-' + index).trim() || foreground);
    const pathNodes = path ? new Set(path.nodes.map(node => node.id)) : null;
    const pathEdges = path ? new Set(path.steps.map(step => graphEdgeKey(step.edge))) : null;
    const point = index => screen(positions[index * 2], positions[index * 2 + 1]);
    const paintEdge = (a, b, emphasized) => {
      const start = point(a), end = point(b);
      if ((start.x < 0 && end.x < 0) || (start.x > width && end.x > width) || (start.y < 0 && end.y < 0) || (start.y > height && end.y > height)) return;
      ctx.strokeStyle = emphasized ? style.getPropertyValue('--theme-accent-color').trim() || foreground : foreground;
      ctx.lineWidth = emphasized ? 2 : 0.6; ctx.globalAlpha = emphasized ? 0.95 : path ? 0.045 : 0.16;
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
      if (emphasized || camera.scale > 0.85) {
        const angle = Math.atan2(end.y - start.y, end.x - start.x), r = radius(graph.nodes[b]) * camera.scale + 3;
        const x = end.x - Math.cos(angle) * r, y = end.y - Math.sin(angle) * r;
        ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x - Math.cos(angle - 0.45) * 6, y - Math.sin(angle - 0.45) * 6);
        ctx.lineTo(x - Math.cos(angle + 0.45) * 6, y - Math.sin(angle + 0.45) * 6); ctx.closePath(); ctx.fill();
      }
    };
    indexed.forEach(([edge, a, b]) => { if (!pathEdges?.has(graphEdgeKey(edge))) paintEdge(a, b, edge.source === selected || edge.target === selected); });
    indexed.forEach(([edge, a, b]) => { if (pathEdges?.has(graphEdgeKey(edge))) paintEdge(a, b, true); });
    const labels = [];
    graph.nodes.forEach((node, index) => {
      const p = point(index), active = node.id === selected || node.id === hover || pathNodes?.has(node.id);
      const r = Math.max(2, radius(node) * camera.scale);
      if (p.x < -r || p.y < -r || p.x > width + r || p.y > height + r) return;
      ctx.globalAlpha = active ? 1 : path ? 0.2 : 0.85;
      ctx.fillStyle = colors[Math.max(0, graphKinds.indexOf(node.kind))];
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      if (active) { ctx.strokeStyle = foreground; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2); ctx.stroke(); }
      if (active || (camera.scale > 1.1) || (!path && node.degree >= 18)) labels.push({ node, p, r, active });
    });
    ctx.globalAlpha = 1; ctx.font = '12px ' + style.fontFamily; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const occupied = [];
    labels.sort((a, b) => Number(b.active) - Number(a.active) || b.node.degree - a.node.degree).forEach(({ node, p, r, active }) => {
      const title = node.title.length > 25 ? node.title.slice(0, 24) + '…' : node.title;
      const tw = ctx.measureText(title).width, tx = Math.max(tw / 2 + 5, Math.min(width - tw / 2 - 5, p.x));
      const x = tx - tw / 2 - 3, y = Math.min(height - 20, p.y + r + 5);
      if (!active && occupied.some(box => x < box.x + box.w && x + tw + 6 > box.x && y < box.y + 18 && y + 18 > box.y)) return;
      occupied.push({ x, y, w: tw + 6 });
      ctx.fillStyle = style.backgroundColor; ctx.fillRect(x, y - 2, tw + 6, 18);
      ctx.fillStyle = foreground; ctx.fillText(title, tx, y);
    });
    canvas.dataset.graphNodeCount = String(graph.nodes.length); canvas.dataset.graphEdgeCount = String(graph.edges.length);
    canvas.dataset.graphScale = String(camera.scale); canvas.dataset.graphReady = String(ready);
    canvas.dataset.graphSelected = selected; canvas.dataset.graphPath = path ? path.nodes.map(node => node.id).join(',') : '';
  }
  function resize() {
    width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    if (autoFit) fit(null, true); else schedule();
  }
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(canvas); window.addEventListener('resize', resize);
  const themeObserver = new MutationObserver(schedule); themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  function received(message) {
    if (message.job !== job) return;
    if (!reducedMotion || message.done) positions = message.positions;
    if (message.done) { ready = true; onStatus(copy.arranged); }
    if (autoFit) fit(null, true); else schedule();
  }
  function fallbackLayout(current) {
    const layout = createGraphLayout(graph.nodes, graph.edges);
    fallback = layout;
    let ticks = 0;
    function run() {
      if (current !== job) return;
      layout.step(2); ticks += 2;
      received({ job: current, positions: layout.positions.slice(), done: ticks >= 160 });
      if (ticks < 160) setTimeout(run, 0);
    }
    setTimeout(run, 0);
  }
  function setGraph(next) {
    graph = next; byId = new Map(graph.nodes.map((node, index) => [node.id, index]));
    indexed = graph.edges.map(edge => [edge, byId.get(edge.source), byId.get(edge.target)]);
    job++; autoFit = true; ready = false; fallback = null;
    positions = createGraphLayout(graph.nodes, graph.edges).positions;
    onStatus(copy.arranging);
    if (!graph.nodes.length) { ready = true; onStatus(copy.arranged); resize(); return; }
    const current = job;
    try {
      if (!worker) {
        worker = createWorker();
        worker.onmessage = event => received(event.data);
        worker.onerror = event => { event.preventDefault(); worker?.terminate(); worker = null; onStatus(copy.workerFallback); fallbackLayout(job); };
      }
      worker.postMessage({ type: 'layout', job, nodes: graph.nodes.map(node => ({ id: node.id })), edges: graph.edges.map(edge => ({ source: edge.source, target: edge.target })) });
    } catch { onStatus(copy.workerFallback); fallbackLayout(current); }
    resize();
  }
  function hit(x, y) {
    let nearest = null, distance = Infinity;
    graph.nodes.forEach((node, index) => {
      const p = screen(positions[index * 2], positions[index * 2 + 1]), d = Math.hypot(p.x - x, p.y - y);
      if (d <= Math.max(8, radius(node) * camera.scale + 3) && d < distance) { nearest = node; distance = d; }
    });
    return nearest;
  }
  const local = event => { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  canvas.addEventListener('wheel', event => {
    if (!event.ctrlKey && !event.metaKey && document.activeElement !== canvas) return;
    event.preventDefault(); zoom(Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * 0.006), local(event));
  }, { passive: false });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId);
    const p = local(event); pointers.set(event.pointerId, p);
    dragging = pointers.size === 1 ? { node: hit(p.x, p.y), start: p, last: p, moved: false } : null;
    if (tooltip) tooltip.hidden = true;
    autoFit = false;
  });
  canvas.addEventListener('pointermove', event => {
    const p = local(event);
    if (!pointers.has(event.pointerId)) {
      const node = hit(p.x, p.y); hover = node?.id || '';
      canvas.style.cursor = node ? 'grab' : 'default';
      if (tooltip) { tooltip.hidden = !node; tooltip.textContent = node ? node.title + ' · ' + (copy.kinds[node.kind] || node.kind) : ''; tooltip.style.left = Math.min(width - 180, Math.max(4, p.x + 12)) + 'px'; tooltip.style.top = Math.max(4, p.y - 40) + 'px'; }
      schedule(); return;
    }
    if (pointers.size === 2) {
      const before = [...pointers.values()], oldDistance = Math.hypot(before[0].x - before[1].x, before[0].y - before[1].y);
      const oldMid = { x: (before[0].x + before[1].x) / 2, y: (before[0].y + before[1].y) / 2 };
      pointers.set(event.pointerId, p);
      const after = [...pointers.values()], distance = Math.hypot(after[0].x - after[1].x, after[0].y - after[1].y);
      const mid = { x: (after[0].x + after[1].x) / 2, y: (after[0].y + after[1].y) / 2 };
      if (oldDistance > 1) zoom(distance / oldDistance, oldMid);
      camera.x -= (mid.x - oldMid.x) / camera.scale; camera.y -= (mid.y - oldMid.y) / camera.scale;
    } else if (dragging) {
      dragging.moved ||= Math.hypot(p.x - dragging.start.x, p.y - dragging.start.y) > 4;
      if (dragging.moved && dragging.node) {
        const w = world(p.x, p.y), index = byId.get(dragging.node.id);
        positions[index * 2] = w.x; positions[index * 2 + 1] = w.y;
        const message = { type: 'pin', job, id: dragging.node.id, x: w.x, y: w.y };
        worker?.postMessage(message); fallback?.pin(message.id, w.x, w.y);
      } else if (dragging.moved) { camera.x -= (p.x - dragging.last.x) / camera.scale; camera.y -= (p.y - dragging.last.y) / camera.scale; }
      dragging.last = p; pointers.set(event.pointerId, p);
    }
    schedule();
  });
  function release(event) {
    pointers.delete(event.pointerId);
    if (event.type === 'pointerup' && dragging && (dragging.node || !dragging.moved)) onSelect(dragging.node?.id || '');
    dragging = null; canvas.style.cursor = 'default';
  }
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { hover = ''; if (tooltip) tooltip.hidden = true; schedule(); });
  canvas.addEventListener('keydown', event => {
    if (event.key === '+' || event.key === '=') zoom(1.4);
    else if (event.key === '-') zoom(1 / 1.4);
    else if (event.key === 'Home') fit();
    else if (event.key === 'Escape') onSelect('');
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      camera.x += (event.key === 'ArrowRight' ? 60 : event.key === 'ArrowLeft' ? -60 : 0) / camera.scale;
      camera.y += (event.key === 'ArrowDown' ? 60 : event.key === 'ArrowUp' ? -60 : 0) / camera.scale; autoFit = false; schedule();
    } else return;
    event.preventDefault();
  });
  return { setGraph, select(id) { selected = id; schedule(); }, highlight(route, { focus = false } = {}) { path = route; if (focus && route) fit(new Set(route.nodes.map(node => node.id))); else schedule(); },
    focus(id) { const index = byId.get(id); if (index === undefined) return; camera.x = positions[index * 2]; camera.y = positions[index * 2 + 1]; camera.scale = Math.max(0.8, camera.scale); autoFit = false; schedule(); },
    fit, zoom, exportImage() { draw(); const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = 'kamitsubaki-graph.png'; link.click(); },
    destroy() { job++; worker?.terminate(); resizeObserver?.disconnect(); themeObserver.disconnect(); window.removeEventListener('resize', resize); if (frame) cancelAnimationFrame(frame); } };
}
