/**
 * Conversation Controls Configuration
 * 
 * This configuration mimics IBM Watson's voice telephony settings:
 * {
 *   "voice_telephony": {
 *     "turn_settings": {
 *       "timeout_count": 5000
 *     },
 *     "post_response_timeout_count": 12000
 *   }
 * }
 * 
 * These settings control how the voice bot manages conversation flow,
 * timeouts, and turn-taking during phone calls.
 */

const CONVERSATION_CONTROLS = {
  // Turn settings - how long to wait for user to start speaking
  turnSettings: {
    timeoutCount: 5000, // 5 seconds to start speaking (like IBM Watson)
    maxSilenceBeforeTimeout: 3000, // 3 seconds of silence before timeout
    maxTurnDuration: 30000, // 30 seconds maximum per turn
    minTurnDuration: 1000 // 1 second minimum per turn
  },
  
  // Post-response timeout - how long to wait after bot finishes speaking
  postResponseTimeoutCount: 12000, // 12 seconds (like IBM Watson)
  
  // Recording settings
  recordingSettings: {
    maxLength: 30, // Maximum recording length in seconds
    minLength: 1, // Minimum recording length to consider valid
    trimSilence: true, // Trim silence from recordings
    playBeep: false, // Don't play beep sound
    recordingChannels: 'dual', // Record both channels for better quality
    recordingStatusCallbackEvents: ['completed', 'failed']
  },
  
  // Retry settings
  retrySettings: {
    maxRetries: 3, // Maximum number of retries for failed transcriptions
    retryDelay: 2000, // Delay between retries in milliseconds
    backoffMultiplier: 1.5, // Exponential backoff multiplier
    maxRetryDelay: 10000 // Maximum delay between retries
  },
  
  // Conversation flow settings
  conversationFlow: {
    maxTurns: 20, // Maximum number of turns before ending call
    maxConversationDuration: 300000, // 5 minutes maximum conversation
    allowInterruption: false, // Whether to allow user interruption
    confirmResponses: false, // Whether to confirm responses before proceeding
    gracefulDegradation: true // Whether to gracefully handle errors
  },
  
  // Audio quality settings
  audioSettings: {
    sampleRateHertz: 8000, // Phone call optimized sample rate
    encoding: 'MP3', // Audio encoding format
    effectsProfileId: ['telephony-class-application'], // Optimize for phone calls
    voice: {
      languageCode: 'en-US',
      name: 'en-US-Chirp3-HD-Charon',
      ssmlGender: 'MALE'
    }
  },
  
  // Error handling settings
  errorHandling: {
    maxConsecutiveErrors: 3, // Maximum consecutive errors before ending call
    errorRecoveryEnabled: true, // Whether to attempt error recovery
    fallbackMessages: [
      "I didn't catch that. Could you please repeat your answer?",
      "I'm having trouble understanding. Could you speak more clearly?",
      "Let me try again. Please repeat your response."
    ]
  },
  
  // Performance monitoring
  monitoring: {
    logTurnDetails: true, // Log detailed turn information
    trackResponseTimes: true, // Track response times for optimization
    monitorAudioQuality: true, // Monitor audio quality metrics
    alertOnErrors: false // Whether to send alerts on errors
  }
};

/**
 * Get conversation controls with environment variable overrides
 * Allows runtime configuration through environment variables
 */
const getConversationControls = () => {
  const controls = { ...CONVERSATION_CONTROLS };
  
  // Override with environment variables if present
  if (process.env.TURN_TIMEOUT_COUNT) {
    controls.turnSettings.timeoutCount = parseInt(process.env.TURN_TIMEOUT_COUNT);
  }
  
  if (process.env.POST_RESPONSE_TIMEOUT_COUNT) {
    controls.postResponseTimeoutCount = parseInt(process.env.POST_RESPONSE_TIMEOUT_COUNT);
  }
  
  if (process.env.MAX_RECORDING_LENGTH) {
    controls.recordingSettings.maxLength = parseInt(process.env.MAX_RECORDING_LENGTH);
  }
  
  if (process.env.MAX_RETRIES) {
    controls.retrySettings.maxRetries = parseInt(process.env.MAX_RETRIES);
  }
  
  if (process.env.MAX_TURNS) {
    controls.conversationFlow.maxTurns = parseInt(process.env.MAX_TURNS);
  }
  
  return controls;
};

/**
 * Validate conversation controls configuration
 * Ensures all settings are within acceptable ranges
 */
const validateConversationControls = (controls) => {
  const errors = [];
  
  // Validate turn settings
  if (controls.turnSettings.timeoutCount < 1000 || controls.turnSettings.timeoutCount > 30000) {
    errors.push('turnSettings.timeoutCount must be between 1000 and 30000 milliseconds');
  }
  
  if (controls.turnSettings.maxSilenceBeforeTimeout < 500 || controls.turnSettings.maxSilenceBeforeTimeout > 10000) {
    errors.push('turnSettings.maxSilenceBeforeTimeout must be between 500 and 10000 milliseconds');
  }
  
  // Validate recording settings
  if (controls.recordingSettings.maxLength < 5 || controls.recordingSettings.maxLength > 120) {
    errors.push('recordingSettings.maxLength must be between 5 and 120 seconds');
  }
  
  if (controls.recordingSettings.minLength < 0.5 || controls.recordingSettings.minLength > 10) {
    errors.push('recordingSettings.minLength must be between 0.5 and 10 seconds');
  }
  
  // Validate retry settings
  if (controls.retrySettings.maxRetries < 1 || controls.retrySettings.maxRetries > 10) {
    errors.push('retrySettings.maxRetries must be between 1 and 10');
  }
  
  if (controls.retrySettings.retryDelay < 500 || controls.retrySettings.retryDelay > 10000) {
    errors.push('retrySettings.retryDelay must be between 500 and 10000 milliseconds');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get IBM Watson-style configuration object
 * Returns configuration in the format similar to IBM Watson's voice_telephony settings
 */
const getWatsonStyleConfig = () => {
  const controls = getConversationControls();
  
  return {
    voice_telephony: {
      turn_settings: {
        timeout_count: controls.turnSettings.timeoutCount,
        max_silence_before_timeout: controls.turnSettings.maxSilenceBeforeTimeout,
        max_turn_duration: controls.turnSettings.maxTurnDuration,
        min_turn_duration: controls.turnSettings.minTurnDuration
      },
      post_response_timeout_count: controls.postResponseTimeoutCount,
      recording_settings: {
        max_length: controls.recordingSettings.maxLength,
        min_length: controls.recordingSettings.minLength,
        trim_silence: controls.recordingSettings.trimSilence,
        play_beep: controls.recordingSettings.playBeep
      },
      retry_settings: {
        max_retries: controls.retrySettings.maxRetries,
        retry_delay: controls.retrySettings.retryDelay,
        backoff_multiplier: controls.retrySettings.backoffMultiplier
      },
      conversation_flow: {
        max_turns: controls.conversationFlow.maxTurns,
        max_conversation_duration: controls.conversationFlow.maxConversationDuration,
        allow_interruption: controls.conversationFlow.allowInterruption
      }
    }
  };
};

module.exports = {
  CONVERSATION_CONTROLS,
  getConversationControls,
  validateConversationControls,
  getWatsonStyleConfig
}; 