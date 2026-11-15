(() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    /* =========================================================
       NAVBAR ACTIVE LINK — joriy sahifaga qarab avtomatik belgilash
       (about.html, /about, "/" — hammasi to'g'ri taniladi)
       ========================================================= */
    const pageName = (path) => (path.split('/').pop().replace(/\.html$/i, '') || 'index').toLowerCase();
    const currentPage = pageName(window.location.pathname);
    const navLinks = document.querySelectorAll('.nav-links a.glow-link');

    navLinks.forEach((link) => {
        const target = pageName(new URL(link.getAttribute('href'), window.location.href).pathname);
        link.classList.toggle('active', target === currentPage);

        // Boshqa sahifaga o'tishdan oldin ham darhol vizual feedback berish uchun
        link.addEventListener('click', function () {
            navLinks.forEach((l) => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    /* =========================================================
       COUNTER ANIMATION (vaqtga asoslangan, rAF bilan)
       ========================================================= */
    function animateCounters() {
        const counters = document.querySelectorAll('.counter');
        const duration = 1500;

        counters.forEach((counter) => {
            const target = parseInt(counter.getAttribute('data-target'), 10) || 0;

            if (prefersReducedMotion) {
                counter.textContent = target;
                return;
            }

            let startTime = null;
            const step = (now) => {
                if (startTime === null) startTime = now;
                const progress = Math.min((now - startTime) / duration, 1);
                counter.textContent = Math.floor(progress * target);
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    counter.textContent = target;
                }
            };
            requestAnimationFrame(step);
        });
    }

    /* INTERSECTION OBSERVER (counter faqat ko'ringanda) */
    const statsSection = document.querySelector('.stats');
    if (statsSection) {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        animateCounters();
                        observer.disconnect();
                    }
                });
            }, { threshold: 0.3 });
            observer.observe(statsSection);
        } else {
            animateCounters();
        }
    }

    /* =========================================================
       PROFILE CARD 3D PARALLAX (faqat sichqoncha mavjud qurilmalarda, rAF bilan)
       ========================================================= */
    const profileCard = document.querySelector('.profile-card');

    if (profileCard && finePointer.matches && !prefersReducedMotion) {
        let cardRaf = 0;
        let mx = 0;
        let my = 0;

        const paintCard = () => {
            cardRaf = 0;
            const rect = profileCard.getBoundingClientRect();
            const x = mx - rect.left;
            const y = my - rect.top;
            const rotateX = (y - rect.height / 2) / 10;
            const rotateY = (rect.width / 2 - x) / 10;
            profileCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        };

        const onMove = (e) => {
            mx = e.clientX;
            my = e.clientY;
            if (!cardRaf) cardRaf = requestAnimationFrame(paintCard);
        };

        profileCard.addEventListener('mouseenter', () => {
            profileCard.addEventListener('mousemove', onMove, { passive: true });
        });
        profileCard.addEventListener('mouseleave', () => {
            profileCard.removeEventListener('mousemove', onMove);
            cancelAnimationFrame(cardRaf);
            cardRaf = 0;
            profileCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
        });
    }

    /* =========================================================
       GTA 3D PARALLAX & REAL GUNFIRE
       About ostida ochiladigan reveal-footer sahnasi.

       Tuzatishlar:
       - Sahna faqat ochila boshlaganda "faol" bo'ladi (.is-active): oldin u
         yashirin va animatsiyalari to'xtatilgan.
       - mousemove'da document.body.offsetHeight o'qilmaydi (layout thrashing yo'q).
       - "Yo'q"/"Ha" dan keyin location.reload() o'rniga sahna joyida tiklanadi.
       ========================================================= */
    (function initGtaScene() {
        const overlay = $('gta-overlay');
        const btnYes = $('yes-trigger');
        const btnNo = $('no-trigger');
        const flash = $('flash-effect');
        const bullet = $('bullet-effect');
        const barrelGlow = $('barrel-glow');
        const hud = $('p-hud');
        const bg = $('p-bg');
        const char = $('p-char');

        if (!overlay || !btnYes || !btnNo || !hud) return;

        const curtain = overlay.previousElementSibling; // ustki "parda" (.about)
        const mobileLayout = window.matchMedia('(max-width: 860px)');
        const hudHTML = hud.innerHTML;
        const hudStyleAttr = hud.getAttribute('style');

        let active = false;
        let revealed = false;
        let busy = false;
        let parallaxRaf = 0;
        let pageX = 0;
        let pageY = 0;
        let revealRaf = 0;
        const timers = [];
        const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

        function updateReveal() {
            revealRaf = 0;
            if (!curtain) return;
            const bottom = curtain.getBoundingClientRect().bottom;
            const vh = window.innerHeight;

            const shouldBeActive = bottom < vh * 1.25;
            if (shouldBeActive !== active) {
                active = shouldBeActive;
                overlay.classList.toggle('is-active', active);
            }
            revealed = bottom <= Math.max(20, vh * 0.02);
        }

        window.addEventListener('scroll', () => {
            if (!revealRaf) revealRaf = requestAnimationFrame(updateReveal);
        }, { passive: true });
        window.addEventListener('resize', () => {
            if (!revealRaf) revealRaf = requestAnimationFrame(updateReveal);
        }, { passive: true });
        updateReveal();

        function applyParallax() {
            parallaxRaf = 0;
            if (!revealed || mobileLayout.matches || !finePointer.matches) return;
            const x = (window.innerWidth / 2 - pageX) / 35;
            const y = (window.innerHeight / 2 - pageY) / 35;
            if (bg) bg.style.transform = `translateX(${x * 0.5}px) translateY(${y * 0.5}px)`;
            if (char) char.style.transform = `rotateY(${15 - x}deg) rotateX(${y}deg)`;
        }

        window.addEventListener('mousemove', (e) => {
            if (!revealed || mobileLayout.matches || !finePointer.matches) return;
            pageX = e.pageX;
            pageY = e.pageY;
            if (!parallaxRaf) parallaxRaf = requestAnimationFrame(applyParallax);
        }, { passive: true });

        const onLayoutChange = (e) => {
            if (e.matches) {
                if (char) char.style.transform = '';
                if (bg) bg.style.transform = '';
            }
        };
        if (mobileLayout.addEventListener) mobileLayout.addEventListener('change', onLayoutChange);
        else if (mobileLayout.addListener) mobileLayout.addListener(onLayoutChange);

        function resetScene() {
            timers.forEach(clearTimeout);
            timers.length = 0;

            overlay.classList.remove('screen-shake', 'wasted-active');
            if (barrelGlow) barrelGlow.classList.remove('glow-active');
            if (flash) flash.classList.remove('shoot-flash-on');
            if (bullet) bullet.classList.remove('shoot-bullet-on');

            hud.innerHTML = hudHTML;
            if (hudStyleAttr === null) hud.removeAttribute('style');
            else hud.setAttribute('style', hudStyleAttr);

            if (bg) bg.style.transform = '';
            if (char) char.style.transform = '';

            window.scrollTo(0, 0);
            busy = false;
            updateReveal();
        }

        function makeHudBare() {
            hud.style.background = 'transparent';
            hud.style.border = 'none';
            hud.style.boxShadow = 'none';
        }

        function triggerNo() {
            if (busy) return;
            busy = true;

            if (barrelGlow) barrelGlow.classList.add('glow-active');
            if (flash) flash.classList.add('shoot-flash-on');
            if (bullet) bullet.classList.add('shoot-bullet-on');

            overlay.classList.add('screen-shake');

            later(() => {
                overlay.classList.add('wasted-active');
                hud.innerHTML = `
                    <h1 style="
                        color: red !important;
                        font-size: clamp(2.2rem, 10vw, 6rem) !important;
                        text-shadow: 5px 5px #000 !important;
                        text-align: center !important;
                        margin: 0 !important;
                        font-family: 'Pricedown', sans-serif !important;
                    ">
                        wasted
                    </h1>
                `;
                makeHudBare();
            }, 250);

            later(resetScene, 3500);
        }

        function triggerYes() {
            if (busy) return;
            busy = true;

            hud.innerHTML = "<h1 style='color: #00ff66; font-size: clamp(2rem, 9vw, 5rem); text-align:center; text-shadow: 4px 4px #000; margin:0;'>RESPECT +</h1>";
            makeHudBare();

            later(resetScene, 2500);
        }

        hud.addEventListener('click', (e) => {
            const btn = e.target.closest('#yes-trigger, #no-trigger');
            if (!btn) return;
            if (btn.id === 'no-trigger') triggerNo();
            else triggerYes();
        });
    })();

    /* =========================================================
       BOSHQA SAHIFALARNI BO'SH VAQTDA OLDINDAN YUKLASH
       ========================================================= */
    (function prefetchPages() {
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
    })();
})();
