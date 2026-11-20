(() => {
    'use strict';

    /* =========================================================
       SOZLAMALAR
       ========================================================= */
    // M logo endi videoning O'ZIGA joylangan (R o'rniga), shuning uchun sahifada
    // alohida logo/shisha qatlami kerak emas — hamma qurilmada bir xil ko'rinadi.
    // Ikki xil video: telefon (vertikal 720x1280) va kompyuter/gorizontal ekran (1920x1080).
    const VIDEO_SRC_MOBILE = './R-loading-M.mp4';
    const VIDEO_SRC_DESKTOP = './R-loading-M-desktop.mp4';
    const pickVideoSrc = () => (window.innerWidth > window.innerHeight ? VIDEO_SRC_DESKTOP : VIDEO_SRC_MOBILE);
    const START_TIMEOUT_MS = 20000;   // video shu vaqtda boshlanmasa — NEXT tugmasi chiqadi

    /* =========================================================
       ELEMENTLAR
       ========================================================= */
    const video = document.getElementById('bg-video');
    const audio = document.getElementById('bg-audio');
    const button1 = document.getElementById('button1');
    const button2 = document.getElementById('button2');

    if (!video || !button1) return;

    const safePlay = (media) => {
        if (!media) return;
        try {
            const p = media.play();
            if (p && p.catch) p.catch(() => {});
        } catch (_) { /* e'tiborsiz */ }
    };

    /* =========================================================
       VIDEO: real telefon (iOS Safari / Android Chrome) uchun shartlar
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

    let started = false;
    let playedOnce = false;
    let finished = false;
    let watchdogId = 0;
    let srcAssigned = false;
    let assignedSrc = '';

    /* =========================================================
       VIDEONI OLDINDAN YUKLASH
       Sahifa yuklangach video fonda yuklana boshlaydi — START bosilganda kutish bo'lmaydi.
       ========================================================= */
    function preloadVideo() {
        if (srcAssigned || started) return;
        const conn = navigator.connection;
        if (conn && conn.saveData) return;
        if (video.getAttribute('src') || video.querySelector('source')) return;
        assignedSrc = pickVideoSrc();
        video.src = assignedSrc;
        srcAssigned = true;
    }

    if (document.readyState === 'complete') preloadVideo();
    else window.addEventListener('load', preloadVideo, { once: true });

    /* =========================================================
       AUDIO: video bilan sinxron
       Audio fayl video'dan uzunroq bo'lishi mumkin; tugagan audioda play() chaqirilsa
       u boshidan qayta boshlanadi — shuning uchun faqat tugamagan oraliqda davom ettiramiz.
       ========================================================= */
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
    function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(watchdogId);
        if (audio) {
            audio.pause();
            try { audio.currentTime = 0; } catch (_) { /* e'tiborsiz */ }
        }
        button1.style.display = 'none';
        if (button2) button2.style.display = 'block';
    }

    function fallback(reason) {
        if (finished) return;
        console.warn('[loading] video ijro bo\'lmadi:', reason);
        try { video.pause(); } catch (_) { /* e'tiborsiz */ }
        finish();
    }

    /* =========================================================
       START TUGMASI
       ========================================================= */
    button1.addEventListener('click', () => {
        if (started) return;
        started = true;

        // Telefonda yuklanish uzoq bo'lishi mumkin — darhol fikr-mulohaza
        button1.textContent = 'Loading...';
        button1.style.pointerEvents = 'none';

        // Ekran yo'nalishi oldindan yuklashdan keyin o'zgargan bo'lsa (masalan telefon burilsa) — to'g'risini tanlaymiz
        const wanted = pickVideoSrc();
        if (!srcAssigned || wanted !== assignedSrc) {
            assignedSrc = wanted;
            video.src = wanted;
            srcAssigned = true;
        }

        // MUHIM: play() foydalanuvchi bosgan zahoti chaqirilishi shart (iOS talabi).
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
    });

    // Video buferlanayotganda audio oldinga ketib qolmasin
    video.addEventListener('waiting', () => { if (audio) audio.pause(); });

    video.addEventListener('pause', () => {
        if (!video.ended && audio) audio.pause();
    });

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
