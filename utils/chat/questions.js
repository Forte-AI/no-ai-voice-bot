// Load environment variables
require('dotenv').config();

// Debug information
console.log('Current working directory:', process.cwd());
console.log('Environment variables loaded:', Object.keys(process.env));
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);

// Question types
export const QuestionType = {
  YES_NO: 'yes_no',
  NUMERIC: 'numeric',
  TEXT: 'text',
  VALIDATION: 'validation'
};

import { storeData } from './storeData';

const YES_WORDS = ['yes', 'yeah', 'yep', 'yup', 'sure', 'okay', 'ok', 'correct', 'right', 'indeed', 'absolutely', 'definitely', 'certainly'];
const NO_WORDS = ['no', 'nope', 'nah', 'negative', 'not', 'never', 'incorrect', 'wrong'];

// Store retry counts for each question
const retryCounts = new Map();

// Helper function to manage retry counts
const getRetryCount = (questionId) => retryCounts.get(questionId) || 0;
const incrementRetryCount = (questionId) => retryCounts.set(questionId, getRetryCount(questionId) + 1);
const resetRetryCount = (questionId) => retryCounts.set(questionId, 0);

// Question structure
export const questions = [
  {
    id: 1,
    text: `Are you a Sonic Franchise?`,
    type: QuestionType.YES_NO,
    validate: (response) => {
      const isYes = YES_WORDS.some(word => response.toLowerCase().includes(word));
      const isNo = NO_WORDS.some(word => response.toLowerCase().includes(word));
      
      if (isYes) {
        resetRetryCount(1);
        return {
          isValid: true,
          message: `What is the store number, for example, 4 8 9 6?`
        };
      }
      
      if (isNo) {
        return {
          isValid: false,
          message: `No problem. If you are not a Sonic franchise, please visit our website at www.fortis risk.com and submit a claim. That's www.fortis risk.com and submit your claim there. Thank you.`,
          endChat: true
        };
      }
      
      if (getRetryCount(1) >= 2) {
        return {
          isValid: false,
          message: `No problem. If you are not a Sonic franchise, please visit our website at www.fortis risk.com and submit a claim. That's www.fortis risk.com and submit your claim there. Thank you.`,
          endChat: true
        };
      }
      
      incrementRetryCount(1);
      return {
        isValid: false,
        message: "I didn't quite catch that. Are you a Sonic franchise?"
      };
    }
  },
  {
    id: 2,
    type: QuestionType.TEXT,
    validate: (response, storeInfo = null) => {
      // If we have store info from a previous validation, use it
      if (storeInfo) {
        return {
          isValid: true,
          message: `Got it. So, your Sonic store number is ${storeInfo.storeNumber}. Your store, managed by ${storeInfo.storeOwner}, is located at ${storeInfo.storeAddress} ${storeInfo.storeZipCode}. Is it correct?`,
          nextQuestionId: 3
        };
      }

      // Extract potential store numbers from the response
      const potentialNumbers = response.match(/[A-Za-z0-9]{4,7}/g) || [];
      
      // Find the first valid store number
      const validStore = potentialNumbers.find(potentialNumber => 
        storeData.some(store => store.storeNumber === potentialNumber)
      );
      
      if (validStore) {
        const store = storeData.find(store => store.storeNumber === validStore);
        // Reset retry count when valid store number is found
        resetRetryCount(2);
        return {
          isValid: true,
          message: `Got it. So, your Sonic store number is ${validStore}. Your store, managed by ${store.storeOwner}, is located at ${store.storeAddress} ${store.storeZipCode}. Is it correct?`,
          nextQuestionId: 3,
          storeInfo: {
            storeNumber: validStore,
            storeOwner: store.storeOwner,
            storeAddress: store.storeAddress,
            storeZipCode: store.storeZipCode
          }
        };
      }
      
      if (getRetryCount(2) >= 2) {
        return {
          isValid: false,
          message: `No problem, please visit our website at www.fortis risk.com and submit a claim. Again, that's www.fortis risk.com and submit your claim there. Thank you.`,
          endChat: true
        };
      }
      
      incrementRetryCount(2);
      return {
        isValid: false,
        message: "I couldn't find your store number in our system. Can you tell me the Sonic store number again?"
      };
    }
  },
  {
    id: 3,
    type: QuestionType.YES_NO,
    validate: (response, storeInfo) => {
      const isYes = YES_WORDS.some(word => response.toLowerCase().includes(word));
      const isNo = NO_WORDS.some(word => response.toLowerCase().includes(word));
      
      if (isYes) {
        return {
          isValid: true,
          message: `What is the date of the incident?`,
          nextQuestionId: 4
        };
      }
      
      if (isNo) {
        return {
          isValid: false,
          message: `What is the store number, for example, 1 2 9 6?`,
          nextQuestionId: 1
        };
      }
      
      if (getRetryCount(3) >= 2) {
        return {
          isValid: false,
          message: `No problem, please visit our website at www.fortis risk.com and submit a claim. Again, that's www.fortis risk.com and submit your claim there. Thank you.`,
          endChat: true
        };
      }
      
      incrementRetryCount(3);
      return {
        isValid: false,
        message: "I didn't quite catch that. Is this the correct store number?"
      };
    }
  },
  {
    id: 4,
    type: QuestionType.TEXT,
    validate: async (response) => {
      try {
        console.log('Validating date input:', response);
        
        const apiResponse = await fetch('/api/openai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemMessage: "You are a date validator. You must respond with either a date in YYYY-MM-DD format or the word 'invalid'. Do not include any other text in your response.",
            prompt: `Convert this date to YYYY-MM-DD format or return 'invalid': "${response}"`
          })
        });

        if (!apiResponse.ok) {
          throw new Error('Failed to validate date');
        }

        const { result } = await apiResponse.json();
        console.log('OpenAI response:', result);
        
        const isValid = result !== "invalid";
        
        if (isValid) {
          return {
            isValid: true,
            message: `Thank you! I've recorded the incident date as ${result}. What is your store's phone number?`,
            incidentDate: result
          };
        }
        
        if (getRetryCount(4) >= 2) {
          return {
            isValid: false,
            message: `No problem, please visit our website at www.fortis risk.com and submit a claim. Again, that's www.fortis risk.com and submit your claim there. Thank you.`,
            endChat: true
          };
        }
        
        incrementRetryCount(4);
        return {
          isValid: false,
          message: "Please provide the date in the format 'Month Day, Year' (e.g., 'July 4th, 2025')."
        };
      } catch (error) {
        console.error("Error validating date:", error);
        console.error("Full error details:", {
          message: error.message,
          code: error.code,
          type: error.type,
          stack: error.stack
        });
        
        if (getRetryCount(4) >= 2) {
          return {
            isValid: false,
            message: `No problem, please visit our website at www.fortis risk.com and submit a claim. Again, that's www.fortis risk.com and submit your claim there. Thank you.`,
            endChat: true
          };
        }
        
        incrementRetryCount(4);
        return {
          isValid: false,
          message: "Please provide the date in the format 'Month Day, Year' (e.g., 'July 4th, 2025')."
        };
      }
    }
  },
  {
    id: 5,
    type: QuestionType.TEXT,
    validate: (response) => {
      const isValid = response.length > 0;
      return {
        isValid,
        message: isValid 
          ? "Thank you! Do you offer drive-thru service?"
          : "Please provide your store's operating hours."
      };
    }
  },
  {
    id: 6,
    type: QuestionType.YES_NO,
    validate: (response) => {
      const isYes = YES_WORDS.some(word => response.toLowerCase().includes(word));
      return {
        isValid: true,
        message: isYes 
          ? "Great! Do you have indoor seating?"
          : "Noted. Do you have indoor seating?"
      };
    }
  },
  {
    id: 7,
    type: QuestionType.YES_NO,
    validate: (response) => {
      const isYes = YES_WORDS.some(word => response.toLowerCase().includes(word));
      return {
        isValid: true,
        message: isYes 
          ? "Great! What is your store's manager's name?"
          : "Noted. What is your store's manager's name?"
      };
    }
  },
  {
    id: 8,
    type: QuestionType.TEXT,
    validate: (response) => {
      const isValid = response.length > 0;
      return {
        isValid,
        message: isValid 
          ? "Thank you! What is your store's email address?"
          : "Please provide the store manager's name."
      };
    }
  },
  {
    id: 9,
    type: QuestionType.TEXT,
    validate: (response) => {
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(response);
      return {
        isValid,
        message: isValid 
          ? "Thank you! Do you accept mobile payments?"
          : "Please provide a valid email address."
      };
    }
  },
  {
    id: 10,
    type: QuestionType.YES_NO,
    validate: (response) => {
      const isYes = YES_WORDS.some(word => response.toLowerCase().includes(word));
      return {
        isValid: true,
        message: isYes 
          ? "Great! What is your store's social media handle?"
          : "Noted. What is your store's social media handle?"
      };
    }
  },
  {
    id: 11,
    type: QuestionType.TEXT,
    validate: (response) => {
      const isValid = response.length > 0;
      return {
        isValid,
        message: isValid 
          ? "Thank you! Would you like to receive marketing updates?"
          : "Please provide your store's social media handle."
      };
    }
  },
  {
    id: 12,
    type: QuestionType.YES_NO,
    validate: (response) => {
      const isYes = YES_WORDS.some(word => response.toLowerCase().includes(word));
      return {
        isValid: true,
        message: isYes 
          ? "Great! Thank you for completing the questionnaire. Have a great day!"
          : "Noted. Thank you for completing the questionnaire. Have a great day!"
      };
    }
  }
];

// Helper function to get the next question
export const getNextQuestion = (currentQuestionId, nextQuestionId) => {
  if (nextQuestionId) {
    return questions.find(q => q.id === nextQuestionId) || null;
  }
  const currentIndex = questions.findIndex(q => q.id === currentQuestionId);
  return questions[currentIndex + 1] || null;
};

// Helper function to get the first question
export const getFirstQuestion = () => questions[0];

// Helper function to validate a response
export const validateResponse = (questionId, response, storeInfo = null) => {
  const question = questions.find(q => q.id === questionId);
  if (!question) return { isValid: false, message: "Invalid question." };
  return question.validate(response, storeInfo);
}; 