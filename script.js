// ============================================================
// Year
// ============================================================
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// ============================================================
// TIME-BASED GREETING — auto-updates with fade+slide animation
// ============================================================
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)  return { emoji: '☀️', text: 'Chasing New Ideas.' };
  if (hour >= 12 && hour < 17) return { emoji: '✨', text: 'Building Something Beautiful.' };
  if (hour >= 17 && hour < 20) return { emoji: '🌇', text: 'Creativity Never Rests.' };
  return { emoji: '🌙', text: 'Still Creating.' };
}

function renderGreeting() {
  const el = document.getElementById('heroGreeting');
  if (!el) return;
  const { emoji, text } = getGreeting();

  el.innerHTML = '';
  el.classList.remove('greeting-animate');

  const span = document.createElement('span');
  span.className = 'greeting-animate greeting-flex';
  span.innerHTML = `<span class="greeting-emoji">${emoji}</span><span class="greeting-text-premium">${text}</span>`;
  el.appendChild(span);

  void el.offsetWidth;
  span.classList.add('greeting-animate');
}

renderGreeting();
setInterval(renderGreeting, 60000);

// ============================================================
// MOBILE NAV TOGGLE
// ============================================================
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
  });
  navLinks.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// ============================================================
// SCROLL PROGRESS BAR — Throttled with requestAnimationFrame
// ============================================================
const progressSpan = document.querySelector('#progressBar span');
let progressTicking = false;

function updateProgress() {
  const h = document.documentElement;
  const scrolled = window.scrollY || h.scrollTop;
  const height = h.scrollHeight - h.clientHeight;
  if (progressSpan) {
    progressSpan.style.width = height > 0 ? `${(scrolled / height) * 100}%` : '0%';
  }
  progressTicking = false;
}

window.addEventListener('scroll', () => {
  if (!progressTicking) {
    requestAnimationFrame(updateProgress);
    progressTicking = true;
  }
}, { passive: true });
updateProgress();

// ============================================================
// SCROLL REVEAL
// ============================================================
const revealEls = Array.from(document.querySelectorAll('[data-reveal]'));

if (revealEls.length > 0) {
  const pending = new Set(revealEls);
  const show = (el) => { el.classList.add('in-view'); pending.delete(el); };

  if ('IntersectionObserver' in window) {
    // threshold 0 + a small negative bottom margin: an element reveals as soon
    // as any part of it clears the fold. The old 12% threshold could never be
    // met by elements taller than the viewport, leaving whole sections blank.
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          show(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '120px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(show);
  }

  // Safety sweep: reveal anything the reader has already reached, even if the
  // observer never fired for it — e.g. cards clipped inside the gallery's own
  // scroll box, which never intersect the viewport on their own. Capture phase
  // is used so scrolling those inner containers triggers it too.
  let ticking = false;
  const sweep = () => {
    ticking = false;
    if (!pending.size) return;
    const limit = window.innerHeight * 1.05;
    pending.forEach(el => { if (el.getBoundingClientRect().top < limit) show(el); });
  };
  const queueSweep = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(sweep);
  };
  window.addEventListener('scroll', queueSweep, { passive: true, capture: true });
  window.addEventListener('resize', queueSweep, { passive: true });
  window.addEventListener('load', queueSweep);
  queueSweep();
}

// ============================================================
// ACTIVE NAV LINK HIGHLIGHTING (Cached DOM Map)
// ============================================================
const sections = document.querySelectorAll('main section[id]');
const navAnchorsMap = new Map();
document.querySelectorAll('[data-nav]').forEach(a => {
  const href = a.getAttribute('href');
  if (href && href.startsWith('#')) {
    navAnchorsMap.set(href.substring(1), a);
  }
});

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      const targetLink = navAnchorsMap.get(id);
      if (targetLink) {
        navAnchorsMap.forEach(link => link.classList.remove('active'));
        targetLink.classList.add('active');
      }
    }
  });
}, { rootMargin: '-40% 0px -50% 0px' });
sections.forEach(s => navObserver.observe(s));

// ============================================================
// PROJECT CATEGORY TABS — Event Delegation & Fast Filtering
// ============================================================
const tabsContainer = document.getElementById('tabs');
const tabs = document.querySelectorAll('.tab');
const cards = document.querySelectorAll('.proof-card');

if (tabsContainer) {
  tabsContainer.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const filter = tab.dataset.filter;
    cards.forEach(card => {
      const match = filter === 'all' || card.dataset.cat === filter;
      card.classList.toggle('is-hidden', !match);
    });
  });
}

// ============================================================
// VIDEO / MEDIA PERFORMANCE OBSERVER
// Reels carry a poster and a data-src: nothing is downloaded until a card is
// close to the viewport, and only the reels actually on screen decode frames.
// ============================================================
const videoEls = document.querySelectorAll('video[data-src]');
if (videoEls.length > 0) {
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!('IntersectionObserver' in window)) {
    // No observer support: fall back to the poster only, nothing to download.
  } else {
    // 1. Fetch the file a little before the card arrives, so playback is ready.
    const loadObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const video = entry.target;
        if (!video.src && !saveData) video.src = video.dataset.src;
        loadObserver.unobserve(video);
      });
    }, { rootMargin: '400px 0px' });

    // 2. Play only what is genuinely on screen; pause everything else so the
    //    browser never decodes several 720p streams at once while scrolling.
    const playObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting && !saveData && !reduceMotion) {
          video.play().catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { threshold: 0.25 });

    videoEls.forEach(v => { loadObserver.observe(v); playObserver.observe(v); });
  }
}

// ============================================================
// TOOLKIT MARQUEE TRACK ENFORCEMENT
// ============================================================
(function setupMarquee() {
  const track = document.getElementById('toolkitTrack');
  if (!track) return;
  track.style.display = 'flex';
  track.style.flexWrap = 'nowrap';
  track.style.overflow = 'hidden';
})();
