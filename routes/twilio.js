const express = require('express');
const router = express.Router();
const { handleIncomingCall, handleVoiceResponse } = require('../utils/chat/twilioHandler');

// Handle incoming calls
router.post('/incoming', handleIncomingCall);

// Handle voice responses
router.post('/response', handleVoiceResponse);

module.exports = router; 