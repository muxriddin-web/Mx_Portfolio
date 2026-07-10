const sendTelegramMessage = require("../utils/telegram");

const sendContact = async (req, res, next) => {

    try {

        const { name, email, message } = req.body;

        await sendTelegramMessage({
            name,
            email,
            message
        });

        return res.status(200).json({
            success: true,
            message: "Message sent successfully."
        });

    } catch (error) {

        next(error);

    }

};

module.exports = {
    sendContact
};