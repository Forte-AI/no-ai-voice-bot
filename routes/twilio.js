const express = require('express');
const router = express.Router();
const { handleIncomingCall, handleVoiceResponse, handleRecordingStatus } = require('../utils/chat/twilioHandler');

// Handle incoming calls
router.post('/incoming', handleIncomingCall);

// Handle voice responses (fallback)
router.post('/response', handleVoiceResponse);

// Handle recording status callbacks
router.post('/recording-status', handleRecordingStatus);

module.exports = router; 