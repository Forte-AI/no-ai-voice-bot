/**
 * Test script for the simple JSON configuration system
 * 
 * This shows how easy it is to configure turn settings
 * by just editing a JSON file!
 */

const { getQuestionSettingsFromConfig } = require('../config/conversationControls');

console.log('=== Simple JSON Configuration Test ===\n');

// Test different questions
const testQuestions = [
  {
    id: 1,
    text: "Are you a Sonic Franchise?"
  },
  {
    id: 8,
    text: "What is the phone number of the person involved?"
  },
  {
    id: 4,
    text: "What is the date of the incident?"
  },
  {
    id: 5,
    text: "Please describe the incident in one short sentence."
  },
  {
    id: 9,
    text: "What is the address of the person involved?"
  }
];

console.log('Testing Question-Specific Settings:');
console.log('===================================');

testQuestions.forEach((question, index) => {
  console.log(`\n${index + 1}. Question ID: ${question.id}`);
  console.log(`   Text: "${question.text}"`);
  
  // Get settings using the simple JSON config
  const settings = getQuestionSettingsFromConfig(question.text, question.id, {
    timeoutCount: 5000,
    maxSilenceBeforeTimeout: 3000,
    postResponseTimeoutCount: 12000,
    maxRecordingLength: 30,
    minRecordingLength: 1.0
  });
  
  console.log(`   Settings Applied:`);
  console.log(`     - Timeout: ${settings.timeoutCount}ms (${settings.timeoutCount/1000}s)`);
  console.log(`     - Silence Timeout: ${settings.maxSilenceBeforeTimeout}ms (${settings.maxSilenceBeforeTimeout/1000}s)`);
  console.log(`     - Post Response Timeout: ${settings.postResponseTimeoutCount}ms (${settings.postResponseTimeoutCount/1000}s)`);
  console.log(`     - Max Recording: ${settings.maxRecordingLength}s`);
  console.log(`     - Min Recording: ${settings.minRecordingLength}s`);
});

console.log('\n\nHow to Use This Simple System:');
console.log('=============================');
console.log('1. Edit config/questionSpecificSettings.json');
console.log('2. Add new patterns or question IDs');
console.log('3. Set your desired timeout values');
console.log('4. Save the file - no code changes needed!');
console.log('');
console.log('Example - To add a new pattern:');
console.log('  "new_pattern": {');
console.log('    "patterns": ["your", "keywords"],');
console.log('    "settings": {');
console.log('      "timeoutCount": 8000,');
console.log('      "postResponseTimeoutCount": 15000');
console.log('    }');
console.log('  }');
console.log('');
console.log('Example - To add a specific question ID:');
console.log('  "12": {');
console.log('    "description": "Your question description",');
console.log('    "settings": {');
console.log('      "timeoutCount": 6000,');
console.log('      "postResponseTimeoutCount": 12000');
console.log('    }');
console.log('  }');

console.log('\n=== That\'s it! No complex code needed ==='); 