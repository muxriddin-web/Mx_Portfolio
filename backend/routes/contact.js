const express = require("express");

const router = express.Router();

const validateContact = require("../middleware/validation");

const {
    sendContact
} = require("../controllers/contactController");

router.post(
    "/",
    validateContact,
    sendContact
);

module.exports = router;
