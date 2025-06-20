#!/usr/bin/env node

/**
 * Test script for phone call flow
 * 
 * This script simulates a complete phone call to verify that
 * the question progression works correctly in the actual phone flow.
 */

const { getFirstQuestion, validateResponse, questions } = require('../utils/chat/questions');

console.log('📞 Testing Phone Call Flow\n');

// Simulate a complete phone call
const simulatePhoneCall = async () => {
  console.log('🚀 Starting phone call simulation...\n');
  
  // Initialize session state (like twilioHandler does)
  let session = {
    currentQuestionId: 1,
    storeInfo: null,
    incidentDate: null,
    conversationState: {
      turnCount: 0,
      retryCount: 0
    }
  };
  
  // Test responses that should work with the actual store data
  const testResponses = [
    { questionId: 1, response: "yes", expectedNextId: 2, description: "User confirms they are a Sonic franchise" },
    { questionId: 2, response: "2438", expectedNextId: 3, description: "User provides store number 2438 (should be in store data)" },
    { questionId: 3, response: "yes", expectedNextId: 4, description: "User confirms store information is correct" },
    { questionId: 4, response: "July 4th", expectedNextId: 5, description: "User provides incident date" },
    { questionId: 5, response: "A customer slipped on a wet floor", expectedNextId: 6, description: "User describes the incident" },
    { questionId: 6, response: "no", expectedNextId: 7, description: "User says no ambulance was called" },
    { questionId: 7, response: "John Smith", expectedNextId: 8, description: "User provides person's name" },
    { questionId: 8, response: "555-123-4567", expectedNextId: 9, description: "User provides phone number" },
    { questionId: 9, response: "123 Main St, City, State 12345", expectedNextId: 10, description: "User provides address" },
    { questionId: 10, response: "Jane Doe", expectedNextId: 11, description: "User provides contact name" },
    { questionId: 11, response: "555-987-6543", expectedNextId: null, description: "User provides contact phone number" }
  ];
  
  console.log('📋 Phone Call Flow Test:');
  console.log('=' .repeat(60));
  
  for (let i = 0; i < testResponses.length; i++) {
    const testCase = testResponses[i];
    const question = questions.find(q => q.id === testCase.questionId);
    
    console.log(`\n🎯 Turn ${i + 1}: ${testCase.description}`);
    console.log(`📋 Question ${testCase.questionId}: ${question ? question.text : 'Unknown question'}`);
    console.log(`🎤 User: "${testCase.response}"`);
    console.log(`📊 Session state:`, {
      currentQuestionId: session.currentQuestionId,
      turnCount: session.conversationState.turnCount,
      retryCount: session.conversationState.retryCount
    });
    
    // Simulate validation (like twilioHandler does)
    try {
      const validationResult = await validateResponse(testCase.questionId, testCase.response, session.storeInfo);
      
      console.log(`🤖 Bot response: "${validationResult.message}"`);
      console.log(`✅ Validation:`, {
        isValid: validationResult.isValid,
        nextQuestionId: validationResult.nextQuestionId,
        endChat: validationResult.endChat
      });
      
      if (validationResult.isValid) {
        // Update session state (like twilioHandler does)
        session.conversationState.turnCount++;
        session.conversationState.retryCount = 0;
        
        if (validationResult.storeInfo) {
          session.storeInfo = validationResult.storeInfo;
          console.log(`📝 Store info updated:`, session.storeInfo);
        }
        if (validationResult.incidentDate) {
          session.incidentDate = validationResult.incidentDate;
          console.log(`📅 Incident date updated:`, session.incidentDate);
        }
        if (validationResult.nextQuestionId) {
          session.currentQuestionId = validationResult.nextQuestionId;
          console.log(`🔄 Moving to question ${validationResult.nextQuestionId}`);
        }
        
        if (validationResult.endChat) {
          console.log(`🏁 Call completed successfully!`);
          break;
        }
        
        // Verify progression
        if (session.currentQuestionId === testCase.expectedNextId) {
          console.log(`✅ Progression correct: ${testCase.questionId} → ${session.currentQuestionId}`);
        } else {
          console.log(`❌ Progression incorrect: expected ${testCase.expectedNextId}, got ${session.currentQuestionId}`);
        }
      } else {
        console.log(`❌ Validation failed: ${validationResult.message}`);
        session.conversationState.retryCount++;
      }
    } catch (error) {
      console.error(`❌ Error during validation:`, error.message);
      session.conversationState.retryCount++;
    }
  }
  
  console.log('\n📊 Final call summary:');
  console.log(JSON.stringify(session, null, 2));
  
  return session;
};

// Test error scenarios
const testErrorScenarios = async () => {
  console.log('\n🔄 Testing Error Scenarios...\n');
  
  let session = {
    currentQuestionId: 1,
    conversationState: {
      turnCount: 0,
      retryCount: 0
    }
  };
  
  // Test invalid responses that should trigger retries
  const errorScenarios = [
    { questionId: 1, response: "maybe", expectedBehavior: "retry" },
    { questionId: 1, response: "yes", expectedBehavior: "proceed" }
  ];
  
  for (const scenario of errorScenarios) {
    console.log(`\n🎯 Testing: "${scenario.response}" for question ${scenario.questionId}`);
    
    try {
      const result = await validateResponse(scenario.questionId, scenario.response);
      
      if (result.isValid) {
        session.currentQuestionId = result.nextQuestionId || session.currentQuestionId;
        session.conversationState.retryCount = 0;
        console.log(`✅ Valid response, proceeding to question ${session.currentQuestionId}`);
      } else {
        session.conversationState.retryCount++;
        console.log(`❌ Invalid response, retry count: ${session.conversationState.retryCount}`);
      }
    } catch (error) {
      console.error(`❌ Error:`, error.message);
    }
  }
};

// Run the tests
const runPhoneCallTests = async () => {
  try {
    console.log('🧪 Phone Call Flow Test Suite\n');
    
    // Test 1: Complete successful call
    console.log('📞 Test 1: Complete Successful Call');
    console.log('-'.repeat(40));
    await simulatePhoneCall();
    
    // Test 2: Error handling
    console.log('\n📞 Test 2: Error Handling');
    console.log('-'.repeat(40));
    await testErrorScenarios();
    
    console.log('\n✨ Phone call flow tests completed!');
    console.log('\nKey findings:');
    console.log('  - Question progression should work correctly');
    console.log('  - Session state should be maintained throughout the call');
    console.log('  - Error handling should work properly');
    console.log('  - Call should complete successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

runPhoneCallTests(); 