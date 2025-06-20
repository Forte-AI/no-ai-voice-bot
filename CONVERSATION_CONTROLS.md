# IBM Watson-Style Conversation Controls

This document explains the conversation controls implemented in our Twilio voice bot, which are inspired by IBM Watson's voice telephony configuration.

## Overview

Our voice bot now uses sophisticated conversation controls similar to IBM Watson's approach:

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

These controls manage conversation flow, timeouts, and turn-taking during phone calls for a more natural and reliable user experience.

## 🎯 **NEW: Simple JSON Configuration System**

### Quick Start - No Code Changes Needed!

The easiest way to configure turn settings is by editing `config/questionSpecificSettings.json`:

```json
{
  "questionPatterns": {
    "phone_number": {
      "patterns": ["phone number", "phone", "telephone"],
      "settings": {
        "timeoutCount": 7000,
        "postResponseTimeoutCount": 15000,
        "maxRecordingLength": 20
      }
    }
  }
}
```

### Settings Explained

| Setting | What It Does | Recommended Values |
|---------|-------------|-------------------|
| `timeoutCount` | How long to wait for user to start speaking | 3-10 seconds |
| `maxSilenceBeforeTimeout` | How long of silence before timeout | 2-5 seconds |
| `postResponseTimeoutCount` | IBM-style pause after bot speaks | 8-20 seconds |
| `maxRecordingLength` | Maximum recording time | 8-60 seconds |
| `minRecordingLength` | Minimum valid recording time | 0.5-2 seconds |

### Question Type Guidelines

#### Yes/No Questions (e.g., "Are you a Sonic Franchise?")
```json
{
  "timeoutCount": 3000-5000,
  "postResponseTimeoutCount": 8000-12000,
  "maxRecordingLength": 8-10
}
```

#### Phone Numbers (e.g., "What is the phone number?")
```json
{
  "timeoutCount": 6000-8000,
  "postResponseTimeoutCount": 15000,
  "maxRecordingLength": 18-20
}
```

#### Descriptions (e.g., "Please describe the incident")
```json
{
  "timeoutCount": 8000-10000,
  "postResponseTimeoutCount": 20000,
  "maxRecordingLength": 45-60
}
```

### Two Ways to Configure

#### Method 1: Pattern Matching
```json
"phone_number": {
  "patterns": ["phone number", "phone", "telephone"],
  "settings": {
    "timeoutCount": 7000,
    "postResponseTimeoutCount": 15000
  }
}
```

#### Method 2: Specific Question ID
```json
"8": {
  "description": "Phone number question",
  "settings": {
    "timeoutCount": 7000,
    "postResponseTimeoutCount": 15000
  }
}
```

### Testing Your Configuration

Run this command to test your settings:
```bash
node scripts/test-simple-config.js
```

## Configuration

### Environment Variables

You can configure conversation controls using environment variables:

```bash
# Turn management
TURN_TIMEOUT_COUNT=5000              # 5 seconds to start speaking
POST_RESPONSE_TIMEOUT_COUNT=12000    # 12 seconds after bot finishes

# Recording settings
MAX_RECORDING_LENGTH=30              # Maximum recording length in seconds
MAX_RETRIES=3                        # Maximum retries for failed transcriptions

# Conversation flow
MAX_TURNS=20                         # Maximum turns before ending call
```

### Default Configuration

The default configuration mimics IBM Watson's settings:

```javascript
const CONVERSATION_CONTROLS = {
  turnSettings: {
    timeoutCount: 5000,              // 5 seconds to start speaking
    maxSilenceBeforeTimeout: 3000,   // 3 seconds of silence before timeout
    maxTurnDuration: 30000,          // 30 seconds maximum per turn
    minTurnDuration: 1000            // 1 second minimum per turn
  },
  postResponseTimeoutCount: 12000,   // 12 seconds after bot finishes
  recordingSettings: {
    maxLength: 30,                   // Maximum recording length
    minLength: 1,                    // Minimum recording length
    trimSilence: true,               // Trim silence from recordings
    playBeep: false                  // Don't play beep sound
  },
  retrySettings: {
    maxRetries: 3,                   // Maximum retries
    retryDelay: 2000,                // Delay between retries
    backoffMultiplier: 1.5           // Exponential backoff
  }
};
```

## Key Features

### 1. Turn Management

**Timeout Control**: Like IBM Watson, our bot waits 5 seconds for the user to start speaking before timing out.

**Silence Detection**: The bot detects 3 seconds of silence and automatically ends the recording.

**Turn Duration Limits**: Each turn is limited to 30 seconds maximum with a 1-second minimum.

### 2. Post-Response Timeout

**Response Window**: After the bot finishes speaking, users have 12 seconds to respond (like IBM Watson).

