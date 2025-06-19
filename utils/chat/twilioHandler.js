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
  
  try {
    // Get the recording and transcribe it
    const recording = await twilioClient.recordings(recordingSid).fetch();
    const mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`;
    const transcription = await transcribeAudio(mediaUrl);
    
    // Get current session
    const session = callSessions.get(callSid);
    if (!session) {
      twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "I'm sorry, there was an error with your call. Please try again later.");
      res.type('text/xml');
      res.send(twiml.toString());
      return;
    }
    
    // Validate the response
    const validationResult = await validateResponse(session.currentQuestionId, transcription, session.storeInfo);
    
    if (validationResult.isValid) {
      // Update session with validated information
      if (validationResult.storeInfo) {
        session.storeInfo = validationResult.storeInfo;
      }
      if (validationResult.incidentDate) {
        session.incidentDate = validationResult.incidentDate;
      }
      
      // If this is the end of the chat
      if (validationResult.endChat) {
        twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, validationResult.message);
        twiml.hangup();
      } else {
        // Move to next question
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