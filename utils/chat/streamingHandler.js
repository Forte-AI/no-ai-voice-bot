const speech = require('@google-cloud/speech');
const WebSocket = require('ws');
const { getFirstQuestion, validateResponse, questions } = require('./questions');
const textToSpeech = require('@google-cloud/text-to-speech');

// Initialize Speech-to-Text client for streaming
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

// Initialize Text-to-Speech client
let ttsClient;
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString());
  ttsClient = new textToSpeech.TextToSpeechClient({ credentials });
} else {
  ttsClient = new textToSpeech.TextToSpeechClient({
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

// Store streaming sessions
const streamingSessions = new Map();

// Initialize a new streaming session
const initializeStreamingSession = (callSid) => {
  const firstQuestion = getFirstQuestion();
  const session = {
    callSid,
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
    isListening: false,
    currentTranscription: '',
    silenceTimer: null,
    silenceThreshold: 2000, // 2 seconds of silence to consider speech complete
    recognitionStream: null,
    ws: null
  };
  
  streamingSessions.set(callSid, session);
  return session;
};

// Convert text to speech and return base64 audio
async function textToSpeechBase64(text) {
  try {
    const request = {
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Chirp3-HD-Charon',
        ssmlGender: 'MALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        sampleRateHertz: 8000, // Phone call quality
        effectsProfileId: ['telephony-class-application']
      }
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    return response.audioContent.toString('base64');
  } catch (error) {
    console.error('Error in text-to-speech:', error);
    throw error;
  }
}

// Handle WebSocket connection for streaming audio
const handleStreamingConnection = (ws, req) => {
  console.log('WebSocket URL:', req.url);
  console.log('WebSocket headers:', req.headers);
  
  // Extract callSid from URL - handle both query parameters and path
  let callSid = null;
  
  if (req.url.includes('callSid=')) {
    callSid = req.url.split('callSid=')[1];
    // Remove any additional query parameters after callSid
    if (callSid.includes('&')) {
      callSid = callSid.split('&')[0];
    }
  } else {
    // Try to extract from path if no query parameters
    const pathParts = req.url.split('/');
    callSid = pathParts[pathParts.length - 1];
  }
  
  console.log('Extracted callSid:', callSid);
  
  if (!callSid || callSid === 'stream') {
    console.error('No valid callSid provided in WebSocket URL');
    console.error('URL:', req.url);
    ws.close();
    return;
  }
  
  console.log('New streaming connection for callSid:', callSid);
  
  // Initialize or get session
  let session = streamingSessions.get(callSid);
  if (!session) {
    console.log('Creating new session for callSid:', callSid);
    session = initializeStreamingSession(callSid);
  } else {
    console.log('Using existing session for callSid:', callSid);
  }
  
  session.ws = ws;
  
  // Set up Google Speech-to-Text streaming recognition
  console.log('Setting up Google Speech-to-Text for callSid:', callSid);
  const recognizeStream = speechClient
    .streamingRecognize({
      config: {
        encoding: 'MULAW',
        sampleRateHertz: 8000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        model: 'phone_call',
        useEnhanced: true
      },
      interimResults: true,
    })
    .on('error', (error) => {
      console.error('Speech recognition error for callSid:', callSid, error);
      ws.send(JSON.stringify({ type: 'error', message: 'Speech recognition error' }));
    })
    .on('data', (data) => {
      console.log('Speech recognition data received for callSid:', callSid);
      handleSpeechRecognitionData(data, session);
    });
  
  session.recognitionStream = recognizeStream;
  
  // Send the first question immediately when connection is established
  console.log('Sending first question immediately for callSid:', callSid);
  sendQuestion(session, getFirstQuestion()).catch(error => {
    console.error('Error sending first question for callSid:', callSid, error);
  });
  
  // Handle incoming audio data from Twilio
  ws.on('message', (message) => {
    try {
      console.log('WebSocket message received for callSid:', callSid, 'message length:', message.length);
      const data = JSON.parse(message);
      
      if (data.event === 'media') {
        console.log('Media event received for callSid:', callSid);
        // Decode base64 audio data from Twilio
        const audioData = Buffer.from(data.media.payload, 'base64');
        
        // Send to Google Speech-to-Text
        if (recognizeStream && recognizeStream.write) {
          recognizeStream.write(audioData);
        }
      } else if (data.event === 'start') {
        console.log('Stream started for callSid:', callSid);
        session.isListening = true;
        // First question already sent, no need to send again
      } else if (data.event === 'stop') {
        console.log('Stream stopped for callSid:', callSid);
        session.isListening = false;
        
        if (recognizeStream) {
          recognizeStream.end();
        }
      } else {
        console.log('Unknown WebSocket event for callSid:', callSid, data.event);
      }
    } catch (error) {
      console.error('Error processing WebSocket message for callSid:', callSid, error);
    }
  });
  
  // Handle WebSocket close
  ws.on('close', (code, reason) => {
    console.log('WebSocket closed for callSid:', callSid, 'code:', code, 'reason:', reason);
    session.isListening = false;
    
    if (session.recognitionStream) {
      session.recognitionStream.end();
    }
    
    if (session.silenceTimer) {
      clearTimeout(session.silenceTimer);
    }
  });
  
  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('WebSocket error for callSid:', callSid, error);
  });
  
  // Send a ping to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000); // Ping every 30 seconds
  
  // Clean up ping interval on close
  ws.on('close', () => {
    clearInterval(pingInterval);
  });
};

// Handle speech recognition data from Google
const handleSpeechRecognitionData = async (data, session) => {
  if (!data.results || data.results.length === 0) return;
  
  const result = data.results[0];
  const transcript = result.alternatives[0].transcript;
  const isFinal = result.isFinal;
  
  console.log('Speech recognition result:', {
    callSid: session.callSid,
    transcript,
    isFinal,
    confidence: result.alternatives[0].confidence
  });
  
  if (isFinal) {
    // Clear any existing silence timer
    if (session.silenceTimer) {
      clearTimeout(session.silenceTimer);
    }
    
    // Process the final transcription
    await processUserResponse(session, transcript);
  } else {
    // Update current transcription for interim results
    session.currentTranscription = transcript;
    
    // Set up silence timer for interim results
    if (session.silenceTimer) {
      clearTimeout(session.silenceTimer);
    }
    
    session.silenceTimer = setTimeout(async () => {
      if (session.currentTranscription.trim()) {
        await processUserResponse(session, session.currentTranscription);
      }
    }, session.silenceThreshold);
  }
};

// Process user response and generate bot response
const processUserResponse = async (session, transcription) => {
  try {
    console.log('Processing user response:', {
      callSid: session.callSid,
      transcription,
      currentQuestionId: session.currentQuestionId
    });
    
    // Validate the response
    const validationResult = await validateResponse(
      session.currentQuestionId, 
      transcription, 
      session.storeInfo
    );
    
    console.log('Validation result:', validationResult);
    
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
      }
      
      // Send response to user
      if (validationResult.endChat) {
        await sendMessage(session, validationResult.message);
        // End the call
        if (session.ws) {
          session.ws.send(JSON.stringify({ type: 'end_call' }));
        }
      } else {
        await sendMessage(session, validationResult.message);
        
        // Get and send next question
        const nextQuestion = questions.find(q => q.id === session.currentQuestionId);
        if (nextQuestion) {
          await sendQuestion(session, nextQuestion);
        }
      }
    } else {
      // Handle invalid response
      await sendMessage(session, validationResult.message);
      
      // Re-ask the current question
      const currentQuestion = questions.find(q => q.id === session.currentQuestionId);
      if (currentQuestion) {
        await sendQuestion(session, currentQuestion);
      }
    }
  } catch (error) {
    console.error('Error processing user response:', error);
    await sendMessage(session, "I'm sorry, there was an error processing your response. Please try again.");
  }
};

