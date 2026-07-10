/* ─── NAVBAR ACTIVE LINK — joriy sahifaga qarab avtomatik belgilash ─── */
const navLinks = document.querySelectorAll('.nav-links a.glow-link');
const currentPage = window.location.pathname.split('/').pop() || 'about.html';

navLinks.forEach(link => {
    const href = link.getAttribute('href').split('/').pop();
    if (href === currentPage) {
        link.classList.add('active');
    } else {
        link.classList.remove('active');
    }
});

// Boshqa sahifaga o'tishdan oldin ham darhol vizual feedback berish uchun
navLinks.forEach(link => {
    link.addEventListener('click', function () {
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
    });
});

/* ─── COUNTER ANIMATION ─── */
function animateCounters() {
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'), 10) || 0;
        const duration = 1500;
        const step = target / (duration / 16);
        let current = 0;
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                counter.textContent = target;
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current);
            }
        }, 16);
    });
}

/* ─── INTERSECTION OBSERVER (counter faqat ko'ringanda) ─── */
const statsSection = document.querySelector('.stats');
if (statsSection) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                observer.disconnect();
            }
        });
    }, { threshold: 0.3 });
    observer.observe(statsSection);
}

/* ─── PROFILE CARD 3D PARALLAX (faqat sichqoncha mavjud qurilmalarda) ─── */
const profileCard = document.querySelector('.profile-card');
const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (profileCard && supportsHover) {
    profileCard.addEventListener('mouseenter', () => {
        profileCard.addEventListener('mousemove', parallaxEffect);
    });
    profileCard.addEventListener('mouseleave', () => {
        profileCard.removeEventListener('mousemove', parallaxEffect);
        profileCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });

    function parallaxEffect(e) {
        const rect = profileCard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = (y - rect.height / 2) / 10;
        const rotateY = (rect.width / 2 - x) / 10;
        profileCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }
}

/* =========================================================
   GTA 3D PARALLAX & REAL GUNFIRE — TO'LIQ SKRIPT
   About ostida ochiladigan reveal-footer sahnasini boshqaradi.
   ========================================================= */

const overlay = document.getElementById('gta-overlay');
const btnYes = document.getElementById('yes-trigger');
const btnNo = document.getElementById('no-trigger');
const flash = document.getElementById('flash-effect');
const bullet = document.getElementById('bullet-effect');
const barrelGlow = document.getElementById('barrel-glow');
const hud = document.getElementById('p-hud');
const bg = document.getElementById('p-bg');
const char = document.getElementById('p-char');

if (overlay && btnYes && btnNo) {

    // Faqat sichqoncha (hover) mavjud qurilmalarda 3D parallax ishlaydi
    const gtaSupportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const isMobileLayout = () => window.matchMedia('(max-width: 860px)').matches;

    function handleGtaParallax(pageX, pageY) {
        if (isMobileLayout() || !gtaSupportsHover) return;

        const currentScroll = window.innerHeight + window.scrollY;
        const totalHeight = document.body.offsetHeight;

        // Reveal-footer to'liq ochilmagan bo'lsa parallax ishlamaydi
        if (currentScroll < totalHeight - 10) return;

        const x = (window.innerWidth / 2 - pageX) / 35;
        const y = (window.innerHeight / 2 - pageY) / 35;

        bg.style.transform = `translateX(${x * 0.5}px) translateY(${y * 0.5}px)`;
        char.style.transform = `rotateY(${15 - x}deg) rotateX(${y}deg)`;
        // HUD paneli endi qimirlamaydi — HA/YO'Q tugmalari doim bir joyda,
        // to'liq bosiladigan holatda turishi uchun dinamik burilish olib tashlandi.
    }

    window.addEventListener('mousemove', (e) => {
        handleGtaParallax(e.pageX, e.pageY);
    });

    window.addEventListener('resize', () => {
        if (isMobileLayout()) {
            char.style.transform = '';
            bg.style.transform = '';
        }
    });

    function triggerNo() {
        barrelGlow.classList.add('glow-active');
        flash.classList.add('shoot-flash-on');
        bullet.classList.add('shoot-bullet-on');

        overlay.classList.add('screen-shake');

        setTimeout(() => {
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
            hud.style.background = "transparent";
            hud.style.border = "none";
            hud.style.boxShadow = "none";
        }, 250);

        setTimeout(() => {
            window.scrollTo(0, 0);
            location.reload();
        }, 3500);
    }

    function triggerYes() {
        hud.innerHTML = "<h1 style='color: #00ff66; font-size: clamp(2rem, 9vw, 5rem); text-align:center; text-shadow: 4px 4px #000; margin:0;'>RESPECT +</h1>";
        hud.style.background = "transparent";
        hud.style.border = "none";
        hud.style.boxShadow = "none";

        setTimeout(() => {
            window.scrollTo(0, 0);
            location.reload();
        }, 2500);
    }

    btnNo.addEventListener('click', triggerNo);
    btnYes.addEventListener('click', triggerYes);
}