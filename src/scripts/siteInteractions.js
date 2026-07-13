document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('has-js');

  const preloader = document.getElementById('preloader');
  const bodyWrap = document.getElementById('body-wrap');
  const hasSeenPreloader = window.sessionStorage.getItem('kamitsubaki-preloader-seen') === '1';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealElements = document.querySelectorAll('.reveal-up');
  let revealsStarted = false;

  const startReveals = () => {
    if (revealsStarted) {
      return;
    }

    revealsStarted = true;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add('active'));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.06,
      },
    );

    revealElements.forEach((element) => {
      revealObserver.observe(element);
    });
  };

  const hidePreloader = () => {
    preloader?.classList.add('hidden-preloader');
    bodyWrap?.classList.remove('overflow-hidden', 'ui-loading');

    window.setTimeout(startReveals, hasSeenPreloader ? 40 : 180);

    window.setTimeout(() => {
      if (preloader) {
        preloader.style.display = 'none';
      }
    }, 650);
  };

  if (hasSeenPreloader) {
    hidePreloader();
  } else {
    window.setTimeout(() => {
      window.sessionStorage.setItem('kamitsubaki-preloader-seen', '1');
      hidePreloader();
    }, 900);
  }

  const cursor = document.getElementById('cursor');

  if (cursor && window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    });

    // Use event delegation to handle dynamically loaded elements (like AI Chat)
    document.addEventListener('mouseover', (event) => {
      const hoverable = event.target instanceof Element && event.target.closest('a, button, summary, [data-hoverable], [role="button"], input[type="button"], input[type="submit"]');
      if (hoverable) {
        cursor.classList.add('hovering');
      } else {
        cursor.classList.remove('hovering');
      }
    });

    document.addEventListener('mouseleave', () => {
      cursor.classList.remove('hovering');
    });
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  const artistRows = document.querySelectorAll('.artist-row');
  const bgContainer = document.getElementById('artist-bg-container');
  const bgImg = document.getElementById('artist-bg-img');

  artistRows.forEach((row) => {
    row.addEventListener('mouseenter', () => {
      if (!(bgContainer instanceof HTMLElement) || !(bgImg instanceof HTMLImageElement)) {
        return;
      }

      bgImg.src = row.getAttribute('data-img') ?? '';
      bgContainer.style.opacity = '1';
      setTimeout(() => {
        bgImg.style.transform = 'scale(1)';
      }, 50);
    });

    row.addEventListener('mouseleave', () => {
      if (!(bgContainer instanceof HTMLElement) || !(bgImg instanceof HTMLImageElement)) {
        return;
      }

      bgContainer.style.opacity = '0';
      bgImg.style.transform = 'scale(0.95)';
    });
  });

  const heroParallaxElements = document.querySelectorAll('[data-hero-parallax]');

  if (heroParallaxElements.length > 0 && !prefersReducedMotion) {
    let heroFrame = 0;

    const updateHeroParallax = () => {
      heroFrame = 0;
      const offset = Math.min(window.scrollY, 760) * -0.035;

      heroParallaxElements.forEach((element) => {
        element.style.setProperty('--hero-parallax-y', `${offset.toFixed(2)}px`);
      });
    };

    const requestHeroParallax = () => {
      if (!heroFrame) {
        heroFrame = window.requestAnimationFrame(updateHeroParallax);
      }
    };

    updateHeroParallax();
    window.addEventListener('scroll', requestHeroParallax, { passive: true });
  }

  const readingProgressBars = document.querySelectorAll('[data-reading-progress]');

  if (readingProgressBars.length > 0) {
    const updateReadingProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;

      readingProgressBars.forEach((bar) => {
        if (bar instanceof HTMLElement) {
          bar.style.transform = `scaleX(${progress})`;
        }
      });
    };

    updateReadingProgress();
    window.addEventListener('scroll', updateReadingProgress, { passive: true });
    window.addEventListener('resize', updateReadingProgress);
  }

  // Preload artist hover images in the background on idle to prevent latency/flash
  const preloadArtistImages = () => {
    artistRows.forEach((row) => {
      const imgUrl = row.getAttribute('data-img');
      if (imgUrl) {
        const img = new Image();
        img.src = imgUrl;
      }
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => preloadArtistImages());
  } else {
    window.setTimeout(preloadArtistImages, 1500);
  }

  // ── Artist category expand/collapse ──
  const artistList = document.getElementById('artist-list');
  if (artistList instanceof HTMLElement) {
    /** Stores active RAF / timeout IDs per category to avoid leaks on rapid clicks. */
    const categoryAnimations = new Map();

    const cancelCategoryAnim = (categoryId) => {
      const ids = categoryAnimations.get(categoryId);
      if (!ids) return;
      if (ids.rafId) window.cancelAnimationFrame(ids.rafId);
      if (ids.cleanupId) window.clearTimeout(ids.cleanupId);
      categoryAnimations.delete(categoryId);
    };

    artistList.addEventListener('click', (event) => {
      const button = event.target instanceof Element && event.target.closest('.artist-expand-btn');
      if (!button) return;

      const categoryId = button.getAttribute('data-category-id');
      if (!categoryId) return;

      const categoryContainer = document.getElementById(categoryId);
      if (!categoryContainer) return;

      const wrapper = categoryContainer.querySelector('[data-collapsed-wrapper]');
      if (!wrapper) return;

      const collapsedRows = categoryContainer.querySelectorAll('.artist-row-collapsed');
      const isExpanded = button.getAttribute('aria-expanded') === 'true';

      // Cancel any in-flight animation for this category before starting a new one
      cancelCategoryAnim(categoryId);
      collapsedRows.forEach((row) => { row.style.transitionDelay = ''; });

      if (isExpanded) {
        collapsedRows.forEach((row, index) => {
          const reverseIndex = collapsedRows.length - 1 - index;
          row.style.transitionDelay = `${reverseIndex * 0.04}s`;
        });

        // 记录按钮视口位置作为锚点
        const anchorTop = button.getBoundingClientRect().top;

        wrapper.classList.remove('is-expanded');
        button.setAttribute('aria-expanded', 'false');

        // 每帧把按钮推回原位，页面自然下沉
        const startTime = performance.now();
        const duration = 750;
        let rafId = 0;
        function pinAnchor() {
          const elapsed = performance.now() - startTime;
          if (elapsed >= duration) { rafId = 0; return; }
          const drift = button.getBoundingClientRect().top - anchorTop;
          if (Math.abs(drift) > 0.5) {
            window.scrollBy({ top: drift, behavior: 'instant' });
          }
          rafId = requestAnimationFrame(pinAnchor);
        }
        rafId = requestAnimationFrame(pinAnchor);

        // 动画完成后清除内联 delay
        const collapseMaxDelay = (collapsedRows.length - 1) * 0.04;
        const collapseCleanupMs = (collapseMaxDelay + 0.7) * 1000 + 50;
        const cleanupId = setTimeout(() => {
          collapsedRows.forEach((row) => { row.style.transitionDelay = ''; });
          categoryAnimations.delete(categoryId);
        }, collapseCleanupMs);
        categoryAnimations.set(categoryId, { rafId, cleanupId });
      } else {
        collapsedRows.forEach((row, index) => {
          row.style.transitionDelay = `${index * 0.05}s`;
        });
        wrapper.classList.add('is-expanded');
        button.setAttribute('aria-expanded', 'true');

        // 动画完成后清除内联 delay
        const expandMaxDelay = (collapsedRows.length - 1) * 0.05;
        const expandCleanupMs = (expandMaxDelay + 0.7) * 1000 + 50;
        const cleanupId = setTimeout(() => {
          collapsedRows.forEach((row) => { row.style.transitionDelay = ''; });
          categoryAnimations.delete(categoryId);
        }, expandCleanupMs);
        categoryAnimations.set(categoryId, { rafId: 0, cleanupId });
      }
    });
  }
});
