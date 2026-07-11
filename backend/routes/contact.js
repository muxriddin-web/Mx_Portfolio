const API_URL = "https://mx-portfolio.onrender.com"; // Render'dan olgan silkangiz

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const button = form.querySelector(".glow-button");

    const formData = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        message: document.getElementById("message").value.trim()
    };

    button.disabled = true;
    button.textContent = "Sending...";

    try {
        const response = await fetch(`${API_URL}/api/contact`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Something went wrong.");
        }

        alert("✅ Message sent successfully!");
        form.reset();

    } catch (error) {
        console.error(error);
        alert(error.message);
    } finally {
        button.disabled = false;
        button.textContent = "Send Message";
    }
});