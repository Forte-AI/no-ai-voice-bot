# Sonic Claims Voice Bot

A voice-enabled chatbot for handling Sonic franchise claims, supporting both web and phone interactions with IBM Watson-style conversation controls for natural, reliable voice conversations.

## Features

- Web-based chat interface with voice input/output
- Phone integration via Twilio with intelligent conversation controls
- Google Cloud Speech-to-Text for voice transcription
- Google Cloud Text-to-Speech for voice synthesis
- OpenAI integration for natural language processing
- IBM Watson-style timeout and turn management
- Enhanced recording approach with retry logic and error recovery

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

# Conversation Controls (optional - uses IBM Watson defaults)
TURN_TIMEOUT_COUNT=5000              # 5 seconds to start speaking
POST_RESPONSE_TIMEOUT_COUNT=12000    # 12 seconds after bot finishes
MAX_RECORDING_LENGTH=30              # Maximum recording length in seconds
MAX_RETRIES=3                        # Maximum retries for failed transcriptions
MAX_TURNS=20                         # Maximum turns before ending call

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

## IBM Watson-Style Conversation Controls

Our voice bot uses sophisticated conversation controls inspired by IBM Watson's voice telephony configuration:

```javascript
{
  "voice_telephony": {
    "turn_settings": {
      "timeout_count": 5000
    },
    "post_response_timeout_count": 12000
  }
}
```

### Key Features

- **Turn Management**: 5-second timeout for user to start speaking
- **Silence Detection**: 3-second silence detection with automatic recording end
- **Post-Response Timeout**: 12-second window after bot finishes speaking
- **Intelligent Retry Logic**: Exponential backoff for failed transcriptions
- **Error Recovery**: Graceful handling of transcription failures
- **Configurable Settings**: Environment variable overrides for customization

### Testing Conversation Controls

Run the conversation controls test to verify your configuration:

```bash
node scripts/test-conversation-controls.js
```

This will validate that your settings match IBM Watson's approach and demonstrate all features.

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
3. Update the configuration in `config/conversationControls.js`

## Testing

### Web Interface
1. Open `http://localhost:3000` in your browser
2. Click "Start Claim" to begin the conversation
3. Use the microphone button to speak or type your responses

### Phone Integration
1. Call your Twilio phone number
2. The system will answer and start with "Are you a Sonic Franchise?"
3. Speak your response - audio is recorded and processed
4. The system will transcribe your speech and continue the conversation naturally

### Testing Conversation Controls
```bash
# Test the IBM Watson-style conversation controls
node scripts/test-conversation-controls.js
```

## Architecture

The phone integration uses Twilio's recording approach with intelligent conversation controls:

```
Phone Call → Twilio → Recording → Google Speech-to-Text → AI Processing → Text-to-Speech → Twilio → Phone
```

This approach provides:
- **Reliable processing**: Robust recording and transcription
- **Natural conversation flow**: IBM Watson-style turn management
- **Error recovery**: Intelligent retry logic and graceful degradation
- **Configurable behavior**: Environment variable customization
- **Better user experience**: Appropriate timeouts and silence detection

## Conversation Flow

### Turn Management
1. **Bot speaks**: Delivers question or response
2. **Post-response timeout**: 12-second window for user to respond
3. **Recording starts**: User begins speaking
4. **Turn timeout**: 5-second timeout if user doesn't start speaking
5. **Silence detection**: 3-second silence ends recording automatically
6. **Processing**: Audio is transcribed and validated
7. **Retry logic**: Failed transcriptions are retried with exponential backoff

### Error Handling
- **Empty recordings**: Automatic retry with user prompt
- **Transcription failures**: Up to 3 retries with increasing delays
- **Invalid responses**: Clear error messages and retry prompts
- **Technical issues**: Graceful degradation and helpful error messages

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
   - Check retry settings in conversation controls

4. If calls end too quickly:
   - Increase `TURN_TIMEOUT_COUNT` environment variable
   - Increase `POST_RESPONSE_TIMEOUT_COUNT` environment variable
   - Check conversation flow settings

5. If too many retries occur:
   - Decrease `MAX_RETRIES` environment variable
   - Check audio quality and background noise
   - Verify Google Cloud API quotas

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TURN_TIMEOUT_COUNT` | 5000 | Milliseconds to wait for user to start speaking |
| `POST_RESPONSE_TIMEOUT_COUNT` | 12000 | Milliseconds after bot finishes speaking |
| `MAX_RECORDING_LENGTH` | 30 | Maximum recording length in seconds |
| `MAX_RETRIES` | 3 | Maximum retries for failed transcriptions |
| `MAX_TURNS` | 20 | Maximum turns before ending call |

### Advanced Configuration

For advanced configuration, modify `config/conversationControls.js`:

```javascript
const CONVERSATION_CONTROLS = {
  turnSettings: {
    timeoutCount: 5000,              // 5 seconds to start speaking
    maxSilenceBeforeTimeout: 3000,   // 3 seconds of silence before timeout
    maxTurnDuration: 30000,          // 30 seconds maximum per turn
    minTurnDuration: 1000            // 1 second minimum per turn
  },
  // ... more settings
};
```

## Deployment

For production deployment:

1. Deploy to a cloud provider (Heroku, AWS, Google Cloud, etc.)
2. Update Twilio webhook URLs to use your production domain
3. Set all environment variables in your production environment
4. Configure conversation controls for your use case
5. Monitor conversation logs and adjust settings as needed

## Documentation

- [Conversation Controls Guide](CONVERSATION_CONTROLS.md) - Detailed guide on IBM Watson-style conversation controls
- [SIP Setup Guide](SIP_SETUP.md) - Guide for SIP URI configuration
- [Streaming Setup Guide](STREAMING_SETUP.md) - Guide for streaming approach (alternative)

## License

MIT