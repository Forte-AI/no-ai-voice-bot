const twilio = require('twilio');
const { getFirstQuestion, validateResponse, questions } = require('./questions');
const { transcribeAudio } = require('./transcribe');
const SIPConfig = require('../sipConfig');
const { 
  getConversationControls, 
  validateConversationControls,
  getTurnSettingsForQuestion,
  getRecordingSettingsForQuestion,
  getPostResponseTimeoutForQuestion,
  getQuestionSettingsFromConfig
} = require('../../config/conversationControls');

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

// Initialize SIP configuration
const sipConfig = new SIPConfig();

// Store call sessions
const callSessions = new Map();

// Get conversation controls with validation
const CONVERSATION_CONTROLS = getConversationControls();
const validation = validateConversationControls(CONVERSATION_CONTROLS);

if (!validation.isValid) {
  console.error('Invalid conversation controls configuration:', validation.errors);
  throw new Error('Invalid conversation controls configuration');
}

console.log('Conversation controls loaded:', {
  turnTimeout: CONVERSATION_CONTROLS.turnSettings.timeoutCount,
  postResponseTimeout: CONVERSATION_CONTROLS.postResponseTimeoutCount,
  maxRecordingLength: CONVERSATION_CONTROLS.recordingSettings.maxLength,
  maxRetries: CONVERSATION_CONTROLS.retrySettings.maxRetries
});

// Initialize a new call session with conversation controls
const initializeCallSession = (callSid) => {
  const firstQuestion = getFirstQuestion();
  const session = {
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
    callerInfo: null,
    // Conversation control state
    conversationState: {
      turnCount: 0, // Number of turns in this conversation
      lastResponseTime: Date.now(),
      retryCount: 0, // Current retry count for this turn
      isWaitingForResponse: false,
      timeoutTimer: null,
      postResponseTimer: null
    }
  };
  
  callSessions.set(callSid, session);
  return firstQuestion;
};

// Handle incoming call with enhanced conversation controls
const handleIncomingCall = async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const callSid = req.body.CallSid;
  
  // Capture SIP URI and caller information
  const from = req.body.From;
  const to = req.body.To;
  const caller = req.body.Caller;
  const called = req.body.Called;
  
  console.log('Incoming call details:', {
    callSid,
    from,
    to,
    caller,
    called,
    callType: from && from.toLowerCase().startsWith('sip:') ? 'SIP' : 'Phone Number'
  });
  
  // Initialize call session
  const firstQuestion = initializeCallSession(callSid);
  
  // Store caller information in session
  const session = callSessions.get(callSid);
  if (session) {
    session.callerInfo = {
      from,
      to,
      caller,
      called,
      isSipCall: from && from.toLowerCase().startsWith('sip:')
    };
  }
  
  // Get question-specific settings
  const questionSettings = getQuestionSettingsFromConfig(firstQuestion.text, firstQuestion.id, {
    ...CONVERSATION_CONTROLS.turnSettings,
    ...CONVERSATION_CONTROLS.recordingSettings,
    postResponseTimeoutCount: CONVERSATION_CONTROLS.postResponseTimeoutCount
  });
  
  console.log('Question-specific settings:', {
    questionId: firstQuestion.id,
    questionText: firstQuestion.text,
    turnSettings: {
      timeoutCount: questionSettings.timeoutCount,
      maxSilenceBeforeTimeout: questionSettings.maxSilenceBeforeTimeout,
      maxTurnDuration: questionSettings.maxTurnDuration,
      minTurnDuration: questionSettings.minTurnDuration
    },
    recordingSettings: {
      maxLength: questionSettings.maxLength,
      minLength: questionSettings.minLength
    },
    postResponseTimeout: questionSettings.postResponseTimeoutCount
  });
  
  // Start with the first question
  twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, firstQuestion.text);
  
  // Insert IBM-style post-response pause
  if (questionSettings.postResponseTimeoutCount > 0) {
    twiml.pause({ length: Math.round(questionSettings.postResponseTimeoutCount / 1000) });
  }
  
  // Calculate recording parameters based on question-specific settings
  const maxLength = Math.min(
    firstQuestion.talkingTime || questionSettings.maxLength,
    questionSettings.maxLength
  );
  
  console.log('Recording configuration with question-specific settings:', {
    questionId: firstQuestion.id,
    questionText: firstQuestion.text,
    talkingTime: firstQuestion.talkingTime,
    maxLength: maxLength,
    turnTimeout: questionSettings.timeoutCount,
    postResponseTimeout: questionSettings.postResponseTimeoutCount
  });
  
  // Record user's response with question-specific settings
  twiml.record({
    action: `/twilio/response?callSid=${callSid}`,
    maxLength: maxLength,
    playBeep: questionSettings.playBeep,
    trim: questionSettings.trimSilence ? 'trim-silence' : 'do-not-trim',
    recordingStatusCallback: `/twilio/recording-status?callSid=${callSid}`,
    recordingStatusCallbackEvent: ['completed'],
    // Add timeout for turn management based on question type
    timeout: questionSettings.timeoutCount / 1000, // Convert to seconds
    // Add silence timeout based on question type
    silenceTimeout: questionSettings.maxSilenceBeforeTimeout / 1000
  });
  
  res.type('text/xml');
  res.send(twiml.toString());
};

