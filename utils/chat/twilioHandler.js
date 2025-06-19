const twilio = require('twilio');
const { getFirstQuestion, validateResponse, questions } = require('./questions');
const SIPConfig = require('../sipConfig');
const fs = require('fs');
const os = require('os');
const path = require('path');
const speech = require('@google-cloud/speech');

// Initialize Speech-to-Text client
let speechClient;
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString());
  speechClient = new speech.SpeechClient({ credentials });
} else {
  speechClient = new speech.SpeechClient({
    credentials: {
      type: "service_account",
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL
    }
  });
}

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
    callerInfo: null
  });
  return firstQuestion;
};

// Handle incoming call
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
  
  // Record user's response with proper configuration
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
    recordingStatusCallbackEvent: ['completed']
  });
  
  res.type('text/xml');
  res.send(twiml.toString());
};

// Handle recording status callback
const handleRecordingStatus = async (req, res) => {
  const callSid = req.query.callSid;
  const recordingSid = req.body.RecordingSid;
  const recordingStatus = req.body.RecordingStatus;
  
  console.log('Recording status callback:', {
    callSid,
    recordingSid,
    recordingStatus,
    body: req.body
  });
  
  if (recordingStatus === 'completed') {
    try {
      // Process the recording
      await processRecording(callSid, recordingSid);
    } catch (error) {
      console.error('Error processing recording:', error);
    }
  }
  
  res.status(200).send('OK');
};

// Handle user's voice response (fallback)
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
    // Process the recording
    await processRecording(callSid, recordingSid);
    
    // Return empty TwiML - the actual response will be sent via the recording status callback
    res.type('text/xml');
    res.send(twiml.toString());
    
  } catch (error) {
    console.error('Error handling voice response:', error);
    
    twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "I'm sorry, there was an error processing your response. Please try again.");
    
    // Get current session for retry
    const session = callSessions.get(callSid);
    if (session) {
      const currentQuestion = questions.find(q => q.id === session.currentQuestionId);
      const maxLength = currentQuestion ? (currentQuestion.talkingTime || 30) : 30;
      
      twiml.record({
        action: `/twilio/response?callSid=${callSid}`,
        maxLength: maxLength,
        playBeep: false,
        trim: 'trim-silence',
        recordingStatusCallback: `/twilio/recording-status?callSid=${callSid}`,
        recordingStatusCallbackEvent: ['completed']
      });
    }
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
};

// Process recording and generate response
const processRecording = async (callSid, recordingSid) => {
  try {
    console.log('Processing recording for callSid:', callSid, 'recordingSid:', recordingSid);
    
    // Get the recording URL
    const mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`;
    console.log('Media URL:', mediaUrl);
    
    // Download the recording
    const response = await twilioClient.request({
      method: 'GET',
      uri: mediaUrl,
      auth: { username: accountSid, password: authToken }
    });
    
    console.log('Downloaded recording, size:', response.body.length);
    
    // Create a temporary file
    const tempFile = path.join(os.tmpdir(), `phone-recording-${callSid}-${Date.now()}.mp3`);
    fs.writeFileSync(tempFile, response.body);
    console.log('Created temporary file:', tempFile);
    
    try {
      // Read the file
      const audioBytes = fs.readFileSync(tempFile).toString('base64');
      console.log('Read audio file, base64 length:', audioBytes.length);
      
      // Configure the request
      const audio = {
        content: audioBytes
      };
      
      const config = {
        encoding: 'MP3',
        sampleRateHertz: 8000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true
      };
      
      const request = {
        audio: audio,
        config: config,
      };
      
      console.log('Sending request to Google Speech-to-Text');
      const [speechResponse] = await speechClient.recognize(request);
      
      const transcription = speechResponse.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      
      console.log('Transcription result:', transcription);
      
      if (!transcription || transcription.trim() === '') {
        console.log('Empty transcription received, asking user to repeat');
        await sendResponseToCall(callSid, "I didn't catch that. Could you please repeat your answer?", false);
        return;
      }
      
      // Process the transcription
      await processTranscription(callSid, transcription);
      
    } finally {
      // Clean up the temporary file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
        console.log('Cleaned up temporary file');
      }
    }
    
  } catch (error) {
    console.error('Error processing recording:', error);
    await sendResponseToCall(callSid, "I'm sorry, there was an error processing your response. Please try again.", false);
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
      
      // Send response to call
      if (validationResult.endChat) {
        console.log('Ending chat with message:', validationResult.message);
        await sendResponseToCall(callSid, validationResult.message, true);
      } else {
        console.log('Moving to next question:', validationResult.message);
        await sendResponseToCall(callSid, validationResult.message, false);
      }
      
    } else {
      // Handle invalid response
      console.log('Invalid response, asking user to repeat:', validationResult.message);
      await sendResponseToCall(callSid, validationResult.message, false);
    }
    
  } catch (error) {
    console.error('Error processing transcription:', error);
    await sendResponseToCall(callSid, "I'm sorry, there was an error processing your response. Please try again.", false);
  }
};

// Send response to the call by updating the call
const sendResponseToCall = async (callSid, message, endChat) => {
  try {
    console.log('Sending response to call:', callSid, 'message:', message, 'endChat:', endChat);
    
    if (endChat) {
      // End the call
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, message);
      twiml.hangup();
      
      await twilioClient.calls(callSid)
        .update({ twiml: twiml.toString() });
      
      console.log('Call ended for callSid:', callSid);
    } else {
      // Continue with next question
      const session = callSessions.get(callSid);
      if (!session) {
        console.log('No session found for callSid:', callSid);
        return;
      }
      
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, message);
      
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
        recordingStatusCallbackEvent: ['completed']
      });
      
      await twilioClient.calls(callSid)
        .update({ twiml: twiml.toString() });
      
      console.log('Call updated with next question for callSid:', callSid);
    }
    
  } catch (error) {
    console.error('Error sending response to call:', error);
  }
};

module.exports = {
  handleIncomingCall,
  handleVoiceResponse,
  handleRecordingStatus
}; 