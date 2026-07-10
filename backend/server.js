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
// app.use(helmet());
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
    'http://localhost:5000', // local test uchun
    'https://mfs-portfoliouz.netlify.app' // Netlify silkasi
  ],
  credentials: true
}));

// ===========================
// RATE LIMIT
// ===========================
app.use(limiter);

// ===========================
// BODY PARSER
// ===========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===========================
// STATIC FILES
// ===========================
app.use(express.static(path.join(__dirname, "../")));

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
        path.join(__dirname, "../Portfolio1/portfolio1.html")
    );
});

// ===========================
// API
// ===========================
app.use("/api/contact", contactRoutes);

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