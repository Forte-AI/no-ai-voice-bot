const twilio = require('twilio');
const { getFirstQuestion, validateResponse } = require('./questions');
const { transcribeAudio } = require('./transcribe');
const SIPConfig = require('../sipConfig');

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

// Initialize SIP configuration
const sipConfig = new SIPConfig();

// Optional phone number (for backward compatibility)
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Store call sessions
const callSessions = new Map();

// Initialize a new call session
const initializeCallSession = (callSid) => {
  const firstQuestion = getFirstQuestion();
  callSessions.set(callSid, {
    currentQuestionId: firstQuestion.id,
    storeInfo: null,
    incidentDate: null,
    incidentDescription: null,
    ambulanceCalled: null,
    personName: null,
    personPhone: null,
    personAddress: null,
    contactName: null,
    contactPhone: null,
    callerInfo: null // Will be populated with SIP URI and caller details
  });
  return firstQuestion;
};

// Handle incoming call
const handleIncomingCall = async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const callSid = req.body.CallSid;
  
  // Capture SIP URI and caller information
  const from = req.body.From; // Caller's phone number or SIP URI
  const to = req.body.To; // Called number (your Twilio number)
  const caller = req.body.Caller; // Alternative caller field
  const called = req.body.Called; // Alternative called field
  
  console.log('Incoming call details:', {
    callSid,
    from,
    to,
    caller,
    called,
    callType: from && from.toLowerCase().startsWith('sip:') ? 'SIP' : 'Phone Number',
    sipConfig: sipConfig.getTwilioConfig(),
    twilioPhoneNumber: twilioPhoneNumber || 'Not configured'
  });
  
  // Initialize call session with caller information
  const firstQuestion = initializeCallSession(callSid);
  
  // Store caller information in session
  const session = callSessions.get(callSid);
  if (session) {
    session.callerInfo = {
      from,
      to,
      caller,
      called,
      isSipCall: from && from.toLowerCase().startsWith('sip:'),
      sipConfig: sipConfig.getTwilioConfig()
    };
  }
  
  // Start with the first question
  twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, firstQuestion.text);
  
  // Record user's response
  twiml.record({
    action: `/twilio/response?callSid=${callSid}`,
    maxLength: 30,
    playBeep: false,
    trim: 'trim-silence'
  });
  
  res.type('text/xml');
  res.send(twiml.toString());
};

// Handle user's voice response
const handleVoiceResponse = async (req, res) => {
  const callSid = req.body.CallSid;
  const recordingSid = req.body.RecordingSid;
  const twiml = new twilio.twiml.VoiceResponse();
  
  console.log('Handling voice response:', {
    callSid,
    recordingSid,
    body: req.body
  });
  
  try {
    // Get the recording and transcribe it
    console.log('Fetching recording from Twilio...');
    const recording = await twilioClient.recordings(recordingSid).fetch();
    console.log('Recording details:', {
      sid: recording.sid,
      duration: recording.duration,
      channels: recording.channels,
      status: recording.status
    });
    
    const mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`;
    console.log('Media URL:', mediaUrl);
    
    console.log('Starting transcription...');
    const transcription = await transcribeAudio(mediaUrl);
    console.log('Transcription result:', transcription);
    
    if (!transcription || transcription.trim() === '') {
      console.log('Empty transcription received, asking user to repeat');
      twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "I didn't catch that. Could you please repeat your answer?");
      twiml.record({
        action: `/twilio/response?callSid=${callSid}`,
        maxLength: 30,
        playBeep: false,
        trim: 'trim-silence'
      });
      res.type('text/xml');
      res.send(twiml.toString());
      return;
    }
    
    // Get current session
    const session = callSessions.get(callSid);
    if (!session) {
      console.log('No session found for callSid:', callSid);
      twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "I'm sorry, there was an error with your call. Please try again later.");
      res.type('text/xml');
      res.send(twiml.toString());
      return;
    }
    
    console.log('Validating response for question ID:', session.currentQuestionId);
    console.log('Session state before validation:', {
      currentQuestionId: session.currentQuestionId,
      storeInfo: session.storeInfo,
      incidentDate: session.incidentDate
    });
    
    // Validate the response
    const validationResult = await validateResponse(session.currentQuestionId, transcription, session.storeInfo);
    console.log('Validation result:', validationResult);
    
    console.log('Session state after validation:', {
      currentQuestionId: session.currentQuestionId,
      storeInfo: session.storeInfo,
      incidentDate: session.incidentDate,
      nextQuestionId: validationResult.nextQuestionId
    });
    
    if (validationResult.isValid) {
      // Update session with validated information
      if (validationResult.storeInfo) {
        session.storeInfo = validationResult.storeInfo;
      }
      if (validationResult.incidentDate) {
        session.incidentDate = validationResult.incidentDate;
      }
      
      // Update current question ID if moving to next question
      if (validationResult.nextQuestionId) {
        session.currentQuestionId = validationResult.nextQuestionId;
        console.log('Updated current question ID to:', validationResult.nextQuestionId);
      }
      
      // If this is the end of the chat
      if (validationResult.endChat) {
        console.log('Ending chat with message:', validationResult.message);
        twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, validationResult.message);
        twiml.hangup();
      } else {
        // Move to next question
        console.log('Moving to next question:', validationResult.message);
        twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, validationResult.message);
        twiml.record({
          action: `/twilio/response?callSid=${callSid}`,
          maxLength: 30,
          playBeep: false,
          trim: 'trim-silence'
        });
      }
    } else {
      // Handle invalid response
      console.log('Invalid response, asking user to repeat:', validationResult.message);
      twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, validationResult.message);
      twiml.record({
        action: `/twilio/response?callSid=${callSid}`,
        maxLength: 30,
        playBeep: false,
        trim: 'trim-silence'
      });
    }
  } catch (error) {
    console.error('Error handling voice response:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      callSid,
      recordingSid
    });
    
    twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "I'm sorry, there was an error processing your response. Please try again.");
    twiml.record({
      action: `/twilio/response?callSid=${callSid}`,
      maxLength: 30,
      playBeep: false,
      trim: 'trim-silence'
    });
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
};

module.exports = {
  handleIncomingCall,
  handleVoiceResponse
}; 