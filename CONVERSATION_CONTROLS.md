# Conversation Controls - Simplified Timeout Configuration

## Overview

The conversation controls have been simplified to use a single `turnDuration` setting for each question instead of complex timeout configurations. This approach is more straightforward and easier to manage.

## Key Changes

### Removed Complex Settings
- ❌ `timeoutCount` - Initial timeout before user starts speaking
- ❌ `maxSilenceBeforeTimeout` - Silence timeout during recording
- ❌ `postResponseTimeoutCount` - Pause after bot finishes speaking

### Simplified Settings
- ✅ `turnDuration` - Total time allowed for user response per question
- ✅ `maxRetries` - Maximum retry attempts before ending call
- ✅ `finalTimeoutDuration` - Final timeout before hanging up (30s silence timeout)
- ✅ `maxSilence` - Early termination after 2s of silence (improves user experience)

## Configuration Structure

### Default Settings (`config/conversationControls.js`)
```javascript
turnSettings: {
  defaultTurnDuration: 10000, // 10 seconds default
  maxRetries: 3, // Maximum retries before ending call
  finalTimeoutDuration: 30000 // 30 seconds final timeout
},
recordingSettings: {
  maxLength: 30, // Maximum recording length in seconds
  minLength: 1, // Minimum recording length to consider valid
  maxSilence: 2 // Stop recording after 2 seconds of silence
}
```

### Question-Specific Settings (`config/questionSpecificSettings.json`)
The configuration uses a priority-based system:

1. **Question ID Settings** (Highest Priority) - Most specific
2. **Pattern Matching** (Fallback) - Less specific
3. **Default Settings** (Lowest Priority) - Least specific

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
  },
  "questionPatterns": {
    "phone_number": {
      "patterns": ["phone number", "phone", "telephone"],
      "settings": {
        "turnDuration": 20000,
        "maxRecordingLength": 20,
        "minRecordingLength": 1.0
      }
    }
  }
}
```

## How It Works

1. **Turn Duration**: Each question has a specific `turnDuration` (in milliseconds) that determines how long the user has to respond
2. **Timeout Handling**: When the turn duration is exceeded, Twilio automatically triggers a timeout
3. **Retry Logic**: The existing retry logic in `questions.js` handles timeouts and invalid responses
4. **Final Timeout**: If max retries are exceeded, the call is ended
5. **Silence Timeout**: A 30-second final timeout prevents users from remaining silent indefinitely

## Final Timeout Implementation

The `finalTimeoutDuration` setting (default: 30 seconds) provides a safety mechanism to handle users who remain silent:

### How Final Timeout Works

1. **Timer Start**: When a call begins, a 30-second timer starts
2. **Timer Reset**: Each time the user successfully responds, the timer resets to 30 seconds
3. **Timer Trigger**: If the user remains silent for 30 consecutive seconds, the call is automatically hung up
4. **Cleanup**: Proper timer cleanup prevents memory leaks

### Final Timeout Behavior

- **Starts**: When `initializeCallSession()` is called
- **Resets**: When `validateResponse()` returns `isValid: true`
- **Triggers**: After 30 seconds of silence (configurable via `FINAL_TIMEOUT_DURATION` environment variable)
- **Action**: Hangs up call with message: "I haven't heard from you for a while. Please call back when you're ready to continue."

### Configuration

```javascript
// Default: 30 seconds
finalTimeoutDuration: 30000

// Environment variable override
FINAL_TIMEOUT_DURATION=45000  // 45 seconds
```

## Max Silence Implementation

The `maxSilence` setting (default: 2 seconds) provides intelligent early termination when users finish speaking:

### How Max Silence Works

1. **Recording Start**: Recording begins when user starts speaking
2. **Silence Detection**: Twilio monitors for silence during recording
3. **Early Termination**: Recording stops automatically after 2 seconds of silence
4. **Fallback**: If no silence detected, falls back to `turnDuration` timeout
5. **Silence Trimming**: Leading and trailing silence are automatically trimmed

### Max Silence Behavior

- **Triggers**: When user stops speaking for 2 consecutive seconds
- **Fallback**: `turnDuration` timeout (e.g., 10 seconds) if no silence detected
- **Benefits**: Faster response times, more natural conversation flow
- **Configurable**: Can be adjusted via `MAX_SILENCE` environment variable

### Configuration

```javascript
// Default: 2 seconds
maxSilence: 2

// Environment variable override
MAX_SILENCE=3  // 3 seconds
```

### Example Scenarios

| Scenario | User Speaks | Silence | Result |
|----------|-------------|---------|---------|
| Short response | 3s | 2s | ✅ Early termination after 5s total |
| Long response | 25s | 2s | ✅ Early termination after 27s total |
| Silent user | 0s | 10s | ⏰ Timeout after 10s (turnDuration) |
| Continuous speech | 45s | 0s | ⏰ Timeout after 30s (maxLength) |

## Priority Order

The system checks settings in this order (highest to lowest priority):

1. **Question ID Specific** - If a question ID is provided, use its exact settings
2. **Pattern Matching** - If no question ID match, check if question text matches any patterns
3. **Default Settings** - If no matches found, use default conversation controls

## Question-Specific Turn Durations

| Question ID | Description | Turn Duration |
|-------------|-------------|---------------|
| 1 | Are you a Sonic Franchise? | 8 seconds |
| 2 | Store number | 18 seconds |
| 3 | Store confirmation | 8 seconds |
| 4 | Date of incident | 15 seconds |
| 5 | Incident description | 45 seconds |
| 6 | Ambulance called | 8 seconds |
| 7 | Person name | 12 seconds |
| 8 | Phone number | 20 seconds |
| 9 | Address | 25 seconds |
| 10 | Contact name | 20 seconds |
| 11 | Contact phone | 20 seconds |

## Pattern-Based Settings (Fallback)

The system also supports pattern-based settings for questions that match specific patterns:

- **Phone number questions**: 20 seconds
- **Date questions**: 15 seconds  
- **Name questions**: 12 seconds
- **Address questions**: 25 seconds
- **Store number questions**: 18 seconds
- **Incident description questions**: 45 seconds

## Environment Variables

You can override default settings using environment variables:

```bash
DEFAULT_TURN_DURATION=20000  # 20 seconds default
FINAL_TIMEOUT_DURATION=45000 # 45 seconds final timeout
MAX_RETRIES=5                # 5 retries maximum
MAX_RECORDING_LENGTH=60      # 60 seconds max recording
MAX_TURNS=30                 # 30 turns maximum
```

## Benefits of Simplified Approach

1. **Easier Configuration**: Single setting per question instead of multiple timeout parameters
2. **Clearer Logic**: Turn duration directly corresponds to user response time
3. **Better Performance**: No complex timeout calculations or multiple timers
4. **Easier Debugging**: Simpler to understand and troubleshoot
5. **Consistent Behavior**: Predictable timeout behavior across all questions
6. **Clear Priority**: Question ID settings take precedence over pattern matching

## Testing

Run the test scripts to verify the configuration:

```bash
# Test simplified timeout configuration
node scripts/test-simplified-timeout.js

# Test final timeout implementation
node scripts/test-final-timeout.js

# Test max silence implementation
node scripts/test-max-silence.js
```

These will validate:
- Conversation controls configuration
- Turn durations for all questions
- Question-specific settings
- Pattern matching functionality
- Final timeout implementation
- Timer behavior and cleanup
- Max silence early termination
- Twilio record parameters