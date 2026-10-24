import { createGraphLayout } from '../lib/graphLayout.mjs';
let job = 0, layout;
self.onmessage = event => {
  const message = event.data;
  if (message.type === 'pin') { if (message.job === job) layout?.pin(message.id, message.x, message.y); return; }
  if (message.type !== 'layout') return;
  job = message.job;
  const current = job;
  layout = createGraphLayout(message.nodes, message.edges);
  let iterations = 0;
  function run() {
    if (current !== job) return;
    layout.step(4); iterations += 4;
    const positions = layout.positions.slice();
    self.postMessage({ job: current, positions, done: iterations >= 160 }, [positions.buffer]);
    if (iterations < 160) setTimeout(run, 0);
  }
  run();
};
