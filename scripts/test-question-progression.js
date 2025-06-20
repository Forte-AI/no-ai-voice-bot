#!/usr/bin/env node

/**
 * Test script for question progression
 * 
 * This script simulates the question flow to test if the session state
 * is properly maintained between questions.
 */

const { getFirstQuestion, validateResponse, questions } = require('../utils/chat/questions');

console.log('🧪 Testing Question Progression\n');

// Simulate a call session
const simulateCallSession = async () => {
  console.log('📞 Simulating call session...\n');
  
  // Initialize session state
  let session = {
    currentQuestionId: 1,
    storeInfo: null,
    incidentDate: null,
    conversationState: {
      turnCount: 0,
      retryCount: 0
    }
  };
  
  // Test responses for each question
  const testResponses = [
    { questionId: 1, response: "yes", expectedNextId: 2 },
    { questionId: 2, response: "4896", expectedNextId: 3 },
    { questionId: 3, response: "yes", expectedNextId: 4 },
    { questionId: 4, response: "July 4th", expectedNextId: 5 },
    { questionId: 5, response: "A customer slipped on a wet floor", expectedNextId: 6 },
    { questionId: 6, response: "no", expectedNextId: 7 },
    { questionId: 7, response: "John Smith", expectedNextId: 8 },
    { questionId: 8, response: "555-123-4567", expectedNextId: 9 },
    { questionId: 9, response: "123 Main St, City, State 12345", expectedNextId: 10 },
    { questionId: 10, response: "Jane Doe", expectedNextId: 11 },
    { questionId: 11, response: "555-987-6543", expectedNextId: null } // End of chat
  ];
  
  console.log('🔄 Testing question progression:');
  console.log('=' .repeat(50));
  
  for (let i = 0; i < testResponses.length; i++) {
    const testCase = testResponses[i];
    const question = questions.find(q => q.id === testCase.questionId);
    
    console.log(`\n📋 Question ${testCase.questionId}: ${question.text}`);
    console.log(`🎤 User response: "${testCase.response}"`);
    console.log(`📊 Current session state:`, {
      currentQuestionId: session.currentQuestionId,
      turnCount: session.conversationState.turnCount,
      retryCount: session.conversationState.retryCount
    });
    
    // Simulate validation
    try {
      const validationResult = await validateResponse(testCase.questionId, testCase.response, session.storeInfo);
      
      console.log(`✅ Validation result:`, {
        isValid: validationResult.isValid,
        message: validationResult.message,
        nextQuestionId: validationResult.nextQuestionId,
        endChat: validationResult.endChat
      });
      
      if (validationResult.isValid) {
        // Update session state
        session.conversationState.turnCount++;
        session.conversationState.retryCount = 0;
        
        if (validationResult.storeInfo) {
          session.storeInfo = validationResult.storeInfo;
        }
        if (validationResult.incidentDate) {
          session.incidentDate = validationResult.incidentDate;
        }
        if (validationResult.nextQuestionId) {
          session.currentQuestionId = validationResult.nextQuestionId;
        }
        
        console.log(`🔄 Updated session state:`, {
          currentQuestionId: session.currentQuestionId,
          storeInfo: session.storeInfo,
          incidentDate: session.incidentDate,
          turnCount: session.conversationState.turnCount
        });
        
        if (validationResult.endChat) {
          console.log(`🏁 Chat ended successfully!`);
          break;
        }
        
        // Verify progression
        if (session.currentQuestionId === testCase.expectedNextId) {
          console.log(`✅ Question progression correct: ${testCase.questionId} → ${session.currentQuestionId}`);
        } else {
          console.log(`❌ Question progression incorrect: expected ${testCase.expectedNextId}, got ${session.currentQuestionId}`);
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
  
  console.log('\n📊 Final session state:');
  console.log(JSON.stringify(session, null, 2));
};

// Test error handling and retries
const testErrorHandling = async () => {
  console.log('\n🔄 Testing error handling and retries...\n');
  
  let session = {
    currentQuestionId: 1,
    conversationState: {
      turnCount: 0,
      retryCount: 0
    }
  };
  
  // Test invalid responses
  const invalidResponses = [
    { questionId: 1, response: "maybe", expectedRetries: 1 },
    { questionId: 1, response: "huh?", expectedRetries: 2 },
    { questionId: 1, response: "yes", expectedRetries: 0 } // Should reset retry count
  ];
  
  for (const testCase of invalidResponses) {
    console.log(`\n🎤 Testing invalid response for question ${testCase.questionId}: "${testCase.response}"`);
    
    try {
      const validationResult = await validateResponse(testCase.questionId, testCase.response);
      
      if (validationResult.isValid) {
        session.conversationState.retryCount = 0;
        session.currentQuestionId = validationResult.nextQuestionId || session.currentQuestionId;
        console.log(`✅ Valid response, retry count reset to 0`);
      } else {
        session.conversationState.retryCount++;
        console.log(`❌ Invalid response, retry count: ${session.conversationState.retryCount}`);
      }
      
      console.log(`📊 Session state:`, {
        currentQuestionId: session.currentQuestionId,
        retryCount: session.conversationState.retryCount
      });
    } catch (error) {
      console.error(`❌ Error:`, error.message);
    }
  }
};

// Test question validation logic
const testQuestionValidation = async () => {
  console.log('\n🔍 Testing question validation logic...\n');
  
  const testCases = [
    {
      questionId: 1,
      responses: [
        { input: "yes", expected: "valid" },
        { input: "yeah", expected: "valid" },
        { input: "no", expected: "end_chat" },
        { input: "maybe", expected: "invalid" }
      ]
    },
    {
      questionId: 2,
      responses: [
        { input: "4896", expected: "valid" },
        { input: "1234", expected: "valid" },
        { input: "invalid", expected: "invalid" }
      ]
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Testing question ${testCase.questionId}:`);
    
    for (const response of testCase.responses) {
      console.log(`  🎤 "${response.input}" → Expected: ${response.expected}`);
      
      try {
        const result = await validateResponse(testCase.questionId, response.input);
        const actual = result.isValid ? (result.endChat ? "end_chat" : "valid") : "invalid";
        
        if (actual === response.expected) {
          console.log(`    ✅ Correct`);
        } else {
          console.log(`    ❌ Incorrect: got ${actual}`);
        }
      } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
      }
    }
  }
};

// Run tests
const runTests = async () => {
  try {
    await simulateCallSession();
    await testErrorHandling();
    await testQuestionValidation();
    
    console.log('\n✨ All tests completed!');
    console.log('\nKey findings:');
    console.log('  - Question progression should work correctly');
    console.log('  - Session state should be maintained between questions');
    console.log('  - Retry logic should handle invalid responses');
    console.log('  - Validation should work for all question types');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

runTests(); 