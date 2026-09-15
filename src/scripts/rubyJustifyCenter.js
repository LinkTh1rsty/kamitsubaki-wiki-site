const SELECTOR = '.my-lyric-box .jp-lyric ruby, .labs-practice-line ruby';

const findVisibleRt = (ruby) => {
  for (const rt of ruby.querySelectorAll('rt')) {
    if (getComputedStyle(rt).display !== 'none') return rt;
  }
  return null;
};

const measureAndPad = (ruby) => {
  ruby.style.paddingInlineStart = '';
  ruby.style.paddingInlineEnd = '';

  const rt = findVisibleRt(ruby);
  if (!rt) return;

  const rubyRect = ruby.getBoundingClientRect();
  const rtRect = rt.getBoundingClientRect();
  const padL = Math.max(0, rubyRect.left - rtRect.left);
  const padR = Math.max(0, rtRect.right - rubyRect.right);
  if (padL < 0.5 && padR < 0.5) return;

  ruby.style.paddingInlineStart = padL.toFixed(2) + 'px';
  ruby.style.paddingInlineEnd = padR.toFixed(2) + 'px';
};

const runAll = () => {
  document.querySelectorAll(SELECTOR).forEach(measureAndPad);
};

const observeContainers = () => {
  const containers = document.querySelectorAll('.my-lyric-box, .labs-practice');
  containers.forEach((container) => {
    const observer = new MutationObserver(runAll);
    observer.observe(container, { attributes: true, attributeFilter: ['class'] });
  });
};

export const initRubyJustifyCenter = () => {
  if (typeof document === 'undefined') return;

  const start = () => {
    runAll();
    observeContainers();
  };

  if (document.fonts?.ready) {
    document.fonts.ready.then(start);
  } else {
    start();
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(runAll, 200);
  });
};
