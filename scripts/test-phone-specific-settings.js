/**
 * Test script for phone number specific turn settings
 * 
 * This script demonstrates how phone number questions get special
 * treatment with longer timeouts and specific settings.
 */

const { 
  getConversationControls, 
  getQuestionSettingsFromConfig 
} = require('../config/conversationControls');

// Import the override function from twilioHandler
const { getQuestionSpecificOverrides } = require('../utils/chat/twilioHandler');

console.log('=== Phone Number Specific Turn Settings Test ===\n');

// Test phone number specific settings
const testPhoneNumberSettings = () => {
  console.log('\n=== Testing Phone Number Specific Settings ===\n');
  
  const phoneQuestions = [
    "What is your phone number?",
    "Can you provide your telephone number?",
    "What's your contact phone?",
    "I need your phone number",
    "What is the phone number for this location?"
  ];
  
  phoneQuestions.forEach(question => {
    const settings = getQuestionSettingsFromConfig(question, null, {
      timeoutCount: 5000,
      maxSilenceBeforeTimeout: 3000,
      postResponseTimeoutCount: 200,
      maxRecordingLength: 30,
      minRecordingLength: 1.0
    });
    
    console.log(`Question: "${question}"`);
    console.log('Settings:', {
      timeoutCount: settings.timeoutCount,
      maxSilenceBeforeTimeout: settings.maxSilenceBeforeTimeout,
      postResponseTimeoutCount: settings.postResponseTimeoutCount,
      maxRecordingLength: settings.maxRecordingLength,
      minRecordingLength: settings.minRecordingLength
    });
    console.log('---');
  });
};

// Test other question types for comparison
console.log('\n\nComparison with Other Question Types:');
console.log('=====================================');

const comparisonQuestions = [
  "Are you a Sonic Franchise?",
  "What is the date of the incident?",
  "What is the name of the person involved?",
  "What is the address of the person involved?",
  "Please describe the incident in one short sentence."
];

comparisonQuestions.forEach((questionText, index) => {
  console.log(`\n${index + 1}. Question: "${questionText}"`);
  
  const questionType = detectQuestionType(questionText);
  const defaultTurnSettings = getTurnSettingsForQuestion(questionType);
  const defaultRecordingSettings = getRecordingSettingsForQuestion(questionType);
  const defaultPostResponseTimeout = getPostResponseTimeoutForQuestion(questionType);
  
  const overriddenSettings = getQuestionSpecificOverrides(questionText, {
    ...defaultTurnSettings,
    ...defaultRecordingSettings,
    postResponseTimeoutCount: defaultPostResponseTimeout
  });
  
  console.log(`   Type: ${questionType}`);
  console.log(`   Final Settings:`);
  console.log(`     - Timeout: ${overriddenSettings.timeoutCount}ms (${overriddenSettings.timeoutCount/1000}s)`);
  console.log(`     - Max Recording: ${overriddenSettings.maxLength}s`);
  console.log(`     - Post Response Timeout: ${overriddenSettings.postResponseTimeoutCount}ms (${overriddenSettings.postResponseTimeoutCount/1000}s)`);
  console.log(`     - Silence Timeout: ${overriddenSettings.maxSilenceBeforeTimeout}ms (${overriddenSettings.maxSilenceBeforeTimeout/1000}s)`);
});

console.log('\n\nBenefits of Phone-Specific Settings:');
console.log('====================================');
console.log('✅ Longer timeout (7s) for users to think about their phone number');
console.log('✅ Extended silence tolerance (4s) for users who pause while speaking');
console.log('✅ Longer recording time (20s) for users who speak slowly or repeat');
console.log('✅ IBM-style post-response timeout (15s) as per your settings');
console.log('✅ Better user experience for complex information like phone numbers');
console.log('✅ Reduced frustration from premature timeouts');

console.log('\n\nHow to Customize Further:');
console.log('========================');
console.log('1. Edit the getQuestionSpecificOverrides function in twilioHandler.js');
console.log('2. Add new conditions for specific question patterns');
console.log('3. Adjust timeout, recording length, and post-response timeout values');
console.log('4. Test with different question variations');

console.log('\n=== Test Complete ==='); 

// Test question ID specific settings for phone numbers
const testPhoneQuestionIdSettings = () => {
  console.log('\n=== Testing Phone Number Question ID Settings ===\n');
  
  const phoneQuestionText = "What is your phone number?";
  const phoneQuestionIds = ["8", "11"]; // Phone number questions
  
  phoneQuestionIds.forEach(questionId => {
    const settings = getQuestionSettingsFromConfig(phoneQuestionText, questionId, {
      timeoutCount: 5000,
      maxSilenceBeforeTimeout: 3000,
      postResponseTimeoutCount: 200,
      maxRecordingLength: 30,
      minRecordingLength: 1.0
    });
    
    console.log(`Question: "${phoneQuestionText}" (ID: ${questionId})`);
    console.log('Settings:', {
      timeoutCount: settings.timeoutCount,
      maxSilenceBeforeTimeout: settings.maxSilenceBeforeTimeout,
      postResponseTimeoutCount: settings.postResponseTimeoutCount,
      maxRecordingLength: settings.maxRecordingLength,
      minRecordingLength: settings.minRecordingLength
    });
    console.log('---');
  });
}; 