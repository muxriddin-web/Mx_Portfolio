(() => {
    'use strict';

    function init() {
        const pageName = (path) => (path.split('/').pop().replace(/\.html$/i, '') || 'index').toLowerCase();
        const currentPage = pageName(window.location.pathname);

        /* ─── NAVBAR ACTIVE — joriy sahifani belgilash ─── */
        document.querySelectorAll('.nav-links a.glow-link').forEach((link) => {
            const target = pageName(new URL(link.getAttribute('href'), window.location.href).pathname);
            link.classList.toggle('active', target === currentPage);
        });

        const wrapper = document.getElementById('projectWrapper');
        const swiperEl = document.getElementById('projectSwiper');
        const emptyState = document.getElementById('emptyState');
        if (!wrapper || !swiperEl || typeof Swiper === 'undefined') return;

        // Boshlang'ich holatdagi barcha slaydlarni xotirada saqlab qo'yamiz
        const allSlides = Array.from(wrapper.children);

        /* =========================================================
           VIDEO BOSHQARUVI
           Eski kod: ekranda ko'ringan HAMMA videoni (coverflow'da 3-5 ta) bir vaqtda
           ijro etardi — telefon bir nechta videoni dekod qilolmay qotardi.
           Endi: faqat FAOL slayd ijro etiladi, qo'shnilari birinchi kadr bilan
           to'xtab turadi, qolganlari xotiradan bo'shatiladi.
           ========================================================= */
        const loadVideo = (video) => {
            if (video.dataset.loaded === '1') return;
            video.preload = 'metadata';
            // #t=0.001 — iOS'da ham birinchi kadr ko'rinishi uchun
            video.src = video.dataset.src + '#t=0.001';
            video.dataset.loaded = '1';
        };

        const unloadVideo = (video) => {
            if (video.dataset.loaded !== '1') return;
            video.pause();
            video.removeAttribute('src');
            video.load();
            video.dataset.loaded = '0';
        };

        const playVideo = (video) => {
            video.muted = true;
            const p = video.play();
            if (p && p.catch) p.catch(() => {});
        };

        const slideVideo = (slide) => slide.querySelector('video[data-src]');

        let swiper = null;

        function syncVideos() {
            if (!swiper) return;
            const active = swiper.activeIndex;
            Array.from(swiper.slides).forEach((slide, index) => {
                const video = slideVideo(slide);
                if (!video) return;
                const distance = Math.abs(index - active);

                if (distance === 0) {
                    loadVideo(video);
                    playVideo(video);
                } else if (distance === 1) {
                    loadVideo(video);
                    video.pause();
                } else {
                    unloadVideo(video);
                }
            });
        }

        function pauseAll() {
            allSlides.forEach((slide) => {
                const video = slideVideo(slide);
                if (video) video.pause();
            });
        }

        /* ─── SWIPER CAROUSEL INIT ─── */
        swiper = new Swiper('#projectSwiper', {
            effect: 'coverflow',
            grabCursor: true,
            centeredSlides: true,
            slidesPerView: 'auto',
            spaceBetween: 20,
            coverflowEffect: {
                rotate: 0,
                stretch: 0,
                depth: 220,
                modifier: 1,
                slideShadows: false
            },
            breakpoints: {
                640: { slidesPerView: 1.6, spaceBetween: 32 },
                1024: { slidesPerView: 2.4, spaceBetween: 48 }
            },
            pagination: {
                el: '#projectSwiper .swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '#projectSwiper .swiper-button-next',
                prevEl: '#projectSwiper .swiper-button-prev'
            },
            on: {
                slideChange: function () {
                    try {
                        if ('vibrate' in navigator) navigator.vibrate(30);
                    } catch (_) { /* e'tiborsiz */ }
                    syncVideos();
                }
            }
        });

        syncVideos();

        // Telefon boshqa ilovaga o'tsa yoki tab yopilsa — video to'xtaydi
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) pauseAll();
            else syncVideos();
        });

        /* ─── PROJECT FILTERING (Swiper bilan) ─── */
        const filterButtons = document.querySelectorAll('.filter-btn');

        filterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                filterButtons.forEach((btn) => btn.classList.remove('active'));
                button.classList.add('active');

                const filter = button.getAttribute('data-filter');

                const matched = allSlides.filter((slide) => {
                    const card = slide.querySelector('.project-card');
                    return filter === 'all' || card.getAttribute('data-category') === filter;
                });

                // Eski slaydlardagi videolarni xotiradan bo'shatamiz
                allSlides.forEach((slide) => {
                    const video = slideVideo(slide);
                    if (video) unloadVideo(video);
                });

                swiper.removeAllSlides();

                if (matched.length) {
                    swiperEl.style.display = '';
                    if (emptyState) emptyState.style.display = 'none';
                    swiper.appendSlide(matched);
                    swiper.update();
                    swiper.slideTo(0, 0);
                    syncVideos();
                } else {
                    swiperEl.style.display = 'none';
                    if (emptyState) emptyState.style.display = 'block';
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
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
