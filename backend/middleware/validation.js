const validateContact = (req, res, next) => {

    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({
            success: false,
            message: "All fields are required."
        });
    }

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email address."
        });
    }

    if (message.length < 5) {
        return res.status(400).json({
            success: false,
            message: "Message is too short."
        });
    }

    next();

};

module.exports = validateContact;