# Sonic Claims Voice Bot

A voice-enabled chatbot for handling Sonic franchise claims, supporting both web and phone interactions with real-time streaming audio processing.

## Features

- Web-based chat interface with voice input/output
- Phone integration via Twilio with real-time streaming
- Google Cloud Speech-to-Text for voice transcription
- Google Cloud Text-to-Speech for voice synthesis
- OpenAI integration for natural language processing
- Real-time audio processing for natural conversations

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

# Google Cloud credentials (choose one method)
# Method 1: Base64 encoded credentials
GOOGLE_CREDENTIALS_BASE64=your_base64_encoded_credentials

# Method 2: Individual credential variables
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_PRIVATE_KEY=your_private_key
GOOGLE_CLIENT_EMAIL=your_client_email
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_CERT_URL=your_client_cert_url

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
   - Under "Status Callback":
     - Set webhook URL to: `https://your-ngrok-url/twilio/status`
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
    sampleRateHertz: 8000,  // Optimized for phone calls
    effectsProfileId: ['telephony-class-application']
  }
}
```

To use a different voice:
1. Visit [Google Cloud Text-to-Speech Voices](https://cloud.google.com/text-to-speech/docs/voices)
2. Choose your preferred voice
3. Update the configuration in `utils/chat/streamingHandler.js`

## Testing

### Web Interface
1. Open `http://localhost:3000` in your browser
2. Click "Start Claim" to begin the conversation
3. Use the microphone button to speak or type your responses

### Phone Integration
1. Call your Twilio phone number
2. The system will answer and start with "Are you a Sonic Franchise?"
3. Speak your response - audio is processed in real-time
4. The system will transcribe your speech and continue the conversation naturally

### Testing with Script
Use the provided test script to verify your setup:

```bash
# Set your test phone number
export TEST_PHONE_NUMBER=+1234567890

# Run the test
node scripts/test-streaming.js
```

## Architecture

The phone integration uses Twilio's WebSocket streaming for real-time audio processing:

```
Phone Call → Twilio → WebSocket → Google Speech-to-Text → AI Processing → Text-to-Speech → Twilio → Phone
```

This approach provides:
- **Real-time processing**: No recording delays
- **Natural conversation flow**: Continuous audio streaming
- **Lower latency**: Immediate responses
- **Better user experience**: More conversational interaction

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

4. If WebSocket connection fails:
   - Check if your server is accessible from the internet
   - Verify SSL certificate (required for production)
   - Check firewall settings

## Deployment

For production deployment:

1. Deploy to a cloud provider (Heroku, AWS, Google Cloud, etc.)
2. Update Twilio webhook URLs to use your production domain
3. Ensure SSL certificate is configured (required for WebSocket connections)
4. Set all environment variables in your production environment

## License

MIT