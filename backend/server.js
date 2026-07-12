require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const path = require("path");

const limiter = require("./middleware/limiter");
const contactRoutes = require("./routes/contact");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// ===========================
// SECURITY
// ===========================
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://cdnjs.cloudflare.com"
                ],
                imgSrc: [
                    "'self'",
                    "data:"
                ],
                fontSrc: [
                    "'self'",
                    "https://cdnjs.cloudflare.com"
                ],
                connectSrc: ["'self'"]
            }
        }
    })
);

// ===========================
// COMPRESS RESPONSE
// ===========================
app.use(compression());

// ===========================
// LOGGER
// ===========================
app.use(morgan("dev"));

// ===========================
// CORS
// ===========================
app.use(cors({
  origin: [
    'http://localhost:5000',
    'https://mfs-portfoliouz.netlify.app'
  ],
  credentials: true
}));

// ===========================
// BODY PARSER (bu ENDI API route'lardan OLDIN bo'lishi shart)
// ===========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===========================
// STATIC FILES
// ===========================
// app.use(express.static(path.join(__dirname, "../")));
app.use(express.static(path.join(__dirname, "../"), {
    maxAge: '7d' // 7 kun keshlash
}));
// ===========================
// HOME
// ===========================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../index.html"));
});

// ===========================
// PORTFOLIO
// ===========================
app.get("/portfolio", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../Portfolio1/index.html")
    );
});

// ===========================
// API (bitta marta, limiter bilan)
// ===========================
app.use("/api/contact", limiter, contactRoutes);

// Ping uchun marshrut
app.get("/ping", (req, res) => {
    res.status(200).send("I am awake!");
});

// ===========================
// 404
// ===========================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found."
    });
});

// ===========================
// GLOBAL ERROR HANDLER
// ===========================
app.use(errorHandler);

// ===========================
// SERVER
// ===========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("================================");
    console.log(`🚀 Server running`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log("================================");
});


// git add .
// git commit -m "resolve merge conflict in contact.js router"
// git push origin main
