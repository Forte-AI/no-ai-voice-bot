const { 
  getConversationControls, 
  getTurnDurationForQuestion,
  getQuestionSettingsFromConfig,
  validateConversationControls 
} = require('../config/conversationControls');

console.log('Testing Simplified Timeout Configuration\n');

// Test 1: Validate conversation controls
console.log('1. Testing conversation controls validation...');
const controls = getConversationControls();
const validation = validateConversationControls(controls);

if (validation.isValid) {
  console.log('✅ Conversation controls are valid');
  console.log('   Default turn duration:', controls.turnSettings.defaultTurnDuration, 'ms');
  console.log('   Final timeout duration:', controls.turnSettings.finalTimeoutDuration, 'ms');
  console.log('   Max retries:', controls.turnSettings.maxRetries);
} else {
  console.log('❌ Conversation controls validation failed:');
  validation.errors.forEach(error => console.log('   -', error));
}

// Test 2: Test turn duration for specific questions
console.log('\n2. Testing turn duration for specific questions...');
const questionIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

questionIds.forEach(questionId => {
  const turnDuration = getTurnDurationForQuestion(questionId);
  console.log(`   Question ${questionId}: ${turnDuration}ms (${turnDuration/1000}s)`);
});

// Test 3: Test question-specific settings
console.log('\n3. Testing question-specific settings...');
const testQuestions = [
  { id: 1, text: 'Are you a Sonic Franchise?' },
  { id: 2, text: 'What is the store number?' },
  { id: 5, text: 'Please describe the incident' },
  { id: 8, text: 'What is the phone number?' }
];

testQuestions.forEach(question => {
  const settings = getQuestionSettingsFromConfig(question.text, question.id, {
    turnDuration: controls.turnSettings.defaultTurnDuration,
    maxLength: controls.recordingSettings.maxLength,
    minLength: controls.recordingSettings.minLength
  });
  
  console.log(`   Question ${question.id} ("${question.text}"):`);
  console.log(`     Turn duration: ${settings.turnDuration}ms`);
  console.log(`     Max recording length: ${settings.maxLength}s`);
  console.log(`     Min recording length: ${settings.minLength}s`);
});

// Test 4: Test pattern matching
console.log('\n4. Testing pattern matching...');
const patternTests = [
  'What is your phone number?',
  'When did this happen?',
  'What is your name?',
  'What is your address?',
  'What is the store number?',
  'Please describe what happened'
];

patternTests.forEach(text => {
  const settings = getQuestionSettingsFromConfig(text, null, {
    turnDuration: controls.turnSettings.defaultTurnDuration,
    maxLength: controls.recordingSettings.maxLength,
    minLength: controls.recordingSettings.minLength
  });
  
  console.log(`   "${text}":`);
  console.log(`     Turn duration: ${settings.turnDuration}ms`);
  console.log(`     Max recording length: ${settings.maxLength}s`);
});

console.log('\n✅ Simplified timeout configuration test completed!'); 