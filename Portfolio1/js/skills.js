/* ─── CARD STACK (asl namunadagi mantiq bilan bir xil) ─── */
const skillsStack = document.querySelector(".skills-stack");
let allCards = [...document.querySelectorAll(".skill")];
let cards = [...allCards];
let isSwiping = false;
let startX = 0;
let currentX = 0;

function updateCardPositions() {
    cards.forEach((card, index) => {
        card.style.zIndex = index;
        card.style.transform = `scale(${1 - (cards.length - 1 - index) * 0.05})`;
    });
}

function handleStart(e) {
    isSwiping = true;
    startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    cards[cards.length - 1].style.transition = "none";
}

function handleMove(e) {
    if (!isSwiping) return;
    let clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    currentX = clientX - startX;
    cards[cards.length - 1].style.transform = `translateX(${currentX}px) rotate(${currentX / 10}deg)`;
}

function handleEnd() {
    if (!isSwiping) return;
    isSwiping = false;

    let activeCard = cards[cards.length - 1];
    let direction = currentX > 0 ? 1 : -1;

    if (Math.abs(currentX) > 50) {
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }

        activeCard.style.transition = "transform 0.4s ease-out";
        activeCard.style.transform = `translateX(${direction * 300}px) scale(0.8)`;

        setTimeout(() => {
            skillsStack.prepend(activeCard);
            cards.unshift(cards.pop());

            activeCard.style.transition = "none";
            activeCard.style.transform = `translateX(${direction * 300}px) scale(0.8)`;

            activeCard.offsetWidth;

            activeCard.style.transition = "transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
            updateCardPositions();

            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 400);
    } else {
        activeCard.style.transition = "transform 0.3s ease";
        activeCard.style.transform = "translateX(0) scale(1)";
    }
    currentX = 0;
}

// Hodisalarni ulash (asl namunadagi kabi)
skillsStack.addEventListener("mousedown", handleStart);
document.addEventListener("mousemove", handleMove);
document.addEventListener("mouseup", handleEnd);

skillsStack.addEventListener("touchstart", handleStart);
document.addEventListener("touchmove", handleMove);
document.addEventListener("touchend", handleEnd);

updateCardPositions();

/* ─── SKILL BAR ANIMATION ─── */
const skillLevels = document.querySelectorAll(".skill-level");
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.width = entry.target.dataset.skill + "%";
        }
    });
}, {
    threshold: 0.3
});
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
                card.style.display = show ? "block" : "none";
            });

            cards = allCards.filter(card =>
                filter === "all" || card.dataset.category === filter
            );

            updateCardPositions();
        });
    });
});
