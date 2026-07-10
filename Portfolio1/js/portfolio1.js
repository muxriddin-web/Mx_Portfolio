// Loading Screen
window.addEventListener('load', () => {
    const loadingScreen = document.querySelector('.loading-screen');
    setTimeout(() => {
        if (loadingScreen) loadingScreen.style.display = 'none';
        document.body.style.overflow = 'visible';
    }, 800);
});

/* ─── NAVBAR ACTIVE — joriy sahifani belgilash ─── */
const currentPage = window.location.pathname.split('/').pop() || 'portfolio1.html';
document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
        link.classList.add('active');
    } else {
        link.classList.remove('active');
    }
});

// Custom Cursor
const cursor = document.querySelector('.custom-cursor');

if (cursor) {
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = (e.clientY + window.scrollY) + 'px';
    });

    document.addEventListener('mousedown', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
    });

    document.addEventListener('mouseup', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
    });
}

// Typing Effect
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

// Notification System
function showNotification(message) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/* ─── SCROLL HOLATIGA BOG'LIQ FUNKSIYALAR (Back to Top, navbar) ─── */
const backToTop = document.getElementById('back-to-top');
const navbar = document.querySelector('.navbar');

function handleScrollState() {
    const scrollY = window.scrollY;

    if (backToTop) {
        if (scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    }

    if (navbar) {
        if (scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
}

window.addEventListener('scroll', handleScrollState);
window.addEventListener('load', handleScrollState);

if (backToTop) {
    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Smooth Scroll (faqat sahifa ichidagi # havolalar uchun)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// [data-aos] elementlarni skroll paytida animatsiya bilan ko'rsatish
const aosElements = document.querySelectorAll('[data-aos]');
if (aosElements.length) {
    const aosObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
            }
        });
    }, { threshold: 0.2 });

    aosElements.forEach(el => aosObserver.observe(el));
}

/* =========================================================
   GTA 3D PARALLAX & REAL GUNFIRE — TO'LIQ SKRIPT
   Home ostida ochiladigan reveal-footer sahnasini boshqaradi.
   ========================================================= */

const overlay = document.getElementById('gta-overlay');
const scene = document.getElementById('scene-container');
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
    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const isMobileLayout = () => window.matchMedia('(max-width: 860px)').matches;

    function handleParallax(pageX, pageY) {
        if (isMobileLayout() || !supportsHover) return;

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

    // 3D Parallax Mousemove (faqat desktop uchun)
    window.addEventListener('mousemove', (e) => {
        handleParallax(e.pageX, e.pageY);
    });

    // Ekran o'lchami o'zgarganda (masalan, telefon burilganda) HUD transformni tozalash
    window.addEventListener('resize', () => {
        if (isMobileLayout()) {
            char.style.transform = '';
            bg.style.transform = '';
        }
    });

    function triggerNo() {
        // 1. Olov, O'q va Miltillash animatsiyasi
        barrelGlow.classList.add('glow-active');
        flash.classList.add('shoot-flash-on');
        bullet.classList.add('shoot-bullet-on');

        // 2. Kamera (ekran) titrashi
        overlay.classList.add('screen-shake');

        // 3. O'q yuzga urilganda Qonli Ekran (Wasted) - 0.25 soniyadan so'ng
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

        // 4. Sahifani qayta tiklash
        setTimeout(() => {
            window.scrollTo(0, 0);
            location.reload();
        }, 3500);
    }

    function triggerYes() {
        hud.innerHTML = "<h1 style='color: #00ff66; font-size: clamp(2rem, 9vw, 5rem); text-align:center; text-shadow: 4px 4px #000; margin:0;'>MISSION PASSED RESPECT+</h1>";
        hud.style.background = "transparent";
        hud.style.border = "none";
        hud.style.boxShadow = "none";

        setTimeout(() => {
            window.scrollTo(0, 0);
            location.reload();
        }, 2500);
    }

    // "YO'Q" TUGMASI BOSILGANDA (OTISH)
    btnNo.addEventListener('click', triggerNo);

    // "HA" TUGMASI BOSILGANDA
    btnYes.addEventListener('click', triggerYes);
}