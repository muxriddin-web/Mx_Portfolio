/* ─── CARD STACK STATE ─── */
const skillsStack = document.querySelector(".skills-stack");
const allCards = [...document.querySelectorAll(".skill")];
let activeCards = [...allCards];
let isSwiping = false;
let startX = 0;
let currentX = 0;

function updateCardPositions() {
    activeCards.forEach((card, index) => {
        const fromTop = activeCards.length - 1 - index;
        card.style.zIndex = index;
        card.style.transform = `scale(${1 - fromTop * 0.05}) translateY(${fromTop * 6}px)`;
    });
}

function handleStart(e) {
    if (!activeCards.length) return;
    isSwiping = true;
    startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const topCard = activeCards[activeCards.length - 1];
    topCard.style.transition = "none";
}

function handleMove(e) {
    if (!isSwiping || !activeCards.length) return;
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    currentX = clientX - startX;
    const topCard = activeCards[activeCards.length - 1];
    topCard.style.transform = `translateX(${currentX}px) rotate(${currentX / 15}deg)`;
}

function handleEnd() {
    if (!isSwiping || !activeCards.length) return;
    isSwiping = false;

    const topCard = activeCards[activeCards.length - 1];
    const direction = currentX > 0 ? 1 : -1;

    if (Math.abs(currentX) > 60) {
        if (navigator.vibrate) navigator.vibrate(10);

        topCard.style.transition = "transform 0.4s ease-out";
        topCard.style.transform = `translateX(${direction * 400}px) rotate(${direction * 25}deg) scale(0.8)`;

        setTimeout(() => {
            skillsStack.prepend(topCard);
            activeCards.unshift(activeCards.pop());

            topCard.style.transition = "none";
            topCard.style.transform = `translateX(${direction * 400}px) scale(0.8)`;
            topCard.offsetWidth;

            topCard.style.transition = "transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
            updateCardPositions();

            if (navigator.vibrate) navigator.vibrate(20);
        }, 400);
    } else {
        topCard.style.transition = "transform 0.3s ease";
        topCard.style.transform = "translateX(0) scale(1)";
    }
    currentX = 0;
}

if (skillsStack) {
    skillsStack.addEventListener("mousedown", handleStart);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);

    skillsStack.addEventListener("touchstart", handleStart, { passive: true });
    document.addEventListener("touchmove", handleMove, { passive: true });
    document.addEventListener("touchend", handleEnd);
}

updateCardPositions();

/* ─── SKILL BAR ANIMATION ─── */
const skillLevels = document.querySelectorAll(".skill-level");
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.width = entry.target.dataset.skill + "%";
        }
    });
}, { threshold: 0.3 });
skillLevels.forEach(level => observer.observe(level));

/* ─── NAVBAR ACTIVE ─── */
const currentPage = window.location.pathname.split("/").pop() || "skills.html";
document.querySelectorAll(".nav-links a").forEach(link => {
    if (link.getAttribute("href") === currentPage) {
        link.classList.add("active");
    }
});

/* ─── FILTER BUTTONS ─── */
document.addEventListener("DOMContentLoaded", () => {
    const filterButtons = document.querySelectorAll(".filter-btn");

    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            document.querySelector(".filter-btn.active").classList.remove("active");
            button.classList.add("active");
            const filter = button.dataset.filter;

            allCards.forEach(card => {
                const show = filter === "all" || card.dataset.category === filter;
                card.style.display = show ? "flex" : "none";
            });

            activeCards = allCards.filter(card =>
                filter === "all" || card.dataset.category === filter
            );

            updateCardPositions();
        });
    });
});
