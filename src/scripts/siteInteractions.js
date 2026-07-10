document.addEventListener('DOMContentLoaded', () => {
  const preloader = document.getElementById('preloader');
  const bodyWrap = document.getElementById('body-wrap');
  const hasSeenPreloader = window.sessionStorage.getItem('kamitsubaki-preloader-seen') === '1';

  const hidePreloader = () => {
    preloader?.classList.add('hidden-preloader');
    bodyWrap?.classList.remove('overflow-hidden', 'ui-loading');
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

  const revealElements = document.querySelectorAll('.reveal-up');
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
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.08,
    },
  );

  revealElements.forEach((element) => {
    revealObserver.observe(element);
  });

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
    artistList.addEventListener('click', (event) => {
      const button = event.target instanceof Element && event.target.closest('.artist-expand-btn');
      if (!button) return;

      const categoryId = button.getAttribute('data-category-id');
      if (!categoryId) return;

      const categoryContainer = document.getElementById(categoryId);
      if (!categoryContainer) return;

      const collapsedRows = categoryContainer.querySelectorAll('.artist-row-collapsed');
      const isExpanded = button.getAttribute('aria-expanded') === 'true';

      if (isExpanded) {
        collapsedRows.forEach((row) => {
          row.classList.add('hidden');
          row.style.transitionDelay = '';
        });
        button.setAttribute('aria-expanded', 'false');
        requestAnimationFrame(() => {
          button.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      } else {
        collapsedRows.forEach((row, index) => {
          row.classList.remove('hidden');
          row.style.opacity = '0';
          row.style.transform = 'translateY(24px)';
          row.style.transitionDelay = `${index * 0.05}s`;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              row.style.opacity = '';
              row.style.transform = '';
              row.style.transitionDelay = '';
            });
          });
        });
        button.setAttribute('aria-expanded', 'true');
      }
    });
  }
});
