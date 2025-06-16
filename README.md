# Sonic Claims Voice Bot

A voice-enabled chatbot for handling Sonic franchise claims, supporting both web and phone interactions.

## Features

- Web-based chat interface with voice input/output
- Phone integration via Twilio
- Google Cloud Speech-to-Text for voice transcription
- Google Cloud Text-to-Speech for voice synthesis
- OpenAI integration for natural language processing

## Prerequisites

- Node.js (v14 or higher)
- Google Cloud account with Speech-to-Text and Text-to-Speech APIs enabled
- Twilio account with a phone number
- OpenAI API key

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Google Cloud credentials
GOOGLE_APPLICATION_CREDENTIALS=path_to_your_google_credentials.json

# Twilio credentials
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

# Server configuration
PORT=3000
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install ngrok for local testing:
```bash
npm install -g ngrok
```

## Running the Application

1. Start the server:
```bash
node server.js
```

2. In a separate terminal, start ngrok:
```bash
ngrok http 3000
```

3. Configure Twilio webhook:
   - Copy the ngrok URL (e.g., `https://xxxx-xx-xx-xxx-xx.ngrok.io`)
   - Go to Twilio Console > Phone Numbers > Manage > Active numbers
   - Click on your phone number
   - Under "Voice & Fax" configuration:
     - Set webhook URL for "A Call Comes In" to: `https://your-ngrok-url/twilio/incoming`
     - Set HTTP method to POST

## Google Cloud Voice Configuration

The application uses Google Cloud's Text-to-Speech API with the following voice configuration:

```javascript
{
  voice: {
    languageCode: 'en-US',
    name: 'en-US-Chirp3-HD-Charon',  // High-quality male voice
    ssmlGender: 'MALE'
  },
  audioConfig: {
    audioEncoding: 'MP3',
    sampleRateHertz: 24000,
    speakingRate: 1.0,
    pitch: 0.0,
    volumeGainDb: 0.0,
    effectsProfileId: ['headphone-class-device']
  }
}
```

To use a different voice:
1. Visit [Google Cloud Text-to-Speech Voices](https://cloud.google.com/text-to-speech/docs/voices)
2. Choose your preferred voice
3. Update the configuration in `public/app.js` and `utils/chat/twilioHandler.js`

## Testing

### Web Interface
1. Open `http://localhost:3000` in your browser
2. Click "Start Claim" to begin the conversation
3. Use the microphone button to speak or type your responses

### Phone Integration
1. Call your Twilio phone number
2. The system will answer and start with "Are you a Sonic Franchise?"
3. Speak your response
4. The system will transcribe your speech and continue the conversation

## Troubleshooting

1. If you get a "Cannot find module" error:
   - Run `npm install` to ensure all dependencies are installed
   - Check that all required environment variables are set

2. If Twilio webhook fails:
   - Ensure ngrok is running
   - Verify the webhook URL in Twilio console
   - Check server logs for any errors

3. If voice transcription fails:
   - Verify Google Cloud credentials
   - Check that Speech-to-Text API is enabled
   - Ensure audio format matches expected configuration

## License

MIT