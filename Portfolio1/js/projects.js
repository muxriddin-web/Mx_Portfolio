document.addEventListener('DOMContentLoaded', () => {

    /* ─── NAVBAR ACTIVE — joriy sahifani belgilash ─── */
    const currentPage = window.location.pathname.split('/').pop() || 'portfolio1.html';
    document.querySelectorAll('.nav-links a.glow-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === currentPage);
    });

    /* ─── SWIPER CAROUSEL INIT ─── */
    const wrapper = document.getElementById('projectWrapper');
    const swiperEl = document.getElementById('projectSwiper');
    const emptyState = document.getElementById('emptyState');

    // Boshlang'ich holatdagi barcha slaydlarni xotirada saqlab qo'yamiz
    const allSlides = Array.from(wrapper.children);
    
    const swiper = new Swiper('#projectSwiper', {
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
        
        // Vibratsiya qo'shish uchun on hodisasi
        on: {
            slideChange: function () {
                if ("vibrate" in navigator) {
                    navigator.vibrate(30); 
                }
            },
        },
    });

    /* ─── VIDEO LAZY LOAD — faqat ekranga ko'ringan video yuklanadi va ijro etiladi ─── */
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const video = entry.target;
            if (entry.isIntersecting) {
                if (!video.src) {
                    video.src = video.dataset.src;
                }
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.25 });

    function observeVideos() {
        wrapper.querySelectorAll('video[data-src]').forEach((video) => observer.observe(video));
    }

    observeVideos();

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

            // slaydlar
            swiper.removeAllSlides();

            if (matched.length) {
                swiperEl.style.display = '';
                emptyState.style.display = 'none';
                swiper.appendSlide(matched);
                swiper.update();
                swiper.slideTo(0);
                observeVideos();
            } else {
                swiperEl.style.display = 'none';
                emptyState.style.display = 'block';
            }
        });
    });

});