// Handle user's voice response with enhanced conversation controls
const handleVoiceResponse = async (req, res) => {
  const callSid = req.body.CallSid;
  const recordingSid = req.body.RecordingSid;
  const twiml = new twilio.twiml.VoiceResponse();
  
  console.log('Handling voice response with conversation controls:', {
    callSid,
    recordingSid,
    body: req.body
  });
  
  try {
    // Get current session
    const session = callSessions.get(callSid);
    if (!session) {
      console.log('No session found for callSid:', callSid);
      twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "I'm sorry, there was an error with your call. Please try again later.");
      res.type('text/xml');
      res.send(twiml.toString());
      return;
    }
    
    // Update conversation state
    session.conversationState.turnCount++;
    session.conversationState.lastResponseTime = Date.now();
    session.conversationState.isWaitingForResponse = false;
    
    console.log('Current session state:', {
      callSid,
      currentQuestionId: session.currentQuestionId,
      turnCount: session.conversationState.turnCount,
      retryCount: session.conversationState.retryCount
    });
    
    // Get the recording and wait for it to be ready with enhanced retry logic
    console.log('Fetching recording from Twilio with enhanced retry logic...');
    let recording;
    let retryCount = 0;
    const maxRetries = CONVERSATION_CONTROLS.retrySettings.maxRetries;
    let retryDelay = CONVERSATION_CONTROLS.retrySettings.retryDelay;
    
    while (retryCount < maxRetries) {
      try {
        recording = await twilioClient.recordings(recordingSid).fetch();
        console.log('Recording details:', {
          sid: recording.sid,
          duration: recording.duration,
          status: recording.status,
          retryCount: retryCount,
          turnCount: session.conversationState.turnCount
        });
        
        // Check if recording is ready
        if (recording.status === 'completed' && recording.duration !== '-1' && recording.duration !== '0') {
          // Check minimum length requirement
          const duration = parseInt(recording.duration);
          if (duration >= CONVERSATION_CONTROLS.recordingSettings.minLength) {
            break;
          } else {
            console.log(`Recording too short (${duration}s), below minimum (${CONVERSATION_CONTROLS.recordingSettings.minLength}s)`);
            throw new Error('Recording too short');
          }
        }
        
        // If recording is still processing, wait and retry with exponential backoff
        if (recording.status === 'processing' || recording.duration === '-1' || recording.duration === '0') {
          console.log(`Recording still processing (attempt ${retryCount + 1}/${maxRetries}), waiting ${retryDelay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryCount++;
          retryDelay *= CONVERSATION_CONTROLS.retrySettings.backoffMultiplier;
          continue;
        }
        
        break;
      } catch (fetchError) {
        console.log(`Error fetching recording (attempt ${retryCount + 1}/${maxRetries}):`, fetchError.message);
        
        if (retryCount < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryCount++;
          retryDelay *= CONVERSATION_CONTROLS.retrySettings.backoffMultiplier;
          continue;
        } else {
          throw fetchError;
        }
      }
    }
    
    // If recording is still not ready after retries, handle gracefully
    if (!recording || recording.status !== 'completed' || recording.duration === '-1' || recording.duration === '0') {
      console.log('Recording not ready after retries, asking user to repeat');
      handleRecordingError(twiml, session, callSid, "I didn't catch that. Could you please repeat your answer?");
      res.type('text/xml');
      res.send(twiml.toString());
      return;
    }
    
    const mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`;
    console.log('Media URL:', mediaUrl);
    
    console.log('Starting transcription...');
    let transcription = await transcribeAudio(mediaUrl);
    console.log('Transcription result:', transcription);
    
    if (!transcription || transcription.trim() === '') {
      console.log('Empty transcription received, sending empty space to validation');
      // Send empty space to validation instead of showing error immediately
      transcription = " ";
    }
    
    console.log('Validating response for question ID:', session.currentQuestionId);
    console.log('Session state before validation:', {
      currentQuestionId: session.currentQuestionId,
      storeInfo: session.storeInfo,
      incidentDate: session.incidentDate,
      turnCount: session.conversationState.turnCount
    });
    
    // Validate the response
    const validationResult = await validateResponse(session.currentQuestionId, transcription, session.storeInfo);
    console.log('Validation result:', validationResult);
    
    console.log('Session state after validation:', {
      currentQuestionId: session.currentQuestionId,
      storeInfo: session.storeInfo,
      incidentDate: session.incidentDate,
      nextQuestionId: validationResult.nextQuestionId,
      turnCount: session.conversationState.turnCount
    });
    
    if (validationResult.isValid) {
      // Reset retry count on successful validation
      session.conversationState.retryCount = 0;
      
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
      
      // If this is the end of the chat
      if (validationResult.endChat) {
        console.log('Ending chat with message:', validationResult.message);
        twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, validationResult.message);
        twiml.hangup();
      } else {
        // Move to next question with enhanced conversation controls
        console.log('Moving to next question:', validationResult.message);
        twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, validationResult.message);
        
        // Get the next question to determine talking time and question type
        const nextQuestion = questions.find(q => q.id === session.currentQuestionId);
        
        // Detect question type and get appropriate settings for next question
        const questionSettings = getQuestionSettingsFromConfig(nextQuestion ? nextQuestion.text, nextQuestion.id, {
          ...CONVERSATION_CONTROLS.turnSettings,
          ...CONVERSATION_CONTROLS.recordingSettings,
          postResponseTimeoutCount: CONVERSATION_CONTROLS.postResponseTimeoutCount
        });
        
        // Apply question-specific settings
        const overriddenSettings = getQuestionSettingsFromConfig(
          nextQuestion ? nextQuestion.text : '', 
          session.currentQuestionId, 
          {
            ...questionSettings,
            postResponseTimeoutCount: questionSettings.postResponseTimeoutCount
          }
        );
        
        const maxLength = Math.min(
          nextQuestion ? (nextQuestion.talkingTime || overriddenSettings.maxLength) : overriddenSettings.maxLength,
          overriddenSettings.maxLength
        );
        
        console.log('Next question configuration with question-specific settings:', {
          questionId: session.currentQuestionId,
          questionText: nextQuestion ? nextQuestion.text : 'unknown',
          questionSettings: questionSettings,
          talkingTime: nextQuestion ? nextQuestion.talkingTime : 'default',
          maxLength: maxLength,
          turnTimeout: overriddenSettings.timeoutCount,
          postResponseTimeout: overriddenSettings.postResponseTimeoutCount
        });
        
        // Insert IBM-style post-response pause
        if (overriddenSettings.postResponseTimeoutCount > 0) {
          twiml.pause({ length: Math.round(overriddenSettings.postResponseTimeoutCount / 1000) });
        }
        
        twiml.record({
          action: `/twilio/response?callSid=${callSid}`,
          maxLength: maxLength,
          playBeep: overriddenSettings.playBeep,
          trim: overriddenSettings.trimSilence ? 'trim-silence' : 'do-not-trim',
          timeout: overriddenSettings.timeoutCount / 1000,
          silenceTimeout: overriddenSettings.maxSilenceBeforeTimeout / 1000
        });
      }
    } else {
      // Handle invalid response with retry logic
      session.conversationState.retryCount++;
      console.log('Invalid response, retry count:', session.conversationState.retryCount);
      
      if (session.conversationState.retryCount >= CONVERSATION_CONTROLS.retrySettings.maxRetries) {
        console.log('Max retries reached, ending call');
        twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "I'm having trouble understanding your responses. Please call back later when you're in a quieter environment.");
        twiml.hangup();
      } else {
        console.log('Invalid response, asking user to repeat:', validationResult.message);
        twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, validationResult.message);
        
        // Use current question's settings for retry
        const currentQuestion = questions.find(q => q.id === session.currentQuestionId);
        const questionSettings = getQuestionSettingsFromConfig(currentQuestion ? currentQuestion.text, currentQuestion.id, {
          ...CONVERSATION_CONTROLS.turnSettings,
          ...CONVERSATION_CONTROLS.recordingSettings,
          postResponseTimeoutCount: CONVERSATION_CONTROLS.postResponseTimeoutCount
        });
        
        // Apply question-specific settings
        const overriddenSettings = getQuestionSettingsFromConfig(
          currentQuestion ? currentQuestion.text : '', 
          session.currentQuestionId, 
          {
            ...questionSettings,
            postResponseTimeoutCount: questionSettings.postResponseTimeoutCount
          }
        );
        
        const maxLength = Math.min(
          currentQuestion ? (currentQuestion.talkingTime || overriddenSettings.maxLength) : overriddenSettings.maxLength,
          overriddenSettings.maxLength
        );
        
        console.log('Retry configuration with question-specific settings:', {
          questionId: session.currentQuestionId,
          questionText: currentQuestion ? currentQuestion.text : 'unknown',
          questionSettings: questionSettings,
          retryCount: session.conversationState.retryCount,
          maxLength: maxLength,
          turnTimeout: overriddenSettings.timeoutCount,
          postResponseTimeout: overriddenSettings.postResponseTimeoutCount
        });
        
        // Insert IBM-style post-response pause
        if (overriddenSettings.postResponseTimeoutCount > 0) {
          twiml.pause({ length: Math.round(overriddenSettings.postResponseTimeoutCount / 1000) });
        }
        
        twiml.record({
          action: `/twilio/response?callSid=${callSid}`,
          maxLength: maxLength,
          playBeep: overriddenSettings.playBeep,
          trim: overriddenSettings.trimSilence ? 'trim-silence' : 'do-not-trim',
          timeout: overriddenSettings.timeoutCount / 1000,
          silenceTimeout: overriddenSettings.maxSilenceBeforeTimeout / 1000
        });
      }
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
    
    const session = callSessions.get(callSid);
    if (session) {
      session.conversationState.retryCount++;
      
      if (session.conversationState.retryCount >= CONVERSATION_CONTROLS.retrySettings.maxRetries) {
        twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "I'm experiencing technical difficulties. Please call back later.");
        twiml.hangup();
      } else {
        twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "I'm sorry, there was an error processing your response. Please try again.");
        
        const currentQuestion = questions.find(q => q.id === session.currentQuestionId);
        const questionSettings = getQuestionSettingsFromConfig(currentQuestion ? currentQuestion.text, currentQuestion.id, {
          ...CONVERSATION_CONTROLS.turnSettings,
          ...CONVERSATION_CONTROLS.recordingSettings,
          postResponseTimeoutCount: CONVERSATION_CONTROLS.postResponseTimeoutCount
        });
        
        // Apply question-specific settings
        const overriddenSettings = getQuestionSettingsFromConfig(
          currentQuestion ? currentQuestion.text : '', 
          session.currentQuestionId, 
          {
            ...questionSettings,
            postResponseTimeoutCount: questionSettings.postResponseTimeoutCount
          }
        );
        
        const maxLength = Math.min(
          currentQuestion ? (currentQuestion.talkingTime || overriddenSettings.maxLength) : overriddenSettings.maxLength,
          overriddenSettings.maxLength
        );
        
        console.log('Error retry configuration with question-specific settings:', {
          questionId: session.currentQuestionId,
          questionText: currentQuestion ? currentQuestion.text : 'unknown',
          questionSettings: questionSettings,
          retryCount: session.conversationState.retryCount,
          maxLength: maxLength,
          turnTimeout: overriddenSettings.timeoutCount,
          postResponseTimeout: overriddenSettings.postResponseTimeoutCount
        });
        
        // Insert IBM-style post-response pause
        if (overriddenSettings.postResponseTimeoutCount > 0) {
          twiml.pause({ length: Math.round(overriddenSettings.postResponseTimeoutCount / 1000) });
        }
        
        twiml.record({
          action: `/twilio/response?callSid=${callSid}`,
          maxLength: maxLength,
          playBeep: overriddenSettings.playBeep,
          trim: overriddenSettings.trimSilence ? 'trim-silence' : 'do-not-trim',
          timeout: overriddenSettings.timeoutCount / 1000,
          silenceTimeout: overriddenSettings.maxSilenceBeforeTimeout / 1000
        });
      }
    } else {
      twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "I'm sorry, there was an error with your call. Please try again later.");
      twiml.hangup();
    }
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
};

