(() => {
    'use strict';

    /* =========================================================
       CARD STACK
       Tuzatilgan xatolar:
       1) Filtrda `display: block` qo'yilardi — bu .skill ning flex-markazlashuvini
          buzardi (filtrdan keyin kartalar "siljib ketardi").
       2) Tez-tez swipe qilinganda setTimeout'lar ustma-ust tushib, `cards` massivi
          va DOM tartibi bir-biriga mos kelmay qolardi — endi isAnimating qulfi bor.
       3) Uchib ketayotgan karta (translateX 300px) sahifani kengaytirib, mobil
          brauzerda butun layout "zoom-out" bo'lib buzilardi — endi uchish masofasi
          ekranga moslangan va .skills-section overflow:hidden.
       4) 16 ta karta bir vaqtda backdrop-filter bilan chizilardi — endi faqat
          tepadagi MAX_VISIBLE tasi ko'rinadi.
       5) touch-action:none butun sahifa skrollini bloklardi — endi pan-y.
       ========================================================= */

    const stack = document.querySelector('.skills-stack');
    if (!stack) return;

    const MAX_VISIBLE = 4;       // bir vaqtda chiziladigan kartalar soni
    const SWIPE_THRESHOLD = 50;  // px

    const allCards = Array.from(stack.querySelectorAll('.skill'));
    let cards = allCards.slice(); // oxirgi element = eng tepadagi karta

    let isAnimating = false;
    let pendingFilter = null;
    let dragging = false;
    let activePointer = null;
    let startX = 0;
    let deltaX = 0;
    let dragRaf = 0;

    const vibrate = (ms) => {
        try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) { /* e'tiborsiz */ }
    };

    /* ─── KARTALARNI JOYLASH ─── */
    function layout() {
        const n = cards.length;
        cards.forEach((card, index) => {
            const depth = n - 1 - index;
            card.style.zIndex = String(index);
            card.style.transform = `scale(${1 - depth * 0.05})`;
            card.style.visibility = depth >= MAX_VISIBLE ? 'hidden' : 'visible';
            card.classList.toggle('is-front', depth === 0);
        });
    }

    /* ─── SWIPE (Pointer Events: sichqoncha + touch + stylus bitta kodda) ─── */
    stack.addEventListener('pointerdown', (e) => {
        if (isAnimating || dragging || !cards.length) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        dragging = true;
        activePointer = e.pointerId;
        startX = e.clientX;
        deltaX = 0;

        cards[cards.length - 1].style.transition = 'none';
        try { stack.setPointerCapture(e.pointerId); } catch (_) { /* e'tiborsiz */ }
    });

    stack.addEventListener('pointermove', (e) => {
        if (!dragging || e.pointerId !== activePointer) return;
        deltaX = e.clientX - startX;
        if (!dragRaf) dragRaf = requestAnimationFrame(paintDrag);
    });

    function paintDrag() {
        dragRaf = 0;
        if (!dragging || !cards.length) return;
        cards[cards.length - 1].style.transform = `translateX(${deltaX}px) rotate(${deltaX / 10}deg)`;
    }

    function endDrag(e) {
        if (!dragging || e.pointerId !== activePointer) return;
        dragging = false;

        cancelAnimationFrame(dragRaf);
        dragRaf = 0;
        try { stack.releasePointerCapture(activePointer); } catch (_) { /* e'tiborsiz */ }
        activePointer = null;

        const card = cards[cards.length - 1];
        const dx = deltaX;
        deltaX = 0;
        if (!card) return;

        const cancelled = e.type === 'pointercancel';
        if (!cancelled && Math.abs(dx) > SWIPE_THRESHOLD && cards.length > 1) {
            flingOut(card, dx > 0 ? 1 : -1);
        } else {
            card.style.transition = 'transform 0.3s ease';
            card.style.transform = 'translateX(0) scale(1)';
        }
    }

    stack.addEventListener('pointerup', endDrag);
    stack.addEventListener('pointercancel', endDrag);

    function flingOut(card, direction) {
        isAnimating = true;
        vibrate(30);

        // Kartani ekrandan tashqariga emas, ekran kengligiga moslab uchiramiz
        const distance = Math.min(300, Math.round(window.innerWidth * 0.8));

        card.style.transition = 'transform 0.4s ease-out';
        card.style.transform = `translateX(${direction * distance}px) scale(0.8)`;

        setTimeout(() => {
            stack.prepend(card);
            cards.unshift(cards.pop());

            card.style.transition = 'none';
            card.style.transform = `translateX(${direction * distance}px) scale(0.8)`;

            void card.offsetWidth; // reflow — keyingi transition to'g'ri boshlanishi uchun

            card.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            layout();
            vibrate(50);

            isAnimating = false;
            if (pendingFilter !== null) {
                const f = pendingFilter;
                pendingFilter = null;
                applyFilter(f);
            }
        }, 400);
    }

    /* ─── SKILL BAR ANIMATION ─── */
    const skillLevels = document.querySelectorAll('.skill-level');
    if ('IntersectionObserver' in window) {
        const barObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.width = entry.target.dataset.skill + '%';
                    barObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        skillLevels.forEach((level) => barObserver.observe(level));
    } else {
        skillLevels.forEach((level) => { level.style.width = level.dataset.skill + '%'; });
    }

    /* ─── NAVBAR ACTIVE ─── */
    const pageName = (path) => (path.split('/').pop().replace(/\.html$/i, '') || 'index').toLowerCase();
    const currentPage = pageName(window.location.pathname);
    document.querySelectorAll('.nav-links a').forEach((link) => {
        const target = pageName(new URL(link.getAttribute('href'), window.location.href).pathname);
        if (target === currentPage) link.classList.add('active');
    });

    /* ─── FILTER BUTTONS ─── */
    function applyFilter(filter) {
        cards = allCards.filter((card) => filter === 'all' || card.dataset.category === filter);

        allCards.forEach((card) => {
            // MUHIM: '' — stylesheet'dagi display:flex qaytadi ('block' qo'yish layoutni buzardi)
            card.style.display = cards.includes(card) ? '' : 'none';
        });

        layout();
    }

    function initFilters() {
        const buttons = document.querySelectorAll('.filter-btn');

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const current = document.querySelector('.filter-btn.active');
                if (current) current.classList.remove('active');
                button.classList.add('active');

                const filter = button.dataset.filter || 'all';

                // Karta uchib ketayotgan paytda holatni buzmaslik uchun navbatga qo'yamiz
                if (isAnimating || dragging) {
                    pendingFilter = filter;
                    return;
                }
                applyFilter(filter);
            });
        });
    }

    layout();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFilters);
    } else {
        initFilters();
    }

    /* ─── BOSHQA SAHIFALARNI BO'SH VAQTDA OLDINDAN YUKLASH ─── */
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
