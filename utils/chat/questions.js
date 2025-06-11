// Question types
export const QuestionType = {
  YES_NO: 'yes_no',
  NUMERIC: 'numeric',
  TEXT: 'text',
  VALIDATION: 'validation'
};

import { storeData } from './storeData';

const YES_WORDS = ['yes', 'yeah', 'yep', 'yup', 'sure', 'okay', 'ok', 'correct', 'right', 'indeed', 'absolutely', 'definitely', 'certainly'];

// Question structure
export const questions = [
  {
    id: 1,
    text: `Are you a Sonic Franchise?`,
    type: QuestionType.YES_NO,
    validate: (response) => {
      const isYes = YES_WORDS.some(word => response.toLowerCase().includes(word));
      return {
        isValid: isYes,
        message: isYes 
          ? `What is the store number, for example, 4 8 9 6?`
          : `No problem. If you are not a Sonic franchise, please visit our website at www.fortis risk.com and submit a claim. That's www.fortis risk.com and submit your claim there. Thank you.`,
        endChat: !isYes
      };
    }
  },
  {
    id: 2,
    type: QuestionType.TEXT,
    validate: (function() {
      let retryCount = 0;
      return function(response) {
        // Extract potential store numbers from the response
        const potentialNumbers = response.match(/[A-Za-z0-9]{4,7}/g) || [];
        
        // Find the first valid store number
        const validStore = potentialNumbers.find(potentialNumber => 
          storeData.some(store => store.storeNumber === potentialNumber)
        );
        
        if (validStore) {
          const store = storeData.find(store => store.storeNumber === validStore);
          // Reset retry count when valid store number is found
          retryCount = 0;
          return {
            isValid: true,
            message: `Got it. So, your Sonic store number is <say-as interpret-as="digits">${validStore}</say-as>. Your store, managed by ${store.storeOwner}, is located at ${store.storeAddress} ${store.storeZipCode}. Is it correct?`
          };
        }
        
        if (retryCount >= 2) {
          return {
            isValid: false,
            message: `No problem, please visit our website at www.fortis risk.com and submit a claim. Again, that's www.fortis risk.com and submit your claim there. Thank you.`,
            endChat: true
          };
        }
        
        retryCount += 1;
        return {
          isValid: false,
          message: "I couldn't find your store number in our system. Can you tell me the Sonic store number again?"
        };
      };
    })()
  },
  {
    id: 3,
    type: QuestionType.TEXT,
    validate: (response) => {
      const isValid = response.length > 0;
      return {
        isValid,
        message: isValid 
          ? "Thank you! What is your store's phone number?"
          : "Please provide your store's address."
      };
    }
  },
  {
    id: 4,
    type: QuestionType.NUMERIC,
    validate: (response) => {
      const isValid = /^\d{10}$/.test(response.replace(/\D/g, ''));
      return {
        isValid,
        message: isValid 
          ? "Thank you! What is your store's operating hours?"
          : "Please provide a valid 10-digit phone number."
      };
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
export const getNextQuestion = (currentQuestionId) => {
  const currentIndex = questions.findIndex(q => q.id === currentQuestionId);
  return questions[currentIndex + 1] || null;
};

// Helper function to get the first question
export const getFirstQuestion = () => questions[0];

// Helper function to validate a response
export const validateResponse = (questionId, response, retryCount = 0) => {
  const question = questions.find(q => q.id === questionId);
  if (!question) return { isValid: false, message: "Invalid question." };
  return question.validate(response, retryCount);
}; 