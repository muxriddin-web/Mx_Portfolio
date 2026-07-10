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
const currentPage = window.location.pathname.split("/").pop() || "portfolio1.html";

document.querySelectorAll(".nav-links a").forEach(link => {
    if (link.getAttribute("href") === currentPage) {
        link.classList.add("active");
    }
});

/* ─── FILTER BUTTON ANIMATION ─── */
document.addEventListener("DOMContentLoaded", () => {

    const filterButtons = document.querySelectorAll(".filter-btn");
    const skillCards = document.querySelectorAll(".skill");

    filterButtons.forEach(button=>{

    button.addEventListener("click",()=>{

        document.querySelector(".filter-btn.active").classList.remove("active");
        button.classList.add("active");

        const filter=button.dataset.filter;

        skillCards.forEach(card=>{

            const show =
                filter==="all" ||
                card.dataset.category===filter;

            if(show){

                card.style.display="block";

                requestAnimationFrame(()=>{
                    card.classList.remove("hide");
                });

            }else{

                card.classList.add("hide");

                setTimeout(()=>{
                    card.style.display="none";
                },450);

            }

        });

    });

});

});