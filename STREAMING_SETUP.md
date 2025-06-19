# Twilio Streaming Voice Bot Setup

This guide explains how to set up and use the streaming approach for real-time voice conversations with Twilio.

## Overview

The streaming approach uses Twilio's WebSocket streaming to enable real-time voice conversations:

1. **Real-time Audio Processing**: Audio is processed in real-time without recording delays
2. **Lower Latency**: Faster response times compared to traditional recording approaches
3. **Better User Experience**: More natural conversation flow
4. **Intelligent AI Logic**: Uses advanced question validation and conversation flow

## Architecture

```
Phone Call → Twilio → WebSocket → Google Speech-to-Text → AI Processing → Text-to-Speech → Twilio → Phone
```

## Setup Instructions

### 1. Environment Variables

Make sure you have all required environment variables set:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Google Cloud Configuration
GOOGLE_CREDENTIALS_BASE64=your_base64_credentials
# OR individual credentials:
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_PRIVATE_KEY=your_private_key
GOOGLE_CLIENT_EMAIL=your_client_email
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_CERT_URL=your_client_cert_url

# OpenAI Configuration (for AI processing)
OPENAI_API_KEY=your_openai_api_key
```

### 2. Deploy Your Server

Deploy your server to a public URL that Twilio can reach:

#### Option A: Using ngrok (for development)
```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm start

# In another terminal, expose your server
ngrok http 3000
```

#### Option B: Using Heroku
```bash
# Deploy to Heroku
heroku create your-app-name
git push heroku main
```

#### Option C: Using other cloud providers
Deploy to AWS, Google Cloud, DigitalOcean, etc.

### 3. Configure Twilio Phone Number

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to Phone Numbers → Manage → Active numbers
3. Click on your phone number
4. Configure the webhook:
   - **Voice webhook**: `https://your-domain.com/twilio/incoming`
   - **Status callback**: `https://your-domain.com/twilio/status`
   - **HTTP method**: POST

### 4. Install Dependencies

```bash
npm install ws
```

## Usage

### Making a Call

Once configured, simply call your Twilio phone number. The system will:

1. Answer the call
2. Connect to the streaming WebSocket
3. Start the conversation with the first question
4. Process your responses in real-time
5. Provide AI-generated responses via text-to-speech

### Testing

Use the provided test script:

```bash
# Set your test phone number
export TEST_PHONE_NUMBER=+1234567890

# Run the test
node scripts/test-streaming.js
```

## API Endpoints

### Voice Bot Endpoints

- `POST /twilio/incoming` - Handle incoming calls with streaming
- `POST /twilio/status` - Handle call status updates
- `WebSocket /twilio/stream?callSid=xxx` - WebSocket for audio streaming

## How It Works

### 1. Call Initiation
When a call comes in, Twilio sends a webhook to `/twilio/incoming`

### 2. TwiML Response
The server responds with TwiML that starts streaming:

```xml
<Response>
  <Start>
    <Stream url="wss://your-domain.com/twilio/stream?callSid=xxx" />
  </Start>
  <Say>Connecting you to our voice assistant...</Say>
</Response>
```

### 3. WebSocket Connection
Twilio establishes a WebSocket connection to stream audio in real-time

### 4. Audio Processing
- Audio data is sent via WebSocket
- Google Speech-to-Text processes the audio stream
- Interim and final results are generated

### 5. AI Processing
- Final transcriptions are validated using intelligent conversation logic
- AI generates responses based on the conversation state

### 6. Text-to-Speech
- Responses are converted to speech using Google Text-to-Speech
- Audio is sent back to Twilio via WebSocket

## Configuration Options

### Silence Detection
Adjust the silence threshold for speech detection:

```javascript
// In streamingHandler.js
silenceThreshold: 2000, // 2 seconds of silence
```

### Audio Quality
Configure audio settings for phone calls:

```javascript
// Speech-to-Text configuration
config: {
  encoding: 'MULAW',
  sampleRateHertz: 8000,
  languageCode: 'en-US',
  enableAutomaticPunctuation: true,
  model: 'phone_call',
  useEnhanced: true
}

// Text-to-Speech configuration
audioConfig: {
  audioEncoding: 'MP3',
  sampleRateHertz: 8000,
  effectsProfileId: ['telephony-class-application']
}
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**
   - Check if your server is accessible from the internet
   - Verify SSL certificate (required for production)
   - Check firewall settings

2. **Audio Not Processing**
   - Verify Google Cloud credentials
   - Check Speech-to-Speech API quotas
   - Monitor server logs for errors

3. **High Latency**
   - Check server location relative to Twilio
   - Monitor network performance
   - Consider using a CDN

### Debugging

Enable detailed logging by checking the console output:

```bash
# Start server with debug logging
DEBUG=* npm start
```

### Monitoring

Monitor your calls in the Twilio Console:
- [Voice Calls](https://console.twilio.com/us1/develop/voice/manage/calls)
- [Logs](https://console.twilio.com/us1/develop/voice/manage/logs)

## Advantages of Streaming Approach

| Feature | Streaming |
|---------|-----------|
| Latency | Low (real-time) |
| User Experience | Natural conversation |
| Response Time | Immediate |
| Conversation Flow | Continuous |
| Audio Quality | Optimized for phone calls |

## Security Considerations

1. **WebSocket Security**: Use WSS (secure WebSocket) in production
2. **Authentication**: Consider adding authentication to WebSocket connections
3. **Rate Limiting**: Implement rate limiting for webhook endpoints
4. **Input Validation**: Validate all incoming data

## Cost Considerations

- **Twilio**: Streaming may use more bandwidth but reduces call duration
- **Google Cloud**: Speech-to-Text streaming pricing
- **Server**: Higher CPU usage for real-time processing

## Support

For issues or questions:
1. Check the server logs
2. Monitor Twilio Console
3. Review Google Cloud logs
4. Test with the provided test script 