const express = require('express');
const router = express.Router();
const { handleIncomingCallStreaming, handleStreamingConnection, cleanupSession } = require('../utils/chat/streamingHandler');

// Handle incoming calls (streaming approach)
router.post('/incoming', handleIncomingCallStreaming);

// Handle call status updates for cleanup
router.post('/status', (req, res) => {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;
  
  console.log('Call status update:', { callSid, callStatus });
  
  // Clean up streaming session when call ends
  if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer') {
    cleanupSession(callSid);
  }
  
  res.status(200).send('OK');
});

module.exports = router; 