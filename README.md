# No-AI Voice Bot

A Twilio-based voice bot for handling insurance claims over the phone. This bot guides users through a structured conversation to collect claim information without using AI for decision-making.

## Features

- **Phone Integration**: Full Twilio phone number integration
- **Voice Recognition**: Google Cloud Speech-to-Text for accurate transcription
- **Natural Voice**: Google Cloud Text-to-Speech with high-quality voice
- **Simplified Timeout Management**: Single turn duration per question
- **Error Handling**: Robust retry logic and graceful error recovery
- **Configurable**: Easy JSON-based configuration for question-specific settings
- **Voice-based interaction**: Natural conversation flow with speech recognition
- **Question-specific timeouts**: Custom turn durations for different question types
- **Intelligent retry logic**: Automatic retry with exponential backoff for failed transcriptions
- **Final timeout protection**: 30-second silence timeout to prevent indefinite calls
- **Early termination**: 2-second silence detection for faster response times
- **Error recovery**: Intelligent retry logic and graceful degradation
- **Configurable behavior**: JSON-based question-specific settings
- **Better user experience**: Appropriate timeouts for each question type

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd no-ai-voice-bot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Start the server:
```bash
npm start
```

5. In a separate terminal, start ngrok:
```bash
ngrok http 3000
```

6. Configure Twilio webhook:
   - Copy the ngrok URL (e.g., `https://xxxx-xx-xx-xxx-xx.ngrok.io`)
   - Go to Twilio Console > Phone Numbers > Manage > Active numbers
   - Click on your phone number
   - Under "Voice & Fax" configuration:
     - Set webhook URL for "A Call Comes In" to: `https://your-ngrok-url/twilio/incoming`
     - Set HTTP method to POST
   - Under "Status Callback":
     - Set webhook URL to: `https://your-ngrok-url/twilio/status`
     - Set HTTP method to POST

## Simplified Conversation Controls

Our voice bot uses a simplified timeout configuration that focuses on turn duration per question:

### Key Features

- **Turn Duration**: Each question has a specific time limit for user response
- **Automatic Timeout**: Twilio handles timeouts when turn duration is exceeded
- **Retry Logic**: Existing retry logic in questions.js handles timeouts and invalid responses
- **Question-Specific Settings**: Easy configuration via JSON file
- **Pattern Matching**: Automatic settings based on question content

### Testing Conversation Controls

Run the simplified timeout test to verify your configuration:

```bash
node scripts/test-simplified-timeout.js
```

This will validate turn durations for all questions and demonstrate the simplified approach.

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

### Testing Simplified Timeout Configuration
```bash
# Test the simplified timeout configuration
node scripts/test-simplified-timeout.js
```

## Architecture

The phone integration uses Twilio's recording approach with simplified conversation controls:

```
Phone Call → Twilio → Recording → Google Speech-to-Text → AI Processing → Text-to-Speech → Twilio → Phone
```

This approach provides:
- **Reliable processing**: Robust recording and transcription
- **Simple timeout management**: Single turn duration per question
- **Error recovery**: Intelligent retry logic and graceful degradation
- **Configurable behavior**: JSON-based question-specific settings
- **Better user experience**: Appropriate timeouts for each question type

## Conversation Flow

### Turn Management
1. **Bot speaks**: Delivers question or response
2. **Recording starts**: User begins speaking
3. **Silence detection**: Recording stops after 2s of silence (early termination)
4. **Turn timeout**: Question-specific duration limit (fallback)
5. **Processing**: Audio is transcribed and validated
6. **Retry logic**: Failed transcriptions are retried with exponential backoff
7. **Final timeout**: 30-second silence timeout prevents indefinite calls

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
   - Increase turn duration in `config/questionSpecificSettings.json`
   - Check conversation flow settings

5. If too many retries occur:
   - Decrease `MAX_RETRIES` environment variable
   - Check audio quality and background noise
   - Verify Google Cloud API quotas

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_TURN_DURATION` | 15000 | Default turn duration in milliseconds |
| `FINAL_TIMEOUT_DURATION` | 30000 | Final timeout duration in milliseconds |
| `MAX_RECORDING_LENGTH` | 30 | Maximum recording length in seconds |
| `MAX_SILENCE` | 2 | Max silence before early termination in seconds |
| `MAX_RETRIES` | 3 | Maximum retries for failed transcriptions |
| `MAX_TURNS` | 20 | Maximum turns before ending call |

### Question-Specific Configuration

For question-specific settings, edit `config/questionSpecificSettings.json`:

```json
{
  "questionIds": {
    "1": {
      "description": "Are you a Sonic Franchise?",
      "settings": {
        "turnDuration": 8000,
        "maxRecordingLength": 8,
        "minRecordingLength": 0.5
      }
    }
  }
}
```

## Deployment

For production deployment:

1. Deploy to a cloud provider (Heroku, AWS, Google Cloud, etc.)
2. Update Twilio webhook URLs to use your production domain
3. Set all environment variables in your production environment
4. Configure question-specific settings for your use case
5. Monitor conversation logs and adjust settings as needed

## Documentation

- [Conversation Controls Guide](CONVERSATION_CONTROLS.md) - Detailed guide on simplified timeout configuration
- [SIP Setup Guide](SIP_SETUP.md) - Guide for SIP URI configuration

## License

MIT