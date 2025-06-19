const twilio = require('twilio');
const { getFirstQuestion, validateResponse, questions } = require('./questions');
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
  
  // Record user's response - simple approach like web chat
  const maxLength = firstQuestion.talkingTime || 30;
  console.log('Recording configuration:', {
    questionId: firstQuestion.id,
    questionText: firstQuestion.text,
    talkingTime: firstQuestion.talkingTime,
    maxLength: maxLength
  });
  
  twiml.record({
    action: `/twilio/response?callSid=${callSid}`,
    maxLength: maxLength,
    playBeep: false,
    trim: 'trim-silence'
  });
  
  res.type('text/xml');
  res.send(twiml.toString());
};

// Handle user's voice response - simplified like web chat
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
    // Get the recording URL directly from Twilio
    const mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`;
    console.log('Media URL:', mediaUrl);
    
    // Transcribe the audio - same as web chat
    console.log('Starting transcription...');
    const transcription = await transcribeAudio(mediaUrl);
    console.log('Transcription result:', transcription);
    
    if (!transcription || transcription.trim() === '') {
      console.log('Empty transcription received, asking user to repeat');
      twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "I didn't catch that. Could you please repeat your answer?");
      
      // Get current session
      const session = callSessions.get(callSid);
      if (!session) {
        console.log('No session found for empty transcription');
        twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "I'm sorry, there was an error with your call. Please try again later.");
        res.type('text/xml');
        res.send(twiml.toString());
        return;
      }
      
      // Use current question's talking time for retry
      const currentQuestion = questions.find(q => q.id === session.currentQuestionId);
      const maxLength = currentQuestion ? (currentQuestion.talkingTime || 30) : 30;
      
      twiml.record({
        action: `/twilio/response?callSid=${callSid}`,
        maxLength: maxLength,
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
    
    // Validate the response - same as web chat
    const validationResult = await validateResponse(session.currentQuestionId, transcription, session.storeInfo);
    console.log('Validation result:', validationResult);
    
    console.log('Session state after validation:', {
      currentQuestionId: session.currentQuestionId,
      storeInfo: session.storeInfo,
      incidentDate: session.incidentDate,
      nextQuestionId: validationResult.nextQuestionId
    });
    
    if (validationResult.isValid) {
      // Update session with validated information - same as web chat
      if (validationResult.storeInfo) {
        session.storeInfo = validationResult.storeInfo;
        console.log('Updated session storeInfo:', session.storeInfo);
      }
      if (validationResult.incidentDate) {
        session.incidentDate = validationResult.incidentDate;
        console.log('Updated session incidentDate:', session.incidentDate);
      }
      
      // Update current question ID if moving to next question - same as web chat
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
        // Move to next question - same as web chat
        console.log('Moving to next question:', validationResult.message);
        twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, validationResult.message);
        
        // Get the next question to determine talking time
        const nextQuestion = questions.find(q => q.id === session.currentQuestionId);
        const maxLength = nextQuestion ? (nextQuestion.talkingTime || 30) : 30;
        console.log('Next question recording config:', {
          questionId: session.currentQuestionId,
          talkingTime: nextQuestion ? nextQuestion.talkingTime : 'default',
          maxLength: maxLength
        });
        
        twiml.record({
          action: `/twilio/response?callSid=${callSid}`,
          maxLength: maxLength,
          playBeep: false,
          trim: 'trim-silence'
        });
      }
    } else {
      // Handle invalid response - same as web chat
      console.log('Invalid response, asking user to repeat:', validationResult.message);
      twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, validationResult.message);
      
      // Use current question's talking time for retry
      const currentQuestion = questions.find(q => q.id === session.currentQuestionId);
      const maxLength = currentQuestion ? (currentQuestion.talkingTime || 30) : 30;
      
      twiml.record({
        action: `/twilio/response?callSid=${callSid}`,
        maxLength: maxLength,
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