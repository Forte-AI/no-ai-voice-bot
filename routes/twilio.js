const express = require('express');
const router = express.Router();
const { handleIncomingCall, handleVoiceResponse, handleRecordingStatus } = require('../utils/chat/twilioHandler');

// Store call sessions (import from twilioHandler)
const { callSessions } = require('../utils/chat/twilioHandler');

// Handle incoming calls (traditional recording approach)
router.post('/incoming', handleIncomingCall);

// Handle voice responses (traditional recording approach)
router.post('/response', handleVoiceResponse);

// Handle recording status callbacks
router.post('/recording-status', handleRecordingStatus);

// Debug endpoint to check session state
router.get('/debug/session/:callSid', (req, res) => {
  const callSid = req.params.callSid;
  const session = callSessions.get(callSid);
  
  if (session) {
    res.json({
      callSid,
      currentQuestionId: session.currentQuestionId,
      storeInfo: session.storeInfo,
      incidentDate: session.incidentDate,
      conversationState: session.conversationState,
      callerInfo: session.callerInfo
    });
  } else {
    res.status(404).json({ error: 'Session not found', callSid });
  }
});

// Debug endpoint to list all active sessions
router.get('/debug/sessions', (req, res) => {
  const sessions = {};
  callSessions.forEach((session, callSid) => {
    sessions[callSid] = {
      currentQuestionId: session.currentQuestionId,
      storeInfo: session.storeInfo,
      incidentDate: session.incidentDate,
      conversationState: session.conversationState,
      callerInfo: session.callerInfo
    };
  });
  
  res.json({
    totalSessions: callSessions.size,
    sessions
  });
});

// Handle call status updates for cleanup
router.post('/status', (req, res) => {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;
  
  console.log('Call status update:', { callSid, callStatus });
  
  // Clean up session when call ends
  if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer') {
    if (callSessions.has(callSid)) {
      callSessions.delete(callSid);
      console.log('Cleaned up session for callSid:', callSid);
    }
  }
  
  res.status(200).send('OK');
});

module.exports = router; 