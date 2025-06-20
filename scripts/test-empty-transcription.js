#!/usr/bin/env node

/**
 * Test script for empty transcription handling
 * 
 * This script tests how the system handles empty transcriptions
 * by sending an empty space " " to validation instead of showing
 * an immediate error message.
 */

const { validateResponse, questions } = require('../utils/chat/questions');

console.log('🔇 Testing Empty Transcription Handling\n');

// Test empty transcription handling for different questions
const testEmptyTranscription = async () => {
  console.log('📋 Testing empty transcription responses...\n');
  
  const testCases = [
    { questionId: 1, description: "Are you a Sonic Franchise?" },
    { questionId: 2, description: "Store number input" },
    { questionId: 3, description: "Store confirmation" },
    { questionId: 4, description: "Incident date" },
    { questionId: 5, description: "Incident description" },
    { questionId: 6, description: "Ambulance called" },
    { questionId: 7, description: "Person's name" },
    { questionId: 8, description: "Phone number" },
    { questionId: 9, description: "Address" },
    { questionId: 10, description: "Contact name" },
    { questionId: 11, description: "Contact phone" }
  ];
  
  for (const testCase of testCases) {
    console.log(`🎯 Testing Question ${testCase.questionId}: ${testCase.description}`);
    
    try {
      // Test with empty space (simulating empty transcription)
      const emptyResult = await validateResponse(testCase.questionId, " ");
      
      console.log(`  📤 Input: " " (empty space)`);
      console.log(`  📥 Response: "${emptyResult.message}"`);
      console.log(`  ✅ Valid: ${emptyResult.isValid}`);
      console.log(`  🔄 Next Question: ${emptyResult.nextQuestionId || 'None'}`);
      console.log(`  🏁 End Chat: ${emptyResult.endChat || false}`);
      
      // Test with actual empty string for comparison
      const emptyStringResult = await validateResponse(testCase.questionId, "");
      
      console.log(`  📤 Input: "" (empty string)`);
      console.log(`  📥 Response: "${emptyStringResult.message}"`);
      console.log(`  ✅ Valid: ${emptyStringResult.isValid}`);
      console.log(`  🔄 Next Question: ${emptyStringResult.nextQuestionId || 'None'}`);
      console.log(`  🏁 End Chat: ${emptyStringResult.endChat || false}`);
      
      console.log(''); // Empty line for readability
      
    } catch (error) {
      console.error(`  ❌ Error testing question ${testCase.questionId}:`, error.message);
    }
  }
};

// Test retry behavior with empty responses
const testRetryBehavior = async () => {
  console.log('🔄 Testing retry behavior with empty responses...\n');
  
  let session = {
    currentQuestionId: 1,
    conversationState: {
      turnCount: 0,
      retryCount: 0
    }
  };
  
  // Simulate multiple empty responses
  const emptyResponses = [" ", " ", "yes"]; // Two empty responses, then a valid one
  
  for (let i = 0; i < emptyResponses.length; i++) {
    const response = emptyResponses[i];
    console.log(`🎯 Attempt ${i + 1}: "${response}"`);
    
    try {
      const result = await validateResponse(session.currentQuestionId, response);
      
      console.log(`  📥 Bot response: "${result.message}"`);
      console.log(`  ✅ Valid: ${result.isValid}`);
      
      if (result.isValid) {
        session.currentQuestionId = result.nextQuestionId || session.currentQuestionId;
        session.conversationState.retryCount = 0;
        session.conversationState.turnCount++;
        console.log(`  🎉 Success! Moving to question ${session.currentQuestionId}`);
        break;
      } else {
        session.conversationState.retryCount++;
        console.log(`  ❌ Invalid response, retry count: ${session.conversationState.retryCount}`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error:`, error.message);
      session.conversationState.retryCount++;
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('📊 Final session state:', JSON.stringify(session, null, 2));
};

// Test comparison with different input types
const testInputComparison = async () => {
  console.log('🔍 Testing input comparison...\n');
  
  const testInputs = [
    { input: " ", description: "Empty space (from empty transcription)" },
    { input: "", description: "Empty string" },
    { input: "   ", description: "Multiple spaces" },
    { input: "yes", description: "Valid response" },
    { input: "maybe", description: "Invalid response" }
  ];
  
  console.log('📋 Question 1: Are you a Sonic Franchise?');
  console.log('-'.repeat(50));
  
  for (const testInput of testInputs) {
    try {
      const result = await validateResponse(1, testInput.input);
      
      console.log(`🎤 Input: "${testInput.input}" (${testInput.description})`);
      console.log(`🤖 Response: "${result.message}"`);
      console.log(`✅ Valid: ${result.isValid}`);
      console.log(`🔄 Next Question: ${result.nextQuestionId || 'None'}`);
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error with input "${testInput.input}":`, error.message);
    }
  }
};

// Run all tests
const runTests = async () => {
  try {
    console.log('🧪 Empty Transcription Test Suite\n');
    
    // Test 1: Empty transcription handling
    console.log('📞 Test 1: Empty Transcription Handling');
    console.log('='.repeat(50));
    await testEmptyTranscription();
    
    // Test 2: Retry behavior
    console.log('📞 Test 2: Retry Behavior');
    console.log('='.repeat(50));
    await testRetryBehavior();
    
    // Test 3: Input comparison
    console.log('📞 Test 3: Input Comparison');
    console.log('='.repeat(50));
    await testInputComparison();
    
    console.log('\n✨ Empty transcription tests completed!');
    console.log('\nKey findings:');
    console.log('  - Empty space " " should be handled gracefully');
    console.log('  - Retry logic should work with empty responses');
    console.log('  - Validation should provide appropriate retry messages');
    console.log('  - Session state should be maintained correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

runTests(); 