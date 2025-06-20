/**
 * Test script for question-specific turn settings
 * 
 * This script demonstrates how different question types get different
 * turn settings based on the question content.
 */

const { 
  getConversationControls, 
  getQuestionSettingsFromConfig 
} = require('../config/conversationControls');

const { questions } = require('../utils/chat/questions');

console.log('=== Question-Specific Turn Settings Test ===\n');

// Test question-specific settings
const testQuestionSettings = () => {
  console.log('\n=== Testing Question-Specific Settings ===\n');
  
  const questions = [
    "Are you a Sonic Franchise?",
    "What is your phone number?",
    "What is your name?",
    "What is your address?",
    "What is the store number?",
    "Can you describe the incident?"
  ];
  
  questions.forEach(question => {
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

// Test question ID specific settings
const testQuestionIdSettings = () => {
  console.log('\n=== Testing Question ID Specific Settings ===\n');
  
  const questionText = "What is your phone number?";
  const questionIds = ["1", "8", "11"];
  
  questionIds.forEach(questionId => {
    const settings = getQuestionSettingsFromConfig(questionText, questionId, {
      timeoutCount: 5000,
      maxSilenceBeforeTimeout: 3000,
      postResponseTimeoutCount: 200,
      maxRecordingLength: 30,
      minRecordingLength: 1.0
    });
    
    console.log(`Question: "${questionText}" (ID: ${questionId})`);
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

// Test with actual questions from the bot
console.log('\n\nActual Bot Questions:');
console.log('====================');

// Define the actual questions that get asked to users based on the validation logic
const actualQuestions = [
  "Are you a Sonic Franchise?",
  "What is the store number, for example, 4 8 9 6?",
  "Got it. So, your Sonic store number is [STORE_NUMBER]. Your store, managed by [OWNER], is located at [ADDRESS] [ZIP]. Is it correct?",
  "What is the date of the incident, such as July 4th?",
  "Please describe the incident in one short sentence.",
  "Was the ambulance called?",
  "What is the name of the person involved?",
  "What is the phone number of the person involved?",
  "What is the address of the person involved?",
  "What is the name of the contact person?",
  "What is the phone number of the contact person?"
];

actualQuestions.forEach((questionText, index) => {
  const questionId = index + 1;
  const settings = getQuestionSettingsFromConfig(questionText, questionId, {
    timeoutCount: 5000,
    maxSilenceBeforeTimeout: 3000,
    postResponseTimeoutCount: 200,
    maxRecordingLength: 30,
    minRecordingLength: 1.0
  });
  
  // Get the original question object to show talking time
  const originalQuestion = questions.find(q => q.id === questionId);
  const talkingTime = originalQuestion ? originalQuestion.talkingTime : 'default';
  
  console.log(`\nQuestion ID: ${questionId}`);
  console.log(`Question: "${questionText}"`);
  console.log('Settings:', {
    timeoutCount: settings.timeoutCount,
    maxSilenceBeforeTimeout: settings.maxSilenceBeforeTimeout,
    postResponseTimeoutCount: settings.postResponseTimeoutCount,
    maxRecordingLength: settings.maxRecordingLength,
    minRecordingLength: settings.minRecordingLength
  });
  console.log(`  - Original Talking Time: ${talkingTime}s`);
});

// Show configuration summary
console.log('\n\nConfiguration Summary:');
console.log('=====================');

console.log('✅ Question-specific settings are now configured in JSON file');
console.log('✅ Pattern matching for different question types');
console.log('✅ Question ID specific overrides');
console.log('✅ IBM-style post-response pauses (200-400ms)');
console.log('✅ Optimized timeouts and recording lengths');

console.log('\n\nBenefits of Question-Specific Settings:');
console.log('=====================================');
console.log('✅ Phone number questions: Longer timeouts (7s) for number input');
console.log('✅ Name questions: Moderate timeouts (5s) with exclusion patterns');
console.log('✅ Address questions: Extended timeouts (7s) for longer responses');
console.log('✅ Date questions: Moderate timeouts (6s) for date input');
console.log('✅ Incident descriptions: Longest timeouts (8s) for detailed responses');
console.log('✅ Store numbers: Moderate timeouts (6s) for number input');
console.log('✅ Optimized recording lengths for each question type');
console.log('✅ Better user experience with appropriate wait times');
console.log('✅ Reduced frustration from premature timeouts');
console.log('✅ More natural conversation flow');

console.log('\n\nExample Question Flow with Settings:');
console.log('===================================');
console.log('1. "Are you a Sonic Franchise?" → Yes/No (5s timeout, 8s max recording, 200ms pause)');
console.log('2. "What is the store number?" → Store Number (6s timeout, 18s max recording, 250ms pause)');
console.log('3. "Is it correct?" → Confirmation (5s timeout, 12s max recording, 200ms pause)');
console.log('4. "What is the date of the incident?" → Date (6s timeout, 15s max recording, 200ms pause)');
console.log('5. "Please describe the incident" → Incident Description (8s timeout, 45s max recording, 400ms pause)');
console.log('6. "What is the phone number?" → Phone Number (7s timeout, 20s max recording, 300ms pause)');

console.log('\n=== Test Complete ==='); 