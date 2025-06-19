const express = require('express');
const router = express.Router();
const { handleIncomingCall, handleVoiceResponse, handleRecordingStatus } = require('../utils/chat/twilioHandler');

// Handle incoming calls (traditional recording approach)
router.post('/incoming', handleIncomingCall);

// Handle voice responses (traditional recording approach)
router.post('/response', handleVoiceResponse);

// Handle recording status callbacks
router.post('/recording-status', handleRecordingStatus);

// Handle call status updates for cleanup
router.post('/status', (req, res) => {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;
  
  console.log('Call status update:', { callSid, callStatus });
  
  res.status(200).send('OK');
});

module.exports = router; 