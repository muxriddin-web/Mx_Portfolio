'use strict';

const API_URL = "https://mx-portfolio.onrender.com"; // Render'dan olingan backend manzili
const REQUEST_TIMEOUT_MS = 60000;   // Render bepul tarifi "uxlab qolgan" bo'lsa uyg'onishi 30-60s olishi mumkin
const SLOW_HINT_MS = 6000;
const ENABLE_VIDEO_ON_MOBILE = true; // telefonda orqa fon videosini o'chirish uchun false qiling

/* ==========================================================================
   Contact form
   Tuzatishlar:
   - So'rov uchun timeout (eski kodda server uxlab yotganda tugma "Sending..." da
     cheksiz qotib qolardi).
   - Server HTML (502/504) qaytarsa response.json() xato bermasligi uchun xavfsiz parse.
   - Sahifa ochilganda backend "uyg'otiladi" (warm-up), foydalanuvchi forma
     to'ldirguncha server tayyor bo'ladi.
   ========================================================================== */

(function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const button = form.querySelector(".glow-button");

  // Backendni oldindan uyg'otish (javob kerak emas)
  const warmUp = () => {
    try {
      fetch(API_URL, { method: "GET", mode: "no-cors", cache: "no-store" }).catch(() => {});
    } catch (_) { /* e'tiborsiz */ }
  };
  if (document.readyState === "complete") {
    setTimeout(warmUp, 500);
  } else {
    window.addEventListener("load", () => setTimeout(warmUp, 500), { once: true });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      message: document.getElementById("message").value.trim()
    };

    button.disabled = true;
    button.textContent = "Sending...";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const slowId = setTimeout(() => {
      button.textContent = "Server is waking up...";
    }, SLOW_HINT_MS);

    try {
      const response = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData),
        signal: controller.signal
      });

      let data = {};
      try {
        data = await response.json();
      } catch (_) { /* server JSON qaytarmadi */ }

      if (!response.ok) {
        throw new Error(data.message || `Server error (${response.status}). Please try again.`);
      }

      alert("✅ Message sent successfully!");
      form.reset();

    } catch (error) {
      console.error(error);

      if (error.name === "AbortError") {
        alert("The server took too long to respond. Please try again in a moment.");
      } else if (error instanceof TypeError) {
        alert("Network error. Please check your connection and try again.");
      } else {
        alert(error.message || "Something went wrong.");
      }

    } finally {
      clearTimeout(timeoutId);
      clearTimeout(slowId);
      button.disabled = false;
      button.textContent = "Send Message";
    }
  });
})();

/* ==========================================================================
   Utilities
   ========================================================================== */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const isCompactViewport = () => window.innerWidth <= 1080;

function debounce(fn, wait) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), wait);
  };
}

function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

/* ==========================================================================
   Bubble Engine — GPU-friendly canvas particle field
   Two particle kinds share one canvas/RAF loop for performance:
   "orbs" (soft glow, slow drift) and "dust" (tiny, faster, twinkling)
   ========================================================================== */

class BubbleEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.colors = options.colors ?? ['#00F5FF', '#8B5CF6', '#3B82F6'];
    this.sprites = this.buildSprites(this.colors);
    this.setDensityTier();

    this.orbs = [];
    this.dust = [];
    this.width = 0;
    this.height = 0;
    this.rafId = null;
    this.isRunning = false;

    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);

    this.resize(true);
  }

  buildSprites(colors) {
    const size = 64;
    const half = size / 2;
    return colors.map((color) => {
      const sprite = document.createElement('canvas');
      sprite.width = size;
      sprite.height = size;
      const ctx = sprite.getContext('2d');
      const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      return sprite;
    });
  }

  setDensityTier() {
    const width = window.innerWidth;
    if (width <= 640) {
      this.maxOrbs = 14;
      this.maxDust = 18;
    } else if (width <= 1080) {
      this.maxOrbs = 22;
      this.maxDust = 30;
    } else {
      this.maxOrbs = 34;
      this.maxDust = 48;
    }
  }

  /**
   * Telefonda manzil satri yashirinib/ko'ringanda 'resize' hodisasi ketma-ket chaqiriladi.
   * O'lcham aslida o'zgarmagan bo'lsa canvas qayta yaratilmaydi va zarrachalar
   * qayta aralashtirilmaydi (eski kodda har safar sakrab/miltillab qolardi).
   */
  resize(force = false) {
    const { clientWidth, clientHeight } = this.canvas;
    if (!force && clientWidth === this.width && clientHeight === this.height) return;

    this.width = clientWidth;
    this.height = clientHeight;

    this.canvas.width = Math.round(clientWidth * this.dpr);
    this.canvas.height = Math.round(clientHeight * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.setDensityTier();
    this.populate();
  }

  populate() {
    const orbTarget = Math.min(this.maxOrbs, Math.round(this.width * this.height * 0.00006));
    const dustTarget = Math.min(this.maxDust, Math.round(this.width * this.height * 0.00008));

    this.orbs = Array.from({ length: orbTarget }, () => this.createOrb());
    this.dust = Array.from({ length: dustTarget }, () => this.createDust());
  }

  createOrb() {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      radius: 6 + Math.random() * 16,
      alpha: 0.05 + Math.random() * 0.09,
      speedY: 0.05 + Math.random() * 0.13,
      driftX: (Math.random() - 0.5) * 0.1,
      driftPhase: Math.random() * Math.PI * 2,
      spriteIndex: Math.floor(Math.random() * this.sprites.length),
    };
  }

  createDust() {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      radius: 0.6 + Math.random() * 1.6,
      baseAlpha: 0.15 + Math.random() * 0.35,
      alpha: 0.2,
      speedY: 0.12 + Math.random() * 0.28,
      driftX: (Math.random() - 0.5) * 0.18,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.0012 + Math.random() * 0.0022,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
    };
  }

  stepOrb(p, elapsed) {
    p.y -= p.speedY;
    p.x += p.driftX + Math.sin(elapsed * 0.0004 + p.driftPhase) * 0.03;
    if (p.y < -p.radius * 4) {
      p.y = this.height + p.radius * 4;
      p.x = Math.random() * this.width;
    }
    if (p.x < -40) p.x = this.width + 40;
    if (p.x > this.width + 40) p.x = -40;
  }

  stepDust(p, elapsed) {
    p.y -= p.speedY;
    p.x += p.driftX;
    p.alpha = p.baseAlpha * (0.4 + 0.6 * Math.abs(Math.sin(elapsed * p.twinkleSpeed + p.twinklePhase)));
    if (p.y < -4) {
      p.y = this.height + 4;
      p.x = Math.random() * this.width;
    }
    if (p.x < -10) p.x = this.width + 10;
    if (p.x > this.width + 10) p.x = -10;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (const p of this.orbs) {
      const sprite = this.sprites[p.spriteIndex];
      const size = p.radius * 2;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.drawImage(sprite, p.x - p.radius, p.y - p.radius, size, size);
    }

    for (const p of this.dust) {
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
  }

  tick(timestamp) {
    if (!this.isRunning) return;
    for (const p of this.orbs) this.stepOrb(p, timestamp);
    for (const p of this.dust) this.stepDust(p, timestamp);
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  }

  start() {
    if (this.isRunning || prefersReducedMotion) return;
    this.isRunning = true;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  destroy() {
    this.stop();
    this.orbs = [];
    this.dust = [];
  }
}

/* ==========================================================================
   Clock — live local time
   ========================================================================== */

function initClock(el) {
  if (!el) return;

  const formatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const update = () => {
    const now = new Date();
    el.textContent = formatter.format(now);
    el.setAttribute('datetime', now.toISOString());
  };

  update();
  setInterval(() => {
    if (!document.hidden) update();
  }, 1000);
}

/* ==========================================================================
   Mouse Spotlight (tied to background radial-gradient position)
   ========================================================================== */

function initSpotlight(footer, spotlightEl) {
  if (!spotlightEl || isCoarsePointer || prefersReducedMotion) return;

  let frame = null;

  const handleMove = (event) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      const rect = footer.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      spotlightEl.style.setProperty('--spot-x', `${x}%`);
      spotlightEl.style.setProperty('--spot-y', `${y}%`);
      frame = null;
    });
  };

  footer.addEventListener('pointerenter', () => spotlightEl.classList.add('is-active'), { passive: true });
  footer.addEventListener('pointerleave', () => spotlightEl.classList.remove('is-active'), { passive: true });
  footer.addEventListener('pointermove', handleMove, { passive: true });
}

/* ==========================================================================
   Cursor Magnetic Glow — a trailing light blob with eased follow
   ========================================================================== */

function initCursorGlow(footer, glowEl) {
  if (!glowEl || isCoarsePointer || prefersReducedMotion || isCompactViewport()) return;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let rafId = null;
  let active = false;

  const animate = () => {
    currentX = lerp(currentX, targetX, 0.12);
    currentY = lerp(currentY, targetY, 0.12);
    glowEl.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

    if (active) {
      rafId = requestAnimationFrame(animate);
    } else {
      rafId = null;
    }
  };

  footer.addEventListener('pointermove', (event) => {
    const rect = footer.getBoundingClientRect();
    targetX = event.clientX - rect.left;
    targetY = event.clientY - rect.top;
    if (!rafId) {
      rafId = requestAnimationFrame(animate);
    }
  }, { passive: true });

  footer.addEventListener('pointerenter', () => {
    active = true;
    glowEl.classList.add('is-active');
    if (!rafId) rafId = requestAnimationFrame(animate);
  }, { passive: true });

  footer.addEventListener('pointerleave', () => {
    active = false;
    glowEl.classList.remove('is-active');
  }, { passive: true });
}

/* ==========================================================================
   Social ripple origin tracking
   ========================================================================== */

function initSocialRipples(footer) {
  const links = footer.querySelectorAll('.social-link');
  links.forEach((link) => {
    link.addEventListener('pointermove', (event) => {
      const rect = link.getBoundingClientRect();
      const rx = ((event.clientX - rect.left) / rect.width) * 100;
      const ry = ((event.clientY - rect.top) / rect.height) * 100;
      link.style.setProperty('--rx', `${rx}%`);
      link.style.setProperty('--ry', `${ry}%`);
    }, { passive: true });
  });
}

