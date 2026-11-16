(() => {
    'use strict';

    /* =========================================================
       SOZLAMALAR
       ========================================================= */
    const VIDEO_SRC = './R loading video.mp4';
    const SHOW_AT = 14;              // video 13-sekundga yetganda: M + yulduz + shisha chiqadi
    const HIDE_AT = 16;              // video 17-sekundga yetganda: yo'qoladi
    const START_TIMEOUT_MS = 20000;  // video shu vaqtda boshlanmasa — saytga o'tish tugmasi chiqadi

    /* ---- M-logo geometriyasi (videodagi R logoni yopish uchun) ----
       M-logo va uning orqasidagi qoplama ekran kengligiga EMAS, videoning o'ziga bog'langan:
       video `object-fit: cover` bilan ekranga qanday sig'sa, M ham xuddi shunday masshtablanadi.
       Shunda telefon, DevTools va kompyuterda M har doim R ning aynan ustiga tushadi. */
    const SCALE_UP = 1.45;          // CSS'dagi .logo.scale-up bilan bir xil bo'lishi shart
    const SAMPLE_FROM = 10.5;       // shu videodan boshlab kadrlarda R logo qidiriladi
    const SAMPLE_WIDTH = 128;       // tahlil uchun kichraytirilgan kadr kengligi (px)
    const COVER_MARGIN = 1.04;      // M R dan shuncha marta kattaroq (chekkalari ko'rinib qolmasligi uchun)
    const BORDER_PAD = 0.05;        // R ning qora chegarasi uchun aniqlangan ko'k maydondan qo'shimcha
    // R logo ko'k rangi (RGB) va ruxsat etilgan og'ish — videodan o'lchangan: (0, 29, ~165)
    const LOGO_RGB = [0, 29, 165];
    const LOGO_TOL = [10, 14, 16];
    // Avtomatik aniqlab bo'lmasa zaxira (R ning o'lchami/o'rni — video balandligi/kengligiga nisbatan)
    const FALLBACK = { widthOfHeight: 0.473, widthOfWidth: 0.718, centerY: 0.47, margin: 1.08 };
    // M ning ekran kengligiga nisbatan eng katta o'lchami. null = cheklovsiz (R har doim to'liq yopiladi).
    // Baland telefonda video R ning o'zi ekrandan katta chiqsa, M ham shunga mos kattalashadi;
    // cheklasangiz (masalan 0.95) M ekranga sig'adi, lekin R ning chekkalari ko'rinib qolishi mumkin.
    const MAX_LOGO_WIDTH_RATIO = null;
    const DEBUG = /[?&]debug\b/.test(window.location.search);

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

    /* =========================================================
       R LOGONI AVTOMATIK TOPISH
       Kadrdagi R logoning tekis ko'k rangi bo'yicha qidiriladi, so'ng ustun/satr
       zichligidan chegaralari topiladi (fon gradienti va shovqin e'tiborga olinmaydi).
       pixels — RGBA massivi. Natija: kadr kengligi/balandligiga nisbatan kasrlar yoki null.
       ========================================================= */
    function detectLogoBox(pixels, w, h) {
        const cols = new Uint16Array(w);
        const rows = new Uint16Array(h);
        let total = 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                if (Math.abs(pixels[i] - LOGO_RGB[0]) <= LOGO_TOL[0] &&
                    Math.abs(pixels[i + 1] - LOGO_RGB[1]) <= LOGO_TOL[1] &&
                    Math.abs(pixels[i + 2] - LOGO_RGB[2]) <= LOGO_TOL[2]) {
                    cols[x]++;
                    rows[y]++;
                    total++;
                }
            }
        }
        if (total < w * h * 0.004) return null;

        const span = (arr) => {
            let max = 0;
            for (let i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
            const t = max * 0.25;
            let a = -1;
            let b = -1;
            for (let i = 0; i < arr.length; i++) {
                if (arr[i] >= t) { if (a < 0) a = i; b = i; }
            }
            return [a, b];
        };

        const [x0, x1] = span(cols);
        const [y0, y1] = span(rows);
        if (x0 < 0 || y0 < 0) return null;

        const bw = x1 - x0 + 1;
        const bh = y1 - y0 + 1;
        const ratio = bw / bh;
        if (bw / w < 0.06 || bw / w > 0.97 || bh / h < 0.06 || bh / h > 0.97) return null;
        if (ratio < 0.6 || ratio > 1.8) return null;

        const ex = bw * BORDER_PAD;
        const ey = bh * BORDER_PAD;
        const fx0 = (x0 - ex) / w;
        const fx1 = (x1 + 1 + ex) / w;
        const fy0 = (y0 - ey) / h;
        const fy1 = (y1 + 1 + ey) / h;
        return { fx0, fx1, fy0, fy1, area: (fx1 - fx0) * (fy1 - fy0) };
    }
    window.__detectLogoBox = detectLogoBox; // sinov uchun

    let sampleCanvas = null;
    let sampleCtx = null;
    let lastSampleT = -1;
    let bestBox = null;          // eng yaxshi aniqlangan R (kadr kasrlarida)
    let geometrySource = 'fallback';

    function sampleFrame() {
        const cw = video.videoWidth;
        const ch = video.videoHeight;
        if (!cw || !ch) return;
        const t = video.currentTime;
        if (t < SAMPLE_FROM || t > SHOW_AT + 0.05 || Math.abs(t - lastSampleT) < 0.2) return;
        lastSampleT = t;

        try {
            const w = SAMPLE_WIDTH;
            const h = Math.max(1, Math.round(w * ch / cw));
            if (!sampleCanvas) {
                sampleCanvas = document.createElement('canvas');
                sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
            }
            sampleCanvas.width = w;
            sampleCanvas.height = h;
            sampleCtx.drawImage(video, 0, 0, w, h);
            const box = detectLogoBox(sampleCtx.getImageData(0, 0, w, h).data, w, h);
            if (box && (!bestBox || box.area > bestBox.area)) bestBox = box;
        } catch (_) {
            /* canvas o'qib bo'lmadi — zaxira geometriya ishlatiladi */
        }
    }

    // R ning joyi va o'lchami VIDEO pikselida: { side, cx, cy }
    function logoGeometryInVideoPixels() {
        const cw = video.videoWidth;
        const ch = video.videoHeight;
        if (!cw || !ch) return null;

        if (bestBox) {
            geometrySource = 'detected';
            const wPx = (bestBox.fx1 - bestBox.fx0) * cw;
            const hPx = (bestBox.fy1 - bestBox.fy0) * ch;
            return {
                side: Math.max(wPx, hPx) * COVER_MARGIN,
                cx: ((bestBox.fx0 + bestBox.fx1) / 2) * cw,
                cy: ((bestBox.fy0 + bestBox.fy1) / 2) * ch
            };
        }

        geometrySource = 'fallback';
        const r = Math.min(FALLBACK.widthOfHeight * ch, FALLBACK.widthOfWidth * cw);
        return { side: r * FALLBACK.margin, cx: cw / 2, cy: FALLBACK.centerY * ch };
    }

    // Video pikselini ekran pikseliga o'tkazib, CSS o'zgaruvchilariga yozadi
    function applyGeometry() {
        const g = logoGeometryInVideoPixels();
        if (!g) return;

        const cw = video.videoWidth;
        const ch = video.videoHeight;
        const rect = video.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const scale = Math.max(rect.width / cw, rect.height / ch);        // object-fit: cover
        const offX = (rect.width - cw * scale) / 2;                       // object-position: center
        const offY = (rect.height - ch * scale) / 2;

        let side = g.side * scale;
        if (MAX_LOGO_WIDTH_RATIO) side = Math.min(side, rect.width * MAX_LOGO_WIDTH_RATIO);
        const cx = rect.left + offX + g.cx * scale;
        const cy = rect.top + offY + g.cy * scale;

        const root = document.documentElement.style;
        root.setProperty('--logo-size', (side / SCALE_UP).toFixed(2) + 'px');
        root.setProperty('--glass-size', side.toFixed(2) + 'px');
        root.setProperty('--logo-dx', (cx - (rect.left + rect.width / 2)).toFixed(2) + 'px');
        root.setProperty('--logo-dy', (cy - (rect.top + rect.height / 2)).toFixed(2) + 'px');

        updateDebug(side, cx, cy);
    }

    let resizeRaf = 0;
    const scheduleGeometry = () => {
        if (resizeRaf) return;
        resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; applyGeometry(); });
    };
    window.addEventListener('resize', scheduleGeometry, { passive: true });
    window.addEventListener('orientationchange', scheduleGeometry, { passive: true });
    video.addEventListener('loadedmetadata', () => {
        applyGeometry();
        if (DEBUG && started) {
            try { video.currentTime = Math.max(0, SAMPLE_FROM - 1); } catch (_) { /* e'tiborsiz */ }
        }
    });

    /* ---- ?debug rejimi: loading.html?debug — START bosilganda video 9.5s ga sakraydi,
       ekranda aniqlash natijasi chiqadi (telefonda sinash uchun) ---- */
    let debugEl = null;
    function updateDebug(side, cx, cy) {
        if (!DEBUG) return;
        if (!debugEl) {
            debugEl = document.createElement('pre');
            debugEl.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99;margin:0;padding:6px 8px;' +
                'font:11px/1.4 monospace;color:#0f0;background:rgba(0,0,0,.7);border-radius:6px;pointer-events:none';
            document.body.appendChild(debugEl);
        }
        debugEl.textContent =
            `video ${video.videoWidth}x${video.videoHeight}  ekran ${innerWidth}x${innerHeight}\n` +
            `manba: ${geometrySource}\nM tomoni: ${side.toFixed(0)}px  markaz: ${cx.toFixed(0)},${cy.toFixed(0)}\n` +
            `t=${video.currentTime.toFixed(2)}s`;
    }
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
        // Ko'rsatishdan oldin R ni oxirgi marta qidiramiz va M ni aynan uning ustiga qo'yamiz
        lastSampleT = -1;
        sampleFrame();
        applyGeometry();

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
        sampleFrame();
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
