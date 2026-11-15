(() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    /* =========================================================
       LOADING SCREEN (agar HTML'da .loading-screen bo'lsa)
       Eski kod: 'load' + 800ms kutardi va body.style.overflow = 'visible' qilardi —
       bu CSS'dagi overflow-x:hidden'ni bekor qilib, telefonda gorizontal siljish va
       "responsiv buzilish"ga olib kelardi. Endi sun'iy kutish ham, overflow ham yo'q.
       ========================================================= */
    window.addEventListener('load', () => {
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
    });

    /* =========================================================
       NAVBAR ACTIVE — joriy sahifani belgilash
       (index.html, /about, /about.html, "/" — hammasi to'g'ri taniladi.
        Netlify "pretty URLs" da .html yo'qoladi, eski kod shu holatda ishlamasdi.)
       ========================================================= */
    const pageName = (path) => (path.split('/').pop().replace(/\.html$/i, '') || 'index').toLowerCase();
    const currentPage = pageName(window.location.pathname);

    document.querySelectorAll('.nav-links a').forEach((link) => {
        const target = pageName(new URL(link.getAttribute('href'), window.location.href).pathname);
        link.classList.toggle('active', target === currentPage);
    });

    /* =========================================================
       CUSTOM CURSOR — faqat sichqonchali qurilmalarda, rAF bilan
       Eski kod: har mousemove'da left/top (layout) + `scrollY` qo'shardi —
       fixed element uchun bu noto'g'ri (kursor skrollda sichqonchadan uzoqlashardi).
       ========================================================= */
    const cursor = document.querySelector('.custom-cursor');

    if (cursor && finePointer.matches) {
        let cx = -100;
        let cy = -100;
        let cursorRaf = 0;

        const paintCursor = () => {
            cursorRaf = 0;
            cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
        };

        document.addEventListener('mousemove', (e) => {
            cx = e.clientX;
            cy = e.clientY;
            if (!cursorRaf) cursorRaf = requestAnimationFrame(paintCursor);
        }, { passive: true });

        document.addEventListener('mousedown', () => { cursor.style.scale = '0.8'; });
        document.addEventListener('mouseup', () => { cursor.style.scale = '1'; });
    }

    /* =========================================================
       TYPING EFFECT
       ========================================================= */
    const typingText = document.querySelector('.typing-text');
    const texts = ['MERN Stack Developer', 'Full Stack Developer', 'Creative Thinker', 'MEVN Stack Developer'];
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function type() {
        if (!typingText) return;
        const currentText = texts[textIndex];

        if (isDeleting) {
            typingText.textContent = currentText.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typingText.textContent = currentText.substring(0, charIndex + 1);
            charIndex++;
        }

        if (!isDeleting && charIndex === currentText.length) {
            isDeleting = true;
            setTimeout(type, 1500);
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % texts.length;
            setTimeout(type, 500);
        } else {
            setTimeout(type, isDeleting ? 50 : 100);
        }
    }

    if (typingText) type();

    /* =========================================================
       NOTIFICATION SYSTEM
       ========================================================= */
    window.showNotification = function showNotification(message) {
        const notification = $('notification');
        if (!notification) return;
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), 3000);
    };

    /* =========================================================
       SKROLL HOLATI (Back to Top, navbar) — rAF bilan, passive
       ========================================================= */
    const backToTop = $('back-to-top');
    const navbar = document.querySelector('.navbar');
    let scrollRaf = 0;

    function handleScrollState() {
        scrollRaf = 0;
        const scrollY = window.scrollY;
        if (backToTop) backToTop.classList.toggle('visible', scrollY > 300);
        if (navbar) navbar.classList.toggle('scrolled', scrollY > 20);
    }

    window.addEventListener('scroll', () => {
        if (!scrollRaf) scrollRaf = requestAnimationFrame(handleScrollState);
    }, { passive: true });
    handleScrollState();

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        });
    }

    /* Smooth scroll (faqat sahifa ichidagi # havolalar uchun) */
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId.length < 2) return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            }
        });
    });

    /* [data-aos] elementlarni skroll paytida animatsiya bilan ko'rsatish */
    const aosElements = document.querySelectorAll('[data-aos]');
    if (aosElements.length && 'IntersectionObserver' in window) {
        const aosObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('aos-animate');
                    aosObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        aosElements.forEach((el) => aosObserver.observe(el));
    }

    /* =========================================================
       GTA 3D PARALLAX & REAL GUNFIRE
       Home ostida ochiladigan reveal-footer sahnasi.

       Tuzatishlar:
       - Sahna faqat ochila boshlaganda "faol" bo'ladi (.is-active): oldin u
         yashirin va animatsiyalari to'xtatilgan (eski kodda doim ishlab turardi).
       - mousemove'da document.body.offsetHeight o'qilmaydi (layout thrashing yo'q),
         hisob rAF orqali qilinadi.
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

        const curtain = overlay.previousElementSibling; // ustki "parda" (main)
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

        /* --- Sahna ochilganini aniqlash --- */
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

        /* --- 3D parallax (faqat sichqonchali qurilmalarda) --- */
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

        /* --- Sahnani joyida tiklash (reload o'rniga) --- */
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

            // 1. Olov, o'q va miltillash animatsiyasi
            if (barrelGlow) barrelGlow.classList.add('glow-active');
            if (flash) flash.classList.add('shoot-flash-on');
            if (bullet) bullet.classList.add('shoot-bullet-on');

            // 2. Kamera (ekran) titrashi
            overlay.classList.add('screen-shake');

            // 3. O'q yuzga urilganda qonli ekran (Wasted) — 0.25 soniyadan so'ng
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

            // 4. Sahnani qayta tiklash
            later(resetScene, 3500);
        }

        function triggerYes() {
            if (busy) return;
            busy = true;

            hud.innerHTML = "<h1 style='color: #00ff66; font-size: clamp(2rem, 9vw, 5rem); text-align:center; text-shadow: 4px 4px #000; margin:0;'>MISSION PASSED RESPECT+</h1>";
            makeHudBare();

            later(resetScene, 2500);
        }

        // HUD ichidagi tugmalar innerHTML bilan almashtirilgani uchun event delegation
        hud.addEventListener('click', (e) => {
            const btn = e.target.closest('#yes-trigger, #no-trigger');
            if (!btn) return;
            if (btn.id === 'no-trigger') triggerNo();
            else triggerYes();
        });
    })();

    /* =========================================================
       BOSHQA SAHIFALARNI BO'SH VAQTDA OLDINDAN YUKLASH
       (menyuni almashtirganda sahifa darhol ochilishi uchun)
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