/* ==========================================================================
   Magnetic Back-to-top button
   ========================================================================== */

function initMagneticButton(button) {
  if (!button || isCoarsePointer || prefersReducedMotion) return;

  const radius = 70;
  const strength = 0.35;
  let frame = null;

  const handleMove = (event) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      const rect = button.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const distance = Math.hypot(dx, dy);

      if (distance < radius) {
        const pull = (1 - distance / radius) * strength;
        button.style.transform = `translate(${dx * pull}px, ${dy * pull}px)`;
      } else {
        button.style.transform = '';
      }
      frame = null;
    });
  };

  const reset = () => {
    button.style.transform = '';
  };

  window.addEventListener('pointermove', handleMove, { passive: true });
  button.addEventListener('pointerleave', reset, { passive: true });
}

/* ==========================================================================
   Reveal on scroll (per-column) + footer-level "living" activation
   ========================================================================== */

function initReveal(footer) {
  const targets = footer.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });

  targets.forEach((el, index) => {
    el.style.transitionDelay = `${index * 70}ms`;
    observer.observe(el);
  });
}

function initLiveActivation(footer) {
  if (!('IntersectionObserver' in window)) {
    footer.classList.add('is-live');
    return;
  }

  const observer = new IntersectionObserver(([entry]) => {
    footer.classList.toggle('is-live', entry.isIntersecting);
  }, { threshold: 0.1 });

  observer.observe(footer);
}

/* ==========================================================================
   Back to top — scroll action
   ========================================================================== */

function initBackToTop(button) {
  if (!button) return;

  button.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  });
}

/* ==========================================================================
   Background video — sahifa interaktiv bo'lgandan KEYIN yuklanadi
   Tuzatishlar:
   - Eski holatda <video autoplay> sahifa ochilishi bilan katta faylni
     yuklashni boshlardi va forma/menyu bilan raqobatlashardi.
   - Ekrandan chiqqanda va tab yashirilganda to'xtaydi (batareya va CPU).
   - Tarmoq "saveData" rejimida yoki reduced-motion'da yuklanmaydi.
   ========================================================================== */

function initBackgroundVideo() {
  const video = document.querySelector('.bg-video');
  if (!video) return;

  const src = video.dataset.src;
  if (!src) return;

  const conn = navigator.connection;
  if (prefersReducedMotion || (conn && conn.saveData)) return;
  if (!ENABLE_VIDEO_ON_MOBILE && window.matchMedia('(max-width: 768px)').matches) return;

  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('muted', '');

  let started = false;
  let inView = true;

  const sync = () => {
    if (!started) return;
    if (inView && !document.hidden) {
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      video.pause();
    }
  };

  const start = () => {
    if (started) return;
    started = true;
    video.addEventListener('playing', () => video.classList.add('is-ready'), { once: true });
    video.src = src;
    sync();
  };

  const startWhenIdle = () => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(start, { timeout: 2500 });
    } else {
      setTimeout(start, 400);
    }
  };

  if (document.readyState === 'complete') {
    startWhenIdle();
  } else {
    window.addEventListener('load', startWhenIdle, { once: true });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    }, { threshold: 0.05 }).observe(video);
  }

  document.addEventListener('visibilitychange', sync);
}

/* ==========================================================================
   Boshqa sahifalarni bo'sh vaqtda oldindan yuklash (menyu tez ochilishi uchun)
   ========================================================================== */

function initPagePrefetch() {
  const conn = navigator.connection;
  if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return;

  const run = () => {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    idle(() => {
      const seen = new Set();
      document.querySelectorAll('.nav-links a[href]').forEach((a) => {
        const url = new URL(a.getAttribute('href'), window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname || seen.has(url.pathname)) return;
        seen.add(url.pathname);
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'document';
        link.href = url.href;
        document.head.appendChild(link);
      });
    });
  };

  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}

/* ==========================================================================
   Init
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initBackgroundVideo();
  initPagePrefetch();

  const footer = document.querySelector('.site-footer');
  if (!footer) return;

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  initClock(document.getElementById('clock'));
  initBackToTop(document.getElementById('backToTop'));
  initMagneticButton(document.getElementById('backToTop'));
  initSpotlight(footer, document.getElementById('spotlight'));
  initCursorGlow(footer, document.getElementById('cursorGlow'));
  initSocialRipples(footer);
  initReveal(footer);
  initLiveActivation(footer);

  const canvas = document.getElementById('bubbleCanvas');
  if (canvas) {
    const engine = new BubbleEngine(canvas);
    let footerInView = false;

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      footerInView = entry.isIntersecting;
      if (footerInView && !document.hidden) {
        engine.start();
      } else {
        engine.stop();
      }
    }, { threshold: 0.05 });

    visibilityObserver.observe(footer);

    window.addEventListener('resize', debounce(() => engine.resize(), 150), { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden || !footerInView) {
        engine.stop();
      } else {
        engine.start();
      }
    });
  }
});
