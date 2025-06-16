const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const textToSpeech = require('@google-cloud/text-to-speech');
const { getFirstQuestion, validateResponse, questions } = require('./utils/chat/questions');
const twilioRoutes = require('./routes/twilio');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
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

// Store chat sessions
const chatSessions = new Map();

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
  try {
    const { input, voice, audioConfig } = req.body;

    const request = {
      input,
      voice,
      audioConfig
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.audioContent);
  } catch (error) {
    console.error('Error with text-to-speech:', error);
    res.status(500).json({ error: 'Error processing text-to-speech request' });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 