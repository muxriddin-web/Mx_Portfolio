const letter = document.getElementById("letter");
const star = document.getElementById("star");
const logo = document.getElementById("logo");

const video = document.getElementById("bg-video");
const audio = document.getElementById("bg-audio");
const button1 = document.getElementById("button1");
const button2 = document.getElementById("button2");

video.muted = true;

// M + yulduz boshlang'ich holati
letter.style.opacity = "0";
star.style.opacity = "0";

// Button1 bosilganda
button1.addEventListener("click", () => {
    video.src = "./R loading video.mp4";
    video.play();
    audio.currentTime = 0;
    audio.play();

    button1.style.display = "none";

    // Animatsiya (12-15s)
    setTimeout(() => {
        letter.innerHTML = "<i>M</i>";
        letter.style.opacity = "1";
        star.style.opacity = "1";
        
        // CSS orqali fon va razmerni kattalashtirish
        logo.classList.add("blue-bg", "scale-up");
    }, 12000);

    // Animatsiyani to'xtatish
    setTimeout(() => {
        letter.style.opacity = "0";
        star.style.opacity = "0";
        logo.classList.remove("blue-bg");
    }, 15000);
});

// Video tugaganda
video.addEventListener("ended", () => {
    audio.pause();
    audio.currentTime = 0;
    button2.style.display = "block"; 
    logo.classList.remove("scale-up");
});