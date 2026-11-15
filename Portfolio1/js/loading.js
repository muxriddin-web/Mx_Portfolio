(() => {
    'use strict';

    /* =========================================================
       SOZLAMALAR
       ========================================================= */
    const VIDEO_SRC = './R loading video.mp4';
    const SHOW_AT = 12;              // video 13-sekundga yetganda: M + yulduz + shisha chiqadi
    const HIDE_AT = 16;              // video 17-sekundga yetganda: yo'qoladi
    const START_TIMEOUT_MS = 20000;  // video shu vaqtda boshlanmasa — saytga o'tish tugmasi chiqadi

    /* =========================================================
       ELEMENTLAR
       ========================================================= */
    const $ = (id) => document.getElementById(id);
    const letter = $('letter');
    const star = $('star');
    const logo = $('logo');
    const glassBg = $('glassBg');
    const video = $('bg-video');
    const audio = $('bg-audio');
    const button1 = $('button1');
    const button2 = $('button2');

    if (!video || !button1) return;

    const setOpacity = (el, value) => { if (el) el.style.opacity = value; };
    const safePlay = (media) => {
        if (!media) return;
        try {
            const p = media.play();
            if (p && p.catch) p.catch(() => {});
        } catch (_) { /* e'tiborsiz */ }
    };

    /* =========================================================
       VIDEO: REAL TELEFON (iOS Safari / Android Chrome) UCHUN SHARTLAR
       - playsinline bo'lmasa iPhone videoni to'liq ekranda ochadi va
         ustidagi M-logo va shisha oyna umuman ko'rinmaydi.
       ========================================================= */
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = false;
    video.removeAttribute('autoplay');
    video.controls = false;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('disablepictureinpicture', '');
    video.preload = 'auto';

    // Boshlang'ich holat (ko'rinmaydi)
    setOpacity(letter, '0');
    setOpacity(star, '0');
    setOpacity(glassBg, '0');

    /* =========================================================
       HOLAT
       ========================================================= */
    let started = false;       // tugma bosildimi
    let playedOnce = false;    // video haqiqatan ijro boshladimi
    let finished = false;      // video tugadimi yoki xatolik bo'ldi
    let phase = 0;             // 0 = logo hali yo'q, 1 = ko'rinib turibdi, 2 = yo'qolgan
    let rafId = 0;
    let watchdogId = 0;
    let srcAssigned = false;

    /* =========================================================
       VIDEONI OLDINDAN YUKLASH
       Sahifa to'liq yuklangach, foydalanuvchi tugmani bosguncha video
       fonda yuklana boshlaydi — shunda bosganda kutish bo'lmaydi.
       (Agar HTML'da allaqachon src berilgan bo'lsa, tegmaymiz.)
       ========================================================= */
    function preloadVideo() {
        if (srcAssigned || started) return;
        const conn = navigator.connection;
        if (conn && conn.saveData) return;
        if (video.getAttribute('src') || video.querySelector('source')) return;
        video.src = VIDEO_SRC;
        srcAssigned = true;
    }

    if (document.readyState === 'complete') {
        preloadVideo();
    } else {
        window.addEventListener('load', preloadVideo, { once: true });
    }

    /* =========================================================
       LOGO: VIDEO HAQIQIY VAQTIGA QARAB (setTimeout EMAS)
       Real telefonda video internet tufayli kechikib boshlanadi.
       Eski kodda setTimeout(13000) bosilgan paytdan sanalgani uchun
       logo videoga nisbatan erta chiqib ketardi.
       ========================================================= */
    function showLogo() {
        if (letter) letter.innerHTML = '<i>M</i>';
        setOpacity(letter, '1');
        setOpacity(star, '1');
        setOpacity(glassBg, '1');
        if (logo) logo.classList.add('blue-bg', 'scale-up');
    }

    function hideLogo() {
        setOpacity(letter, '0');
        setOpacity(star, '0');
        setOpacity(glassBg, '0');
        if (logo) logo.classList.remove('blue-bg');
    }

    function syncTimeline() {
        const t = video.currentTime;
        if (phase < 1 && t >= SHOW_AT && t < HIDE_AT) {
            phase = 1;
            showLogo();
        }
        if (phase < 2 && t >= HIDE_AT) {
            if (phase === 1) hideLogo();
            phase = 2;
        }
    }

    function loop() {
        syncTimeline();
        if (!video.paused && !video.ended) {
            rafId = requestAnimationFrame(loop);
        }
    }

    /* =========================================================
       AUDIO: VIDEO BILAN SINXRON
       ========================================================= */
    // Audio video'dan qisqa (~16s). Tugagan audioda play() chaqirilsa u BOSHIDAN qayta boshlanadi —
    // shuning uchun faqat audio hali tugamagan oraliqdagina davom ettiramiz.
    function audioStillPlayable() {
        if (!audio || audio.ended) return false;
        return !isFinite(audio.duration) || video.currentTime < audio.duration - 0.05;
    }

    function resyncAudio() {
        if (!audioStillPlayable()) return;
        const vt = video.currentTime;
        if (isFinite(audio.duration) && Math.abs(audio.currentTime - vt) > 0.35) {
            try { audio.currentTime = vt; } catch (_) { /* e'tiborsiz */ }
        }
    }

    function resumeAudio() {
        if (audioStillPlayable()) safePlay(audio);
    }

    /* =========================================================
       YAKUN / XATOLIK
       ========================================================= */
    function revealNextButton() {
        button1.style.display = 'none';
        if (button2) button2.style.display = 'block';
    }

    function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(watchdogId);
        cancelAnimationFrame(rafId);
        if (audio) {
            audio.pause();
            try { audio.currentTime = 0; } catch (_) { /* e'tiborsiz */ }
        }
        if (logo) logo.classList.remove('scale-up');
        setOpacity(glassBg, '0');
        setOpacity(letter, '0');
        setOpacity(star, '0');
        revealNextButton();
    }

    function fallback(reason) {
        if (finished) return;
        console.warn('[loading] video ijro bo\'lmadi:', reason);
        try { video.pause(); } catch (_) { /* e'tiborsiz */ }
        finish();
    }

    /* =========================================================
       TUGMA BOSILGANDA
       ========================================================= */
    button1.addEventListener('click', () => {
        if (started) return;
        started = true;

        // Bosilganda darhol fikr-mulohaza — telefonda yuklanish uzoq bo'lishi mumkin
        button1.textContent = 'Loading...';
        button1.style.pointerEvents = 'none';

        if (!srcAssigned) {
            video.src = VIDEO_SRC;
            srcAssigned = true;
        }

        // MUHIM: play() foydalanuvchi bosgan zahoti chaqirilishi shart (iOS talabi).
        // Video yuklanguncha brauzer o'zi kutadi, biz vaqtni video bo'yicha kuzatamiz.
        const p = video.play();
        if (p && p.catch) {
            p.catch((err) => {
                if (err && err.name === 'AbortError') return;
                fallback(err && err.name ? err.name : 'play() rad etildi');
            });
        }

        if (audio) {
            try { audio.currentTime = 0; } catch (_) { /* e'tiborsiz */ }
            safePlay(audio);
        }

        watchdogId = setTimeout(() => {
            if (!playedOnce) fallback('timeout');
        }, START_TIMEOUT_MS);
    });

    /* =========================================================
       VIDEO HODISALARI
       ========================================================= */
    video.addEventListener('playing', () => {
        if (finished) return;
        if (!playedOnce) {
            playedOnce = true;
            clearTimeout(watchdogId);
            button1.style.display = 'none';
        }
        resyncAudio();
        resumeAudio();
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(loop);
    });

    // Video buferlanayotganda audio oldinga ketib qolmasin
    video.addEventListener('waiting', () => { if (audio) audio.pause(); });

    video.addEventListener('pause', () => {
        if (!video.ended && audio) audio.pause();
    });

    // Zaxira: rAF to'xtab qolsa ham timeline yurib turadi
    video.addEventListener('timeupdate', syncTimeline);

    video.addEventListener('ended', finish);
    video.addEventListener('error', () => {
        if (started) fallback('video xatosi');
    });

    // Telefon boshqa ilovaga o'tsa — to'xtatamiz, qaytsa — davom ettiramiz
    document.addEventListener('visibilitychange', () => {
        if (!started || finished) return;
        if (document.hidden) {
            video.pause();
            if (audio) audio.pause();
        } else {
            safePlay(video);
        }
    });
})();
