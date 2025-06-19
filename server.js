const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const textToSpeech = require('@google-cloud/text-to-speech');
const speech = require('@google-cloud/speech');
const { getFirstQuestion, validateResponse, questions, resetAllRetryCounts } = require('./utils/chat/questions');
const twilioRoutes = require('./routes/twilio');
const path = require('path');
const os = require('os');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true })); // Required for Twilio webhooks
app.use(express.static('public'));

// Twilio routes
app.use('/twilio', twilioRoutes);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Text-to-Speech client
let ttsClient;
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  // Use base64-encoded credentials
  const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString());
  ttsClient = new textToSpeech.TextToSpeechClient({ credentials });
} else {
  // Use individual environment variables
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

// Initialize Speech-to-Text client
let speechClient;
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  // Use base64-encoded credentials
  const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString());
  speechClient = new speech.SpeechClient({ credentials });
} else {
  // Use individual environment variables
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

// Store chat sessions and their audio processing state
const chatSessions = new Map();
const audioProcessingSessions = new Map();

// Web voice input endpoint
app.post('/api/speech-to-text', async (req, res) => {
  const sessionId = req.body.sessionId;
  if (!sessionId) {
    return res.status(400).json({ error: 'No session ID provided' });
  }

  // Check if this session is already processing audio
  if (audioProcessingSessions.get(sessionId)) {
    return res.status(409).json({ error: 'Audio processing already in progress for this session' });
  }

  try {
    if (!req.body.audio) {
      console.error('No audio data in request body');
      return res.status(400).json({ error: 'No audio data provided' });
    }

    // Mark this session as processing audio
    audioProcessingSessions.set(sessionId, true);

    console.log('Received audio data for session:', sessionId, 'length:', req.body.audio.length);
    
    // Extract base64 data from data URL
    const base64Data = req.body.audio.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid audio data format');
    }
    
    // Detect file type from data URL or session
    let encoding = 'WEBM_OPUS';
    let sampleRateHertz = 48000;
    if (req.body.audio.startsWith('data:audio/wav')) {
      encoding = 'LINEAR16'; // Google expects LINEAR16 for WAV
      sampleRateHertz = 24000;
    }
    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(base64Data, 'base64');
    console.log('Converted audio buffer size:', audioBuffer.length);
    // Create a temporary file with session ID
    const tempFile = path.join(os.tmpdir(), `web-recording-${sessionId}-${Date.now()}.${encoding === 'LINEAR16' ? 'wav' : 'webm'}`);
    fs.writeFileSync(tempFile, audioBuffer);
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
        encoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: 'en-US',
      };
      const request = {
        audio: audio,
        config: config,
      };
      console.log('Sending request to Google Speech-to-Text for session:', sessionId);
      // Perform the transcription
      const [response] = await speechClient.recognize(request);
      console.log('Received response from Google Speech-to-Text for session:', sessionId);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      console.log('Transcription result for session:', sessionId, ':', transcription);
      res.json({ text: transcription });
    } finally {
      // Clean up the temporary file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
        console.log('Cleaned up temporary file for session:', sessionId);
      }
      // Remove session from processing state
      audioProcessingSessions.delete(sessionId);
    }
  } catch (error) {
    console.error('Error processing speech for session:', sessionId, error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      credentials: {
        hasBase64: !!process.env.GOOGLE_CREDENTIALS_BASE64,
        hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL
      }
    });
    // Remove session from processing state
    audioProcessingSessions.delete(sessionId);
    res.status(500).json({ 
      error: 'Error processing speech',
      details: error.message 
    });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    // Get or create chat session
    let session = chatSessions.get(sessionId);
    if (!session) {
      // Initialize new session with first question
      session = {
        currentQuestion: getFirstQuestion(),
        storeInfo: null
      };
      chatSessions.set(sessionId, session);
      
      // Return the first question
      return res.status(200).json({
        message: session.currentQuestion.text,
        endChat: false
      });
    }

    // Validate the response
    const validationResult = await validateResponse(
      session.currentQuestion.id,
      message,
      session.storeInfo
    );

    // Update session state
    if (validationResult.storeInfo) {
      session.storeInfo = validationResult.storeInfo;
    }
    if (validationResult.nextQuestionId) {
      session.currentQuestion = questions.find(q => q.id === validationResult.nextQuestionId);
    } else if (validationResult.isValid) {
      const currentIndex = questions.findIndex(q => q.id === session.currentQuestion.id);
      session.currentQuestion = questions[currentIndex + 1];
    }

    res.status(200).json({
      message: validationResult.message,
      endChat: validationResult.endChat || false
    });
  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ error: 'Error processing chat request' });
  }
});

// Text-to-Speech endpoint
app.post('/api/text-to-speech', async (req, res) => {
  const sessionId = req.body.sessionId;
  if (!sessionId) {
    return res.status(400).json({ error: 'No session ID provided' });
  }

  try {
    const { input, voice, audioConfig } = req.body;
    console.log('TTS Request received for session:', sessionId, 'body:', req.body);
    console.log('TTS Client initialized:', !!ttsClient);

    const request = {
      input,
      voice,
      audioConfig
    };

    console.log('Sending request to Google TTS with config for session:', sessionId);
    const [response] = await ttsClient.synthesizeSpeech(request);
    console.log('Received response from Google TTS for session:', sessionId, 'audio content length:', response?.audioContent?.length);
    
    if (!response || !response.audioContent) {
      console.error('Invalid response from Google TTS for session:', sessionId);
      throw new Error('Invalid response from Google TTS');
    }

    res.set('Content-Type', 'audio/mpeg');
    res.send(response.audioContent);
  } catch (error) {
    console.error('Error with text-to-speech for session:', sessionId, error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      credentials: {
        hasBase64: !!process.env.GOOGLE_CREDENTIALS_BASE64,
        hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL
      }
    });
    res.status(500).json({ 
      error: 'Error processing text-to-speech request',
      details: error.message 
    });
  }
});

// Add endpoint to get current question's talking time
app.get('/api/current-question', (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  const session = chatSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const currentQuestion = questions.find(q => q.id === session.currentQuestion.id);
  if (!currentQuestion) {
    return res.status(404).json({ error: 'Question not found' });
  }

  res.json({
    talkingTime: currentQuestion.talkingTime || 10 // Default to 10 seconds if not specified
  });
});

app.post('/api/reset-session', (req, res) => {
  resetAllRetryCounts();
  res.json({ success: true });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = server; 