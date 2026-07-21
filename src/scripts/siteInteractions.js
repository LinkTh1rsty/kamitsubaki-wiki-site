import { detectExternalPlatform } from '../lib/externalPlatforms.mjs';

const externalLinksHeadingPattern = /^(外部链接|外部連結|外部リンク|external\s+links?)$/i;

export const isExternalLinksHeading = (value) => externalLinksHeadingPattern.test(String(value).trim());

const createPlatformIcon = (ownerDocument, platform) => {
  const badge = ownerDocument.createElement('span');
  badge.className = 'platform-icon';
  badge.dataset.platform = platform.id;
  badge.title = platform.name;
  badge.setAttribute('aria-hidden', 'true');

  const svg = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('focusable', 'false');

  if (platform.icon) {
    const path = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', platform.icon.path);
    svg.append(path);
  } else {
    svg.classList.add('platform-icon__globe');
    const circle = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '8.75');
    const path = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M3.5 12h17M12 3.25c2.2 2.35 3.3 5.27 3.3 8.75S14.2 18.4 12 20.75C9.8 18.4 8.7 15.48 8.7 12S9.8 5.6 12 3.25Z');
    svg.append(circle, path);
  }

  badge.append(svg);
  return badge;
};

const createExternalArrow = (ownerDocument) => {
  const svg = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('external-link-card__arrow');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M6 14 14 6M8 6h6v6');
  svg.append(path);
  return svg;
};

