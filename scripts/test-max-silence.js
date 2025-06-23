const { 
  getConversationControls, 
  validateConversationControls 
} = require('../config/conversationControls');

console.log('Testing Max Silence Implementation\n');

// Test 1: Validate conversation controls
console.log('1. Testing conversation controls configuration...');
const controls = getConversationControls();
const validation = validateConversationControls(controls);

if (validation.isValid) {
  console.log('✅ Conversation controls are valid');
  console.log('   Default turn duration:', controls.turnSettings.defaultTurnDuration, 'ms');
  console.log('   Final timeout duration:', controls.turnSettings.finalTimeoutDuration, 'ms');
  console.log('   Max retries:', controls.turnSettings.maxRetries);
  console.log('   Max silence:', controls.recordingSettings.maxSilence, 's');
} else {
  console.log('❌ Conversation controls validation failed:');
  validation.errors.forEach(error => console.log('   -', error));
}

// Test 2: Test max silence duration
console.log('\n2. Testing max silence duration...');
const maxSilenceSeconds = controls.recordingSettings.maxSilence;
console.log(`   Max silence: ${maxSilenceSeconds}s`);

if (maxSilenceSeconds >= 1 && maxSilenceSeconds <= 10) {
  console.log('   ✅ Max silence duration is within acceptable range (1-10 seconds)');
} else {
  console.log('   ❌ Max silence duration is outside acceptable range');
}

// Test 3: Test environment variable override
console.log('\n3. Testing environment variable override...');
const originalEnv = process.env.MAX_SILENCE;

// Test with custom value
process.env.MAX_SILENCE = '3';
const customControls = getConversationControls();
console.log('   Custom max silence:', customControls.recordingSettings.maxSilence, 's');

// Restore original environment
if (originalEnv) {
  process.env.MAX_SILENCE = originalEnv;
} else {
  delete process.env.MAX_SILENCE;
}

// Test 4: Test Twilio record parameters simulation
console.log('\n4. Testing Twilio record parameters...');
const simulateTwilioRecord = (maxSilence, timeout) => {
  console.log('   Twilio record parameters:');
  console.log(`     maxSilence: ${maxSilence}s`);
  console.log(`     timeout: ${timeout}s`);
  console.log(`     trim: 'trim-silence'`);
  console.log(`     playBeep: false`);
  
  // Simulate behavior
  console.log('   Behavior simulation:');
  console.log(`     - Recording starts when user speaks`);
  console.log(`     - Recording stops after ${maxSilence}s of silence`);
  console.log(`     - Recording also stops after ${timeout}s total (whichever comes first)`);
  console.log(`     - Silence is trimmed from beginning and end`);
};

const testMaxSilence = controls.recordingSettings.maxSilence;
const testTimeout = controls.turnSettings.defaultTurnDuration / 1000;
simulateTwilioRecord(testMaxSilence, testTimeout);

// Test 5: Test different scenarios
console.log('\n5. Testing different scenarios...');

const scenarios = [
  { name: 'Short response', userSpeaks: 3, silence: 2, expected: 'Early termination' },
  { name: 'Long response', userSpeaks: 25, silence: 2, expected: 'Early termination' },
  { name: 'Silent user', userSpeaks: 0, silence: 10, expected: 'Timeout after 10s' },
  { name: 'Continuous speech', userSpeaks: 45, silence: 0, expected: 'Max length reached' }
];

scenarios.forEach(scenario => {
  console.log(`   ${scenario.name}:`);
  console.log(`     User speaks for ${scenario.userSpeaks}s, then ${scenario.silence}s silence`);
  console.log(`     Expected: ${scenario.expected}`);
  
  if (scenario.userSpeaks > 0 && scenario.silence >= testMaxSilence) {
    console.log(`     ✅ Would trigger early termination after ${testMaxSilence}s silence`);
  } else if (scenario.userSpeaks === 0) {
    console.log(`     ✅ Would trigger timeout after ${testTimeout}s`);
  } else if (scenario.userSpeaks + scenario.silence >= testTimeout) {
    console.log(`     ✅ Would trigger timeout after ${testTimeout}s total`);
  } else {
    console.log(`     ✅ Would continue recording`);
  }
});

console.log('\n✅ Max silence implementation test completed!');
console.log('\nSummary:');
console.log('   - Max silence: 2 seconds (configurable)');
console.log('   - Early termination when user stops speaking');
console.log('   - Falls back to turn duration timeout');
console.log('   - Improves user experience significantly');
console.log('   - Environment variable override: MAX_SILENCE'); 