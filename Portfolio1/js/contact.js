const API_URL = "https://mx-portfolio.onrender.com"; // Render'dan olgan backend silkangiz

const form = document.getElementById("contact-form");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const button = form.querySelector(".glow-button");

    const formData = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        message: document.getElementById("message").value.trim()
    };

    button.disabled = true;
    button.textContent = "Sending...";

    try {

        const response = await fetch(`${API_URL}/api/contact`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Something went wrong.");
        }

        alert("✅ Message sent successfully!");

        form.reset();

    } catch (error) {

        console.error(error);

        alert(error.message);

    } finally {

        button.disabled = false;
        button.textContent = "Send Message";

    }
});






'use strict';

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

    this.resize();
    this.populate();
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

  resize() {
    const { clientWidth, clientHeight } = this.canvas;
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
  setInterval(update, 1000);
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
   Init
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
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

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        engine.start();
      } else {
        engine.stop();
      }
    }, { threshold: 0.05 });

    visibilityObserver.observe(footer);

    window.addEventListener('resize', debounce(() => engine.resize(), 150), { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        engine.stop();
      } else {
        engine.start();
      }
    });
  }
});