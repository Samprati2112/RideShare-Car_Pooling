const express = require('express');
const router = express.Router();
const { sendMessage, getMessagesByBooking } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { validate, sendMessageValidation } = require('../middleware/validator');

/**
 * Message Routes (All Protected)
 */
router.use(protect);

router.post('/', validate(sendMessageValidation), sendMessage);
router.get('/:bookingId', getMessagesByBooking);

module.exports = router;
