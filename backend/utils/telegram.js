const axios = require("axios");

const sendTelegramMessage = async ({ name, email, message }) => {

    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
        throw new Error("BOT_TOKEN or CHAT_ID is missing in .env");
    }

    const text = `
📩 <b>New Portfolio Message</b>

👤 <b>Name:</b> ${name}

📧 <b>Email:</b> ${email}

💬 <b>Message:</b>

${message}
`;

    await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
            chat_id: CHAT_ID,
            text,
            parse_mode: "HTML"
        },
        {
            timeout: 10000
        }
    );

};

module.exports = sendTelegramMessage;