**Natural Flow**: This creates a more natural conversation rhythm.

### 3. Enhanced Recording

**Quality Settings**: 
- Maximum recording length: 30 seconds
- Minimum recording length: 1 second
- Silence trimming enabled
- No beep sound for better UX

**Dual Channel Recording**: Records both channels for better audio quality.

### 4. Intelligent Retry Logic

**Exponential Backoff**: Retry delays increase exponentially (2s, 3s, 4.5s).

**Maximum Retries**: Limits retries to prevent infinite loops.

**Error Recovery**: Graceful handling of transcription failures.

### 5. Conversation Flow Control

**Turn Limits**: Maximum 20 turns per conversation.

**Duration Limits**: 5-minute maximum conversation duration.

**Graceful Degradation**: Handles errors without crashing.

## Usage Examples

### Basic Configuration

```javascript
const { getConversationControls } = require('./config/conversationControls');

const controls = getConversationControls();
console.log('Turn timeout:', controls.turnSettings.timeoutCount);
```

### Custom Configuration

```javascript
// Set environment variables for custom behavior
process.env.TURN_TIMEOUT_COUNT = '3000';        // 3 seconds
process.env.MAX_RECORDING_LENGTH = '45';        // 45 seconds
process.env.MAX_RETRIES = '5';                  // 5 retries

const controls = getConversationControls();
```

### IBM Watson-Style Output

```javascript
const { getWatsonStyleConfig } = require('./config/conversationControls');

const watsonConfig = getWatsonStyleConfig();
console.log(JSON.stringify(watsonConfig, null, 2));
```

Output:
```json
{
  "voice_telephony": {
    "turn_settings": {
      "timeout_count": 5000,
      "max_silence_before_timeout": 3000,
      "max_turn_duration": 30000,
      "min_turn_duration": 1000
    },
    "post_response_timeout_count": 12000,
    "recording_settings": {
      "max_length": 30,
      "min_length": 1,
      "trim_silence": true,
      "play_beep": false
    }
  }
}
```

## Validation

The configuration is automatically validated to ensure settings are within acceptable ranges:

```javascript
const { validateConversationControls } = require('./config/conversationControls');

const controls = getConversationControls();
const validation = validateConversationControls(controls);

if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}
```

## Comparison with IBM Watson

| Feature | IBM Watson | Our Implementation |
|---------|------------|-------------------|
| Turn Timeout | 5000ms | 5000ms (configurable) |
| Post-Response Timeout | 12000ms | 12000ms (configurable) |
| Recording Quality | High | High (dual channel) |
| Retry Logic | Built-in | Exponential backoff |
| Error Handling | Robust | Graceful degradation |
| Configuration | JSON | Environment variables + JSON |

## Troubleshooting

### Common Issues

**Problem:** Users getting cut off too quickly
**Solution:** Increase `timeoutCount` and `maxRecordingLength`

**Problem:** Too much silence being recorded
**Solution:** Decrease `maxSilenceBeforeTimeout`

**Problem:** Bot feels rushed
**Solution:** Increase `postResponseTimeoutCount`

**Problem:** Very short recordings being accepted
**Solution:** Increase `minRecordingLength`

### Testing Your Settings

Run the test script to see how your settings work:
```bash
node scripts/test-simple-config.js
```

## Best Practices

1. **Start Conservative:** Use shorter timeouts and increase if needed
2. **Test with Real Users:** Different demographics may need different settings
3. **Monitor Logs:** Watch for timeout errors or user complaints
4. **A/B Test:** Try different settings for the same question type
5. **Consider Context:** Time of day, user age, question complexity all matter

## Quick Reference Card

### For Yes/No Questions:
- `timeoutCount`: 3000-5000ms
- `postResponseTimeoutCount`: 8000-12000ms
- `maxRecordingLength`: 8-10 seconds

### For Phone Numbers:
- `timeoutCount`: 6000-8000ms
- `postResponseTimeoutCount`: 15000ms
- `maxRecordingLength`: 18-20 seconds

### For Descriptions:
- `timeoutCount`: 8000-10000ms
- `postResponseTimeoutCount`: 20000ms
- `maxRecordingLength`: 45-60 seconds

Remember: These are guidelines - adjust based on your specific use case and user feedback!

## Benefits

### 1. Natural Conversation Flow
- Proper turn-taking timing
- Natural pauses and responses
- Reduced awkward silences

### 2. Improved Reliability
- Intelligent retry logic
- Error recovery mechanisms
- Graceful failure handling

### 3. Better User Experience
- No premature timeouts
- Appropriate response times
- Professional conversation flow

### 4. Easy Configuration
- Simple JSON file editing
- No code changes required
- Pattern-based matching
- Question ID specific settings 