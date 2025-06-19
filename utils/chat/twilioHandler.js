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
  
  // Record user's response with direct streaming to our server
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
    trim: 'trim-silence',
    recordingStatusCallback: `/twilio/recording-status?callSid=${callSid}`,
    recordingStatusCallbackEvent: ['completed'],
    recordingChannels: 'dual'
  });
  
  res.type('text/xml');
  res.send(twiml.toString());
};

// Handle recording status callback (when recording is completed)
const handleRecordingStatus = async (req, res) => {
  const callSid = req.query.callSid;
  const recordingSid = req.body.RecordingSid;
  const recordingUrl = req.body.RecordingUrl;
  const recordingDuration = req.body.RecordingDuration;
  
  console.log('Recording status callback:', {
    callSid,
    recordingSid,
    recordingUrl,
    recordingDuration,
    body: req.body
  });
  
  // Send immediate response to Twilio
  res.status(200).send('OK');
  
  // Process the recording asynchronously
  try {
    console.log('Processing recording asynchronously...');
    const transcription = await transcribeAudio(recordingUrl);
    console.log('Transcription result:', transcription);
    
    if (!transcription || transcription.trim() === '') {
      console.log('Empty transcription, will ask user to repeat on next interaction');
      return;
    }
    
    // Process the transcription and generate response
    await processTranscription(callSid, transcription);
    
  } catch (error) {
    console.error('Error processing recording:', error);
  }
};

// Process transcription and generate response
const processTranscription = async (callSid, transcription) => {
  try {
    // Get current session
    const session = callSessions.get(callSid);
    if (!session) {
      console.log('No session found for callSid:', callSid);
      return;
    }
    
    console.log('Validating response for question ID:', session.currentQuestionId);
    console.log('Session state before validation:', {
      currentQuestionId: session.currentQuestionId,
      storeInfo: session.storeInfo,
      incidentDate: session.incidentDate
    });
    
    // Validate the response - properly await the async validation
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
        console.log('Updated session storeInfo:', session.storeInfo);
      }
      if (validationResult.incidentDate) {
        session.incidentDate = validationResult.incidentDate;
        console.log('Updated session incidentDate:', session.incidentDate);
      }
      
      // Update current question ID if moving to next question
      if (validationResult.nextQuestionId) {
        session.currentQuestionId = validationResult.nextQuestionId;
        console.log('Updated current question ID to:', validationResult.nextQuestionId);
      }
      
      // Store the response for the next interaction
      session.lastResponse = {
        message: validationResult.message,
        endChat: validationResult.endChat,
        nextQuestionId: validationResult.nextQuestionId
      };
      
      console.log('Stored response for next interaction:', session.lastResponse);
      
    } else {
      // Handle invalid response
      console.log('Invalid response, storing retry message:', validationResult.message);
      session.lastResponse = {
        message: validationResult.message,
        endChat: false,
        retry: true
      };
    }
    
  } catch (error) {
    console.error('Error processing transcription:', error);
  }
};

// Handle user's voice response (simplified - just check for stored response)
const handleVoiceResponse = async (req, res) => {
  const callSid = req.body.CallSid;
  const twiml = new twilio.twiml.VoiceResponse();
  
  console.log('Handling voice response:', {
    callSid,
    body: req.body
  });
  
  // Get current session
  const session = callSessions.get(callSid);
  if (!session) {
    console.log('No session found for callSid:', callSid);
    twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "I'm sorry, there was an error with your call. Please try again later.");
    res.type('text/xml');
    res.send(twiml.toString());
    return;
  }
  
  // Check if we have a stored response from the recording processing
  if (session.lastResponse) {
    const response = session.lastResponse;
    console.log('Using stored response:', response);
    
    // Clear the stored response
    delete session.lastResponse;
    
    if (response.endChat) {
      console.log('Ending chat with message:', response.message);
      twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, response.message);
      twiml.hangup();
    } else if (response.retry) {
      console.log('Asking user to repeat:', response.message);
      twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, response.message);
      
      // Use current question's talking time for retry
      const currentQuestion = questions.find(q => q.id === session.currentQuestionId);
      const maxLength = currentQuestion ? (currentQuestion.talkingTime || 30) : 30;
      
      twiml.record({
        action: `/twilio/response?callSid=${callSid}`,
        maxLength: maxLength,
        playBeep: false,
        trim: 'trim-silence',
        recordingStatusCallback: `/twilio/recording-status?callSid=${callSid}`,
        recordingStatusCallbackEvent: ['completed'],
        recordingChannels: 'dual'
      });
    } else {
      console.log('Moving to next question:', response.message);
      twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, response.message);
      
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
        trim: 'trim-silence',
        recordingStatusCallback: `/twilio/recording-status?callSid=${callSid}`,
        recordingStatusCallbackEvent: ['completed'],
        recordingChannels: 'dual'
      });
    }
  } else {
    // No stored response, ask user to repeat
    console.log('No stored response found, asking user to repeat');
    twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "I didn't catch that. Could you please repeat your answer?");
    
    // Use current question's talking time for retry
    const currentQuestion = questions.find(q => q.id === session.currentQuestionId);
    const maxLength = currentQuestion ? (currentQuestion.talkingTime || 30) : 30;
    
    twiml.record({
      action: `/twilio/response?callSid=${callSid}`,
      maxLength: maxLength,
      playBeep: false,
      trim: 'trim-silence',
      recordingStatusCallback: `/twilio/recording-status?callSid=${callSid}`,
      recordingStatusCallbackEvent: ['completed'],
      recordingChannels: 'dual'
    });
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
};

module.exports = {
  handleIncomingCall,
  handleRecordingStatus,
  handleVoiceResponse
}; 