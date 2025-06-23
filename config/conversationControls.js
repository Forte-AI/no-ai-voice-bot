/**
 * Conversation Controls Configuration
 * 
 * Simplified configuration that focuses on turn duration per question
 * and removes complex timeout settings.
 */

const fs = require('fs');
const path = require('path');

const CONVERSATION_CONTROLS = {
  // Default turn settings - fallback for questions without specific settings
  turnSettings: {
    defaultTurnDuration: 15000, // 15 seconds default turn duration
    maxRetries: 3, // Maximum retries before ending call
    finalTimeoutDuration: 60000 // 60 seconds final timeout before hanging up (increased for better user experience)
  },
  
  // Recording settings
  recordingSettings: {
    maxLength: 30, // Maximum recording length in seconds
    minLength: 1, // Minimum recording length to consider valid
    trimSilence: true, // Trim silence from recordings
    playBeep: false, // Don't play beep sound
    recordingChannels: 'dual', // Record both channels for better quality
    recordingStatusCallbackEvents: ['completed', 'failed'],
    maxSilence: 2 // Stop recording after 2 seconds of silence (early termination)
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
  if (process.env.DEFAULT_TURN_DURATION) {
    controls.turnSettings.defaultTurnDuration = parseInt(process.env.DEFAULT_TURN_DURATION);
  }
  
  if (process.env.FINAL_TIMEOUT_DURATION) {
    controls.turnSettings.finalTimeoutDuration = parseInt(process.env.FINAL_TIMEOUT_DURATION);
  }
  
  if (process.env.MAX_RECORDING_LENGTH) {
    controls.recordingSettings.maxLength = parseInt(process.env.MAX_RECORDING_LENGTH);
  }
  
  if (process.env.MAX_SILENCE) {
    controls.recordingSettings.maxSilence = parseInt(process.env.MAX_SILENCE);
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
 * Get turn duration for a specific question ID
 * @param {string} questionId - The question ID
 * @returns {number} Turn duration in milliseconds
 */
const getTurnDurationForQuestion = (questionId) => {
  const controls = getConversationControls();
  
  // Get question-specific settings from JSON config
  const questionSettings = getQuestionSettingsFromConfig('', questionId, {
    turnDuration: controls.turnSettings.defaultTurnDuration
  });
  
  return questionSettings.turnDuration || controls.turnSettings.defaultTurnDuration;
};

/**
 * Get recording settings for a specific question type
 * @param {string} questionType - The type of question
 * @returns {Object} Recording settings for the specified question type
 */
const getRecordingSettingsForQuestion = (questionType) => {
  const controls = getConversationControls();
  
  return {
    ...controls.recordingSettings,
    maxLength: controls.recordingSettings.maxLength,
    minLength: controls.recordingSettings.minLength
  };
};

/**
 * Validate conversation controls configuration
 * Ensures all settings are within acceptable ranges
 */
const validateConversationControls = (controls) => {
  const errors = [];
  
  // Validate turn settings
  if (controls.turnSettings.defaultTurnDuration < 5000 || controls.turnSettings.defaultTurnDuration > 60000) {
    errors.push('turnSettings.defaultTurnDuration must be between 5000 and 60000 milliseconds');
  }
  
  if (controls.turnSettings.finalTimeoutDuration < 10000 || controls.turnSettings.finalTimeoutDuration > 300000) {
    errors.push('turnSettings.finalTimeoutDuration must be between 10000 and 300000 milliseconds');
  }
  
  // Validate recording settings
  if (controls.recordingSettings.maxLength < 5 || controls.recordingSettings.maxLength > 120) {
    errors.push('recordingSettings.maxLength must be between 5 and 120 seconds');
  }
  
  if (controls.recordingSettings.minLength < 0.5 || controls.recordingSettings.minLength > 10) {
    errors.push('recordingSettings.minLength must be between 0.5 and 10 seconds');
  }
  
  if (controls.recordingSettings.maxSilence < 1 || controls.recordingSettings.maxSilence > 10) {
    errors.push('recordingSettings.maxSilence must be between 1 and 10 seconds');
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
 * Get simplified configuration object
 * Returns configuration focused on turn duration
 */
const getSimplifiedConfig = () => {
  const controls = getConversationControls();
  
  return {
    turn_settings: {
      default_turn_duration: controls.turnSettings.defaultTurnDuration,
      final_timeout_duration: controls.turnSettings.finalTimeoutDuration,
      max_retries: controls.turnSettings.maxRetries
    },
    recording_settings: {
      max_length: controls.recordingSettings.maxLength,
      min_length: controls.recordingSettings.minLength,
      trim_silence: controls.recordingSettings.trimSilence,
      play_beep: controls.recordingSettings.playBeep,
      max_silence: controls.recordingSettings.maxSilence
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
  };
};

/**
 * Get question-specific settings from JSON configuration
 * @param {string} questionText - The question text
 * @param {string} questionId - The question ID (optional)
 * @param {Object} defaultSettings - Default settings to fall back to
 * @returns {Object} The settings to use
 */
const getQuestionSettingsFromConfig = (questionText, questionId = null, defaultSettings = {}) => {
  try {
    const configPath = path.join(__dirname, 'questionSpecificSettings.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // First check question ID (most specific)
    if (questionId && config.questionIds[questionId]) {
      console.log(`Using question ID ${questionId} specific settings`);
      return { ...defaultSettings, ...config.questionIds[questionId].settings };
    }
    
    // Then check patterns
    const text = questionText.toLowerCase();
    for (const [key, patternConfig] of Object.entries(config.questionPatterns)) {
      const matches = patternConfig.patterns.some(pattern => text.includes(pattern));
      const excluded = patternConfig.excludePatterns && 
                      patternConfig.excludePatterns.some(pattern => text.includes(pattern));
      
      if (matches && !excluded) {
        console.log(`Using pattern "${key}" settings for question: "${questionText}"`);
        return { ...defaultSettings, ...patternConfig.settings };
      }
    }
    
    // Return default settings if no match
    return defaultSettings;
  } catch (error) {
    console.log('Error loading question-specific config, using defaults:', error.message);
    return defaultSettings;
  }
};

module.exports = {
  CONVERSATION_CONTROLS,
  getConversationControls,
  getTurnDurationForQuestion,
  getRecordingSettingsForQuestion,
  validateConversationControls,
  getSimplifiedConfig,
  getQuestionSettingsFromConfig
}; 