// Helper function to handle recording errors consistently
const handleRecordingError = (twiml, session, callSid, message) => {
  console.log('Handling recording error:', message);
  console.log('Current session state in handleRecordingError:', {
    callSid,
    currentQuestionId: session.currentQuestionId,
    retryCount: session.conversationState.retryCount
  });
  
  twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, message);
  
  // Use current question's settings for retry
  const currentQuestion = questions.find(q => q.id === session.currentQuestionId);
  const questionSettings = getQuestionSettingsFromConfig(currentQuestion ? currentQuestion.text, currentQuestion.id, {
    ...CONVERSATION_CONTROLS.turnSettings,
    ...CONVERSATION_CONTROLS.recordingSettings,
    postResponseTimeoutCount: CONVERSATION_CONTROLS.postResponseTimeoutCount
  });
  
  // Apply question-specific settings
  const overriddenSettings = getQuestionSettingsFromConfig(
    currentQuestion ? currentQuestion.text : '', 
    session.currentQuestionId, 
    {
      ...questionSettings,
      postResponseTimeoutCount: questionSettings.postResponseTimeoutCount
    }
  );
  
  const maxLength = Math.min(
    currentQuestion ? (currentQuestion.talkingTime || overriddenSettings.maxLength) : overriddenSettings.maxLength,
    overriddenSettings.maxLength
  );
  
  console.log('Recording error retry configuration with question-specific settings:', {
    questionId: session.currentQuestionId,
    questionText: currentQuestion ? currentQuestion.text : 'unknown',
    questionSettings: questionSettings,
    talkingTime: currentQuestion ? currentQuestion.talkingTime : 'default',
    maxLength: maxLength,
    turnTimeout: overriddenSettings.timeoutCount,
    postResponseTimeout: overriddenSettings.postResponseTimeoutCount
  });
  
  // Insert IBM-style post-response pause
  if (overriddenSettings.postResponseTimeoutCount > 0) {
    twiml.pause({ length: Math.round(overriddenSettings.postResponseTimeoutCount / 1000) });
  }
  
  twiml.record({
    action: `/twilio/response?callSid=${callSid}`,
    maxLength: maxLength,
    playBeep: overriddenSettings.playBeep,
    trim: overriddenSettings.trimSilence ? 'trim-silence' : 'do-not-trim',
    timeout: overriddenSettings.timeoutCount / 1000,
    silenceTimeout: overriddenSettings.maxSilenceBeforeTimeout / 1000
  });
};

// Handle recording status callback
const handleRecordingStatus = async (req, res) => {
  const callSid = req.body.CallSid;
  const recordingSid = req.body.RecordingSid;
  const recordingStatus = req.body.RecordingStatus;
  
  console.log('Recording status callback:', {
    callSid,
    recordingSid,
    recordingStatus,
    body: req.body
  });
  
  res.status(200).send('OK');
};

/**
 * Get question-specific settings using the simple JSON config
 * @param {string} questionText - The question text
 * @param {string} questionId - The question ID
 * @param {Object} defaultSettings - Default settings
 * @returns {Object} The settings to use
 */
const getQuestionSpecificSettings = (questionText, questionId, defaultSettings) => {
  return getQuestionSettingsFromConfig(questionText, questionId, defaultSettings);
};

module.exports = {
  handleIncomingCall,
  handleVoiceResponse,
  handleRecordingStatus,
  CONVERSATION_CONTROLS,
  callSessions,
  getQuestionSpecificSettings
}; 