// Send a message to the user via TTS
const sendMessage = async (session, message) => {
  try {
    console.log('Sending message to user:', message);
    
    // Convert text to speech
    const audioBase64 = await textToSpeechBase64(message);
    
    // Send audio to Twilio via WebSocket
    if (session.ws) {
      session.ws.send(JSON.stringify({
        type: 'audio',
        audio: audioBase64
      }));
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

// Send a question to the user
const sendQuestion = async (session, question) => {
  try {
    console.log('Sending question to user:', question.text);
    
    // Convert question text to speech
    const audioBase64 = await textToSpeechBase64(question.text);
    
    // Send audio to Twilio via WebSocket
    if (session.ws) {
      session.ws.send(JSON.stringify({
        type: 'audio',
        audio: audioBase64
      }));
    }
  } catch (error) {
    console.error('Error sending question:', error);
  }
};

// Handle incoming call with streaming
const handleIncomingCallStreaming = async (req, res) => {
  const twiml = new (require('twilio').twiml).VoiceResponse();
  const callSid = req.body.CallSid;
  
  console.log('Incoming call for streaming:', callSid);
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  
  // Initialize streaming session
  initializeStreamingSession(callSid);
  
  // Create WebSocket URL with simpler format
  const wsUrl = `wss://${req.get('host')}/twilio/stream?callSid=${callSid}`;
  console.log('WebSocket URL:', wsUrl);
  
  // Start streaming with WebSocket - include both tracks
  twiml.start()
    .stream({
      url: wsUrl,
      track: 'both_tracks' // Use both inbound and outbound tracks
    });
  
  // Add a small delay to ensure WebSocket is ready
  twiml.pause({ length: 1 });
  
  // Add a fallback message in case WebSocket fails
  twiml.say({ voice: 'Google.en-US-Chirp3-HD-Charon' }, "Are you a Sonic Franchise?");
  
  res.type('text/xml');
  res.send(twiml.toString());
};

// Get session by callSid
const getSession = (callSid) => {
  return streamingSessions.get(callSid);
};

// Clean up session
const cleanupSession = (callSid) => {
  const session = streamingSessions.get(callSid);
  if (session) {
    if (session.recognitionStream) {
      session.recognitionStream.end();
    }
    if (session.ws) {
      session.ws.close();
    }
    if (session.silenceTimer) {
      clearTimeout(session.silenceTimer);
    }
    streamingSessions.delete(callSid);
  }
};

module.exports = {
  handleStreamingConnection,
  handleIncomingCallStreaming,
  getSession,
  cleanupSession,
  streamingSessions
}; 