export const enhanceExternalLinkSections = (root) => {
  root.querySelectorAll('.wiki-artist-prose h2').forEach((heading) => {
    if (!isExternalLinksHeading(heading.textContent)) return;

    let list = heading.nextElementSibling;
    while (list && list.tagName !== 'H2' && list.tagName !== 'UL') list = list.nextElementSibling;
    if (!list || list.tagName !== 'UL') return;

    heading.classList.add('wiki-external-links-heading');
    list.classList.add('wiki-external-links');

    Array.from(list.children).forEach((item) => {
      if (!(item instanceof HTMLElement) || item.dataset.externalLinkEnhanced === 'true') return;
      const link = item.querySelector(':scope > a');
      if (!(link instanceof HTMLAnchorElement)) return;

      const label = link.textContent?.trim() || link.href;
      const platform = detectExternalPlatform({ href: link.href, label });
      const ownerDocument = link.ownerDocument;
      const copy = ownerDocument.createElement('span');
      const name = ownerDocument.createElement('span');
      const platformName = ownerDocument.createElement('span');

      copy.className = 'external-link-card__copy';
      name.className = 'external-link-card__label';
      platformName.className = 'external-link-card__platform';
      platformName.textContent = platform.name;
      while (link.firstChild) name.append(link.firstChild);
      copy.append(name, platformName);

      item.classList.add('wiki-external-links__item');
      item.dataset.externalLinkEnhanced = 'true';
      link.classList.add('external-link-card', 'external-link-card--prose');
      link.dataset.platform = platform.id;
      link.style.setProperty('--platform-color', platform.color);
      link.append(createPlatformIcon(ownerDocument, platform), copy, createExternalArrow(ownerDocument));
    });
  });
};

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('has-js');
  enhanceExternalLinkSections(document);

  const siteIntro = document.querySelector('[data-site-intro]');
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
        threshold: 0.01,
      },
    );

    revealElements.forEach((element) => {
      revealObserver.observe(element);
    });
  };

  if (siteIntro && document.documentElement.classList.contains('site-intro-enabled')) {
    const configuredDuration = Number.parseInt(siteIntro.dataset.animationDuration ?? '', 10);
    const animationDuration = prefersReducedMotion ? 900 : (configuredDuration || 5845);
    const introVideo = siteIntro.querySelector('[data-site-intro-video]');
    let animationComplete = false;
    let pageLoaded = document.readyState === 'complete';
    let leaving = false;

    const finishAnimation = () => {
      if (animationComplete) return;
      animationComplete = true;
      siteIntro.dataset.state = pageLoaded ? 'ready' : 'waiting';
      siteIntro.classList.add('is-animation-complete');
      revealSite();
    };

    const revealSite = () => {
      if (leaving || !animationComplete || !pageLoaded) return;
      leaving = true;
      siteIntro.dataset.state = 'leaving';

      window.requestAnimationFrame(() => {
        siteIntro.classList.add('is-leaving');
      });

      window.setTimeout(() => {
        siteIntro.hidden = true;
        siteIntro.dataset.state = 'complete';
        document.documentElement.classList.remove('site-intro-enabled');
        startReveals();
      }, prefersReducedMotion ? 180 : 720);
    };

    if (introVideo instanceof HTMLVideoElement && !prefersReducedMotion) {
      const handleVideoError = () => {
        siteIntro.classList.add('is-video-unavailable');
        window.setTimeout(finishAnimation, 900);
      };

      if (introVideo.ended) {
        finishAnimation();
      } else {
        introVideo.addEventListener('ended', finishAnimation, { once: true });
        introVideo.addEventListener('error', handleVideoError, { once: true });
        introVideo.play().catch(handleVideoError);
        window.setTimeout(finishAnimation, animationDuration + 1500);
      }
    } else {
      if (introVideo instanceof HTMLVideoElement) introVideo.pause();
      window.setTimeout(finishAnimation, animationDuration);
    }

    if (pageLoaded) {
      revealSite();
    } else {
      window.addEventListener('load', () => {
        pageLoaded = true;
        if (animationComplete) siteIntro.dataset.state = 'ready';
        revealSite();
      }, { once: true });
    }
  } else {
    document.documentElement.classList.remove('site-intro-enabled');
    startReveals();
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

  const bgContainer = document.getElementById('artist-bg-container');
  const bgImg = document.getElementById('artist-bg-img');
  const artistList = document.getElementById('artist-list');

  if (bgContainer instanceof HTMLElement && bgImg instanceof HTMLImageElement) {
    const bgLayers = Array.from(bgContainer.querySelectorAll('.artist-bg__image')).filter(
      (layer) => layer instanceof HTMLImageElement,
    );
    let activeBgLayer = null;
    let backgroundRequest = 0;

    const showArtistBackground = (row) => {
      const imageUrl = row.getAttribute('data-img');
      if (!imageUrl) return;

      const request = ++backgroundRequest;
      bgContainer.classList.add('is-visible');

      if (activeBgLayer?.dataset.src === imageUrl) {
        activeBgLayer.classList.add('is-active');
        return;
      }

      const nextLayer = bgLayers.find((layer) => layer !== activeBgLayer) ?? bgImg;
      nextLayer.classList.remove('is-active');
      nextLayer.dataset.src = imageUrl;
      nextLayer.src = imageUrl;

      const revealLayer = () => {
        if (request !== backgroundRequest) return;
        activeBgLayer?.classList.remove('is-active');
        nextLayer.classList.add('is-active');
        activeBgLayer = nextLayer;
      };

      if (nextLayer.complete) {
        window.requestAnimationFrame(revealLayer);
      } else {
        nextLayer.addEventListener('load', revealLayer, { once: true });
      }
    };

    const hideArtistBackground = () => {
      backgroundRequest += 1;
      bgContainer.classList.remove('is-visible');
      activeBgLayer?.classList.remove('is-active');
    };

    document.querySelectorAll('.artist-row').forEach((row) => {
      row.addEventListener('mouseenter', () => showArtistBackground(row));
      row.addEventListener('mouseleave', hideArtistBackground);
      row.addEventListener('focusin', () => showArtistBackground(row));
      row.addEventListener('focusout', hideArtistBackground);
      row.setAttribute('data-artist-hover-ready', 'true');
    });
  }

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
    const rowsToPreload = document.querySelectorAll('.artist-row');
    rowsToPreload.forEach((row) => {
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

  // Sync Lyrics Player State
  const syncPlayers = new WeakMap();

  class SyncLyricsPlayer {
    constructor(lyricBox, controls) {
      this.lyricBox = lyricBox;
      this.controls = controls;
      this.playBtn = controls.querySelector('.sync-play-btn');
      this.resetBtn = controls.querySelector('.sync-reset-btn');
      this.iconPlay = this.playBtn?.querySelector('.icon-play');
      this.iconPause = this.playBtn?.querySelector('.icon-pause');
      this.lines = Array.from(lyricBox.querySelectorAll('.lyric-line'));
      
      this.playing = false;
      this.currentTime = 0;
      this.lastTick = 0;
      this.animationFrame = null;
      
      this.initDOM();
      
      this.lyricBox.addEventListener('click', (e) => {
        if (!this.lyricBox.classList.contains('sync-enabled')) return;
        const line = e.target.closest('.lyric-line');
        if (!line) return;
        const time = parseFloat(line.dataset.time);
        if (!isNaN(time)) {
          this.seek(time);
          if (!this.playing) this.togglePlay();
        }
      });
    }

    initDOM() {
      // Group text nodes into .lrc-word spans for word-by-word highlights
      this.lines.forEach(line => {
        let lineStartTime = Infinity;
        const containers = line.querySelectorAll('.jp-lyric, .cn-lyric, .en-lyric, .trans-lyric');
        
        containers.forEach(container => {
          let currentTime = null;
          let currentWordNodes = [];
          let words = [];

          const flush = () => {
             if (currentTime !== null && currentWordNodes.length > 0) {
                words.push({ time: currentTime, nodes: currentWordNodes });
             }
             currentWordNodes = [];
          };

          Array.from(container.childNodes).forEach(child => {
             if (child.tagName === 'LRC-TAG' || (child.classList && child.classList.contains('lrc-tag'))) {
                 flush();
                 currentTime = parseFloat(child.dataset.time);
                 if (currentTime < lineStartTime) lineStartTime = currentTime;
             } else {
                 if (currentTime !== null) {
                     currentWordNodes.push(child);
                 }
             }
          });
          flush();

          words.forEach((word, index) => {
             const span = document.createElement('span');
             span.className = 'lrc-word';
             span.dataset.time = word.time;
             if (index < words.length - 1) span.dataset.endTime = words[index + 1].time;
             word.nodes[0].parentNode.insertBefore(span, word.nodes[0]);
             word.nodes.forEach(n => span.appendChild(n));
          });
        });
        
        if (lineStartTime !== Infinity) {
          line.dataset.time = lineStartTime;
        }
      });
      
      // Collect all words
      this.words = Array.from(this.lyricBox.querySelectorAll('.lrc-word'));
      // Remove raw lrc-tags to clean up DOM
      this.lyricBox.querySelectorAll('lrc-tag').forEach(tag => tag.remove());
    }

    togglePlay() {
      this.playing = !this.playing;
      if (this.playing) {
        this.lastTick = performance.now();
        this.loop();
        if (this.iconPlay) this.iconPlay.style.display = 'none';
        if (this.iconPause) this.iconPause.style.display = 'block';
      } else {
        cancelAnimationFrame(this.animationFrame);
        if (this.iconPlay) this.iconPlay.style.display = 'block';
        if (this.iconPause) this.iconPause.style.display = 'none';
      }
    }

    reset() {
      this.playing = false;
      this.currentTime = 0;
      cancelAnimationFrame(this.animationFrame);
      if (this.iconPlay) this.iconPlay.style.display = 'block';
      if (this.iconPause) this.iconPause.style.display = 'none';
      this.updateUI();
    }

    seek(time) {
      this.currentTime = time;
      this.lastTick = performance.now();
      this.updateUI();
    }

    loop() {
      if (!this.playing) return;
      const now = performance.now();
      const delta = (now - this.lastTick) / 1000;
      this.lastTick = now;
      this.currentTime += delta;
      
      this.updateUI();
      this.animationFrame = requestAnimationFrame(() => this.loop());
    }

    updateUI() {
      const time = this.currentTime;
      let activeLine = null;
      
      this.lines.forEach(line => {
        const lineTime = parseFloat(line.dataset.time);
        if (!isNaN(lineTime) && time >= lineTime) {
          activeLine = line;
        }
        line.classList.remove('is-active');
      });
      
      if (activeLine) {
        activeLine.classList.add('is-active');
        // Optional: auto-scroll to active line
        // activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      this.words.forEach(word => {
        const wordTime = parseFloat(word.dataset.time);
        if (time >= wordTime) {
          word.classList.add('is-active');
        } else {
          word.classList.remove('is-active');
        }
      });
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element && event.target.closest('[data-lyric-action]');
    if (!(button instanceof HTMLButtonElement)) return;

    const controls = button.closest('.my-lyric-controls');
    const lyricBox = controls?.nextElementSibling;
    if (!(lyricBox instanceof HTMLElement) || !lyricBox.classList.contains('my-lyric-box')) return;

    const action = button.dataset.lyricAction;
    
    if (action === 'sync-play-pause') {
      let player = syncPlayers.get(lyricBox);
      if (player) player.togglePlay();
      return;
    }
    
    if (action === 'sync-reset') {
      let player = syncPlayers.get(lyricBox);
      if (player) player.reset();
      return;
    }

    let active = false;

    if (action === 'ruby') active = lyricBox.classList.toggle('hide-ruby');
    else if (action === 'translation') active = lyricBox.classList.toggle('hide-translation');
    else if (action === 'phonetic') active = lyricBox.classList.toggle('show-romaji');
    else if (action === 'sync-lyrics') {
      active = lyricBox.classList.toggle('sync-enabled');
      const playBtn = controls.querySelector('.sync-play-btn');
      const resetBtn = controls.querySelector('.sync-reset-btn');
      
      if (active) {
        if (!syncPlayers.has(lyricBox)) {
          syncPlayers.set(lyricBox, new SyncLyricsPlayer(lyricBox, controls));
        }
        if (playBtn) playBtn.style.display = 'inline-flex';
        if (resetBtn) resetBtn.style.display = 'inline-flex';
        // Auto scroll setup or initial UI update
        syncPlayers.get(lyricBox).updateUI();
      } else {
        const player = syncPlayers.get(lyricBox);
        if (player) {
          player.reset();
        }
        if (playBtn) playBtn.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'none';
      }
    }
    else return;

    button.setAttribute('aria-pressed', String(active));
    if (action === 'phonetic') {
      button.textContent = active ? button.dataset.alternateLabel || '' : button.dataset.primaryLabel || '';
    } else if (action !== 'sync-play-pause' && action !== 'sync-reset') {
      button.textContent = active ? button.dataset.showLabel || '' : button.dataset.hideLabel || '';
    }
  });

  const toggleSpoiler = (spoiler) => {
    const revealed = spoiler.classList.toggle('is-revealed');
    spoiler.setAttribute('aria-expanded', String(revealed));
  };

  document.addEventListener('click', (event) => {
    const spoiler = event.target instanceof Element && event.target.closest('.wiki-spoiler');
    if (spoiler instanceof HTMLElement) toggleSpoiler(spoiler);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const spoiler = event.target instanceof Element && event.target.closest('.wiki-spoiler');
    if (!(spoiler instanceof HTMLElement)) return;
    event.preventDefault();
    toggleSpoiler(spoiler);
  });

  // ── Artist category expand/collapse ──
  if (artistList instanceof HTMLElement) {
    artistList.addEventListener('click', (event) => {
      const button = event.target instanceof Element && event.target.closest('.artist-expand-btn');
      if (!button) return;

      const collapsibleId = button.getAttribute('aria-controls');
      if (!collapsibleId) return;

      const collapsible = document.getElementById(collapsibleId);
      if (!(collapsible instanceof HTMLElement)) return;

      const copy = button.querySelector('[data-artist-expand-copy]');
      const inner = collapsible.querySelector('.artist-collapsible__inner');
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      const nextExpanded = !isExpanded;

      if (inner instanceof HTMLElement) {
        collapsible.style.setProperty('--artist-collapsible-height', `${inner.scrollHeight}px`);
      }

      button.setAttribute('aria-expanded', String(nextExpanded));
      collapsible.dataset.expanded = String(nextExpanded);
      collapsible.setAttribute('aria-hidden', String(!nextExpanded));
      collapsible.inert = !nextExpanded;

      if (copy) {
        copy.textContent = nextExpanded
          ? button.getAttribute('data-collapse-label') || ''
          : button.getAttribute('data-expand-label') || '';
      }

      button.setAttribute(
        'aria-label',
        nextExpanded
          ? button.getAttribute('data-collapse-label') || ''
          : button.getAttribute('data-expand-label') || '',
      );
    });
  }
});
