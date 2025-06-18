// Load environment variables
require('dotenv').config();

// Debug information
console.log('Current working directory:', process.cwd());
console.log('Environment variables loaded:', Object.keys(process.env));
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Question types
const QuestionType = {
  YES_NO: 'yes_no',
  NUMERIC: 'numeric',
  TEXT: 'text',
  VALIDATION: 'validation'
};

const { storeData } = require('./storeData');

const YES_WORDS = ['yes', 'yeah', 'yep', 'yup', 'sure', 'okay', 'ok', 'correct', 'right', 'indeed', 'absolutely', 'definitely', 'certainly'];
const NO_WORDS = ['no', 'nope', 'nah', 'negative', 'not', 'never', 'incorrect', 'wrong'];

// Store retry counts for each question
const retryCounts = new Map();

// Helper function to manage retry counts
const getRetryCount = (questionId) => retryCounts.get(questionId) || 0;
const incrementRetryCount = (questionId) => retryCounts.set(questionId, getRetryCount(questionId) + 1);
const resetRetryCount = (questionId) => retryCounts.set(questionId, 0);

// Helper to format store number for TTS (e.g., 1234 -> 1 2 3 4)
function formatStoreNumberForTTS(storeNumber) {
  return storeNumber.split('').join(' ');
}

// Question structure
const questions = [
  {
    id: 1,
    text: `Are you a Sonic Franchise?`,
    type: QuestionType.YES_NO,
    talkingTime: 3, // Short time for yes/no question
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
    talkingTime: 8, // Longer time for store number input
    validate: async (response, storeInfo = null) => {
      // If we have store info from a previous validation, use it
      if (storeInfo) {
        return {
          isValid: true,
          message: `Got it. So, your Sonic store number is ${formatStoreNumberForTTS(storeInfo.storeNumber)}. Your store, managed by ${storeInfo.storeOwner}, is located at ${storeInfo.storeAddress} ${storeInfo.storeZipCode}. Is it correct?`,
          nextQuestionId: 3
        };
      }

      try {
        console.log('Extracting store number from user input:', response);
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: "You are a store number extractor. You must respond with either a store number or 'invalid'. A store number can be 4 digits (e.g., '2438','1214','9999'), or special formats (e.g., '000WH7', 'MCCA003','2005A'). If you can't find a valid store number, respond with 'invalid'. Do not include any other text in your response."
            },
            {
              role: "user",
              content: `Analyze the user message and extract the store number from it if there is a possible store number. The store number could be 4 digits or a special format. If you can't find a valid store number, respond with 'invalid': "${response}"`
            }
          ]
        });

        const result = completion.choices[0].message.content.trim();
        console.log('OpenAI extracted store number:', result);
        console.log('Original user input:', response);
        
        if (result.toLowerCase() === 'invalid') {
          console.log('OpenAI could not find a valid store number in the input');
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

        // Find the store in our data using the extracted number
        const store = storeData.find(store => 
          store.storeNumber.toLowerCase() === result.toLowerCase()
        );
        
        if (store) {
          // Reset retry count when valid store number is found
          resetRetryCount(2);
          return {
            isValid: true,
            message: `Got it. So, your Sonic store number is ${formatStoreNumberForTTS(store.storeNumber)}. Your store, managed by ${store.storeOwner}, is located at ${store.storeAddress} ${store.storeZipCode}. Is it correct?`,
            nextQuestionId: 3,
            storeInfo: {
              storeNumber: store.storeNumber,
              storeOwner: store.storeOwner,
              storeAddress: store.storeAddress,
              storeZipCode: store.storeZipCode
            }
          };
        }
        
        // If store number format is valid but not found in our data
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
      } catch (error) {
        console.error("Error extracting store number:", error);
        console.error("Full error details:", {
          message: error.message,
          code: error.code,
          type: error.type,
          stack: error.stack
        });
        
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
    }
  },
  {
    id: 3,
    type: QuestionType.YES_NO,
    talkingTime: 3, // Short time for yes/no question
    validate: (response, storeInfo) => {
      const isYes = YES_WORDS.some(word => response.toLowerCase().includes(word));
      const isNo = NO_WORDS.some(word => response.toLowerCase().includes(word));
      
      if (isYes) {
        return {
          isValid: true,
          message: `What is the date of the incident, such as July 4th?`,
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
    talkingTime: 8, // Default time for date input
    validate: async (response) => {
      try {
        console.log('Validating date input:', response);
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: "You are a date validator. You must respond with either 'valid' or 'invalid'. A valid date can be in any common format, for example: month and day (e.g., 'July 4th', 'June 5'), month-day-year (e.g., '6-5-2025', '06/05/2025'), or full date (e.g., 'June 5th, 2025'). Do not include any other text in your response."
            },
            {
              role: "user",
              content: `Does this user message contain a valid date? The date should have at least a month and day, and optionally a year. Respond with only 'valid' or 'invalid': "${response}"`
            }
          ]
        });

        const result = completion.choices[0].message.content.trim();
        console.log('OpenAI response:', result);
        
        const isValid = result.toLowerCase() === "valid";
        
        if (isValid) {
          resetRetryCount(4);
          return {
            isValid: true,
            message: "Please describe the incident in one short sentence.",
            incidentDate: response
          };
        }
      } catch (error) {
        console.error("Error validating date:", error);
        console.error("Full error details:", {
          message: error.message,
          code: error.code,
          type: error.type,
          stack: error.stack
        });
      }
      
      // Handle both invalid dates and API errors with the same retry logic
      if (getRetryCount(4) === 0) {
        incrementRetryCount(4);
        return {
          isValid: false,
          message: "I didn't hear the date properly. What is the date of the incident, such as July 4th?"
        };
      }
      
      // On second attempt, accept whatever they say and move on
      resetRetryCount(4);
      return {
        isValid: true,
        message: "Please describe the incident in one short sentence.",
        incidentDate: response
      };
    }
  },
  {
    id: 5,
    type: QuestionType.TEXT,
    talkingTime: 15, // Longer time for incident description
    validate: async (response) => {
      try {
        console.log('Validating incident description:', response);
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: "You are an incident validator for a fast food restaurant. You must respond with either 'valid' or 'invalid'. A valid incident is something that could reasonably occur in a fast food restaurant setting (e.g., slip and fall, food safety issues, customer complaints, equipment malfunction, etc.). Do not include any other text in your response."
            },
            {
              role: "user",
              content: `Is this a valid incident that could occur in a fast food restaurant? Respond with only 'valid' or 'invalid': "${response}"`
            }
          ]
        });

        const result = completion.choices[0].message.content.trim();
        console.log('OpenAI response:', result);
        
        const isValid = result.toLowerCase() === "valid";
        
        if (isValid) {
          resetRetryCount(5);
          return {
            isValid: true,
            message: "Was the ambulance called?"
          };
        }
        
        // If this is the first invalid attempt, ask for clarification
        if (getRetryCount(5) === 0) {
          incrementRetryCount(5);
          return {
            isValid: false,
            message: "Please provide a clear description of what happened during the incident. For example: 'A customer slipped on a wet floor in the dining area'."
          };
        }
        
        // On second attempt, accept whatever they say and move on
        resetRetryCount(5);
        return {
          isValid: true,
          message: "Got it. Did you call ambulance?"
        };
      } catch (error) {
        console.error("Error validating incident:", error);
        console.error("Full error details:", {
          message: error.message,
          code: error.code,
          type: error.type,
          stack: error.stack
        });
        
        // If this is the first error, try again
        if (getRetryCount(5) === 0) {
          incrementRetryCount(5);
          return {
            isValid: false,
            message: "Please provide a clear description of what happened during the incident. For example: 'A customer slipped on a wet floor in the dining area' or 'The drive-thru speaker system malfunctioned'."
          };
        }
        
        // On second error, accept whatever they say and move on
        resetRetryCount(5);
        return {
          isValid: true,
          message: "Did you call ambulance?"
        };
      }
    }
  },
  {
    id: 6,
    type: QuestionType.YES_NO,
    talkingTime: 3, // Short time for yes/no question
    validate: (response) => {
      const isYes = YES_WORDS.some(word => response.toLowerCase().includes(word));
      const isNo = NO_WORDS.some(word => response.toLowerCase().includes(word));
      
      if (isYes || isNo) {
        return {
          isValid: true,
          message: "Please ensure the preservation of both the video footage and witness statements. What is the name of the person involved in the incident?"
        };
      }
      
      // If response is unclear, give one retry
      if (getRetryCount(6) === 0) {
        incrementRetryCount(6);
        return {
          isValid: false,
          message: "Sorry, I didn't catch that. Was the ambulance called?"
        };
      }
      
      // On second attempt, accept whatever they say and move to person's name
      resetRetryCount(6);
      return {
        isValid: true,
        message: "Please ensure the preservation of both the video footage and witness statements. What is the name of the person involved in the incident?"
      };
    }
  },
  {
    id: 7,
    type: QuestionType.TEXT,
    talkingTime: 10, // Default time for name input
    validate: async (response) => {
      try {
        console.log('Validating person name:', response);
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: "You are a name validator. You must respond with either 'valid' or 'invalid'. A valid name should be a reasonable human name (e.g., 'Jim', 'Lucy', 'Robert Johnson', 'John Smith', 'Maria Garcia'). Do not include any other text in your response."
            },
            {
              role: "user",
              content: `Does this user message contain a valid name? Respond with only 'valid' or 'invalid': "${response}"`
            }
          ]
        });

        const result = completion.choices[0].message.content.trim();
        console.log('OpenAI response:', result);
        
        const isValid = result.toLowerCase() === "valid";
        
        if (isValid) {
          resetRetryCount(7);
          return {
            isValid: true,
            message: "Got it, and what is the phone number of the person involved in the incident?"
          };
        }
      } catch (error) {
        console.error("Error validating name:", error);
        console.error("Full error details:", {
          message: error.message,
          code: error.code,
          type: error.type,
          stack: error.stack
        });
      }
      
      // Handle both invalid names and API errors with the same retry logic
      if (getRetryCount(7) === 0) {
        incrementRetryCount(7);
        return {
          isValid: false,
          message: "Could you provide the name of the person involved in the incident?"
        };
      }
      
      // On second attempt, accept whatever they say and move to phone number
      resetRetryCount(7);
      return {
        isValid: true,
        message: "Got it. What is the phone number of the person involved in the incident?"
      };
    }
  },
  {
    id: 8,
    type: QuestionType.TEXT,
    talkingTime: 10, // Default time for phone number
    validate: async (response) => {
      try {
        console.log('Validating phone number:', response);
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: "You are a phone number validator. You must respond with either 'valid' or 'invalid'. Do not include any other text in your response."
            },
            {
              role: "user",
              content: `Does this user message contain a valid phone number? Respond with only 'valid' or 'invalid': "${response}"`
            }
          ]
        });

        const result = completion.choices[0].message.content.trim();
        console.log('OpenAI response:', result);
        
        const isValid = result.toLowerCase() === "valid";
        
        if (isValid) {
          resetRetryCount(8);
          return {
            isValid: true,
            message: "Ok. What is the address of the person involved in the incident?"
          };
        }
      } catch (error) {
        console.error("Error validating phone number:", error);
        console.error("Full error details:", {
          message: error.message,
          code: error.code,
          type: error.type,
          stack: error.stack
        });
      }
      
      // Handle both invalid phone numbers and API errors with the same retry logic
      if (getRetryCount(8) === 0) {
        incrementRetryCount(8);
        return {
          isValid: false,
          message: "Could you provide the phone number of the person involved in the incident? If you don't know, please say 'I don't know'."
        };
      }
      
      // On second attempt, accept whatever they say and move to address
      resetRetryCount(8);
      return {
        isValid: true,
        message: "Ok. What is the address of the person involved in the incident?"
      };
    }
  },
  {
    id: 9,
    type: QuestionType.TEXT,
    talkingTime: 10, // Longer time for address input
    validate: async (response) => {
      try {
        console.log('Validating address:', response);
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: "You are an address validator. You must respond with either 'valid' or 'invalid'. A valid address can be a full address (e.g., '123 Main St, City, State 12345'), a partial address with zip code, a common phrase like an address, or responses the user doesn't know the address. Do not include any other text in your response."
            },
            {
              role: "user",
              content: `Does this message contain a valid address or a valid 'don't know' response? Respond with only 'valid' or 'invalid': "${response}"`
            }
          ]
        });

        const result = completion.choices[0].message.content.trim();
        console.log('OpenAI response:', result);
        
        const isValid = result.toLowerCase() === "valid";
        
        if (isValid) {
          resetRetryCount(9);
          return {
            isValid: true,
            message: "Additionally, what is your name or the name of the contact person we can reach out to regarding this incident? This will facilitate prompt communication with the adjustor within the next 24 hours."
          };
        }
      } catch (error) {
        console.error("Error validating address:", error);
        console.error("Full error details:", {
          message: error.message,
          code: error.code,
          type: error.type,
          stack: error.stack
        });
      }
      
      // Handle both invalid addresses and API errors with the same retry logic
      if (getRetryCount(9) === 0) {
        incrementRetryCount(9);
        return {
          isValid: false,
          message: "Please provide the full address of the person involved in the incident. You should include the zip code."
        };
      }
      
      // On second attempt, accept whatever they say and move to contact person
      resetRetryCount(9);
      return {
        isValid: true,
        message: "Additionally, what is your name or the name of the contact person we can reach out to regarding this incident? This will facilitate prompt communication with the adjustor within the next 24 hours."
      };
    }
  },
  {
    id: 10,
    type: QuestionType.TEXT,
    talkingTime: 10, // Longer time for contact info
    validate: async (response) => {
      try {
        console.log('Validating contact name and phone:', response);
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: "You are a name and phone number validator. You must respond with either 'valid_name', 'valid_with_phone', or 'invalid'. A valid name should be a reasonable human name (e.g., 'Jim', 'Lucy', 'Robert Johnson'). A valid phone number should be in a common format (e.g., '123-456-7890', '(123) 456-7890', '1234567890'). If the input contains both a valid name and phone number, respond with 'valid_with_phone'. Do not include any other text in your response."
            },
            {
              role: "user",
              content: `Does this user message contain a valid name and optionally a phone number? Respond with only 'valid_name', 'valid_with_phone', or 'invalid': "${response}"`
            }
          ]
        });

        const result = completion.choices[0].message.content.trim();
        console.log('OpenAI response:', result);
        
        const responseType = result.toLowerCase();
        
        if (responseType === 'valid_with_phone') {
          resetRetryCount(10);
          return {
            isValid: true,
            message: "You're all set. Please keep any documents, security video, photos, customer receipts and any other information essential to this claim. You will need to preserve this evidence and send all of it to the adjuster when they contact you. Bye.",
            endChat: true
          };
        }
        
        if (responseType === 'valid_name') {
          resetRetryCount(10);
          return {
            isValid: true,
            message: "Ok, and what is the best phone number we can reach out to?"
          };
        }
      } catch (error) {
        console.error("Error validating name and phone:", error);
        console.error("Full error details:", {
          message: error.message,
          code: error.code,
          type: error.type,
          stack: error.stack
        });
      }
      
      // Handle both invalid names and API errors with the same retry logic
      if (getRetryCount(10) === 0) {
        incrementRetryCount(10);
        return {
          isValid: false,
          message: "Could you provide your name or the name of the person we can reach out to regarding this incident. This will facilitate prompt communication with the adjustor within the next 24 hours."
        };
      }
      
      // On second attempt, accept whatever they say and move to phone number
      resetRetryCount(10);
      return {
        isValid: true,
        message: "Thank you, and what is the best phone number we can reach out to?"
      };
    }
  },
  {
    id: 11,
    type: QuestionType.TEXT,
    talkingTime: 10, // Default time for phone number
    validate: async (response) => {
      try {
        console.log('Validating phone number:', response);
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: "You are a phone number validator. You must respond with either 'valid' or 'invalid'. Do not include any other text in your response."
            },
            {
              role: "user",
              content: `Does this user message contain a valid phone number? Respond with only 'valid' or 'invalid': "${response}"`
            }
          ]
        });

        const result = completion.choices[0].message.content.trim();
        console.log('OpenAI response:', result);
        
        const isValid = result.toLowerCase() === "valid";
        
        if (isValid) {
          resetRetryCount(11);
          return {
            isValid: true,
            message: "You're all set. Please keep any documents, security video, photos, customer receipts and any other information essential to this claim. You will need to preserve this evidence and send all of it to the adjuster when they contact you. Bye.",
            endChat: true
          };
        }
      } catch (error) {
        console.error("Error validating phone number:", error);
        console.error("Full error details:", {
          message: error.message,
          code: error.code,
          type: error.type,
          stack: error.stack
        });
      }
      
      // Handle both invalid phone numbers and API errors with the same retry logic
      if (getRetryCount(11) === 0) {
        incrementRetryCount(11);
        return {
          isValid: false,
          message: "We need a phone number so our adjuster can follow up. Please provide the best phone number we can reach you at."
        };
      }
      
      // On second attempt, accept whatever they say and end chat
      resetRetryCount(11);
      return {
        isValid: true,
        message: "You're all set. Please keep any documents, security video, photos, customer receipts and any other information essential to this claim. You will need to preserve this evidence and send all of it to the adjuster when they contact you. Bye.",
        endChat: true
      };
    }
  }
];

// Helper function to get the next question
const getNextQuestion = (currentQuestionId, nextQuestionId) => {
  if (nextQuestionId) {
    return questions.find(q => q.id === nextQuestionId) || null;
  }
  const currentIndex = questions.findIndex(q => q.id === currentQuestionId);
  return questions[currentIndex + 1] || null;
};

// Helper function to get the first question
const getFirstQuestion = () => questions[0];

// Helper function to validate a response
const validateResponse = (questionId, response, storeInfo = null) => {
  const question = questions.find(q => q.id === questionId);
  if (!question) return { isValid: false, message: "Invalid question." };
  return question.validate(response, storeInfo);
};

module.exports = {
  QuestionType,
  questions,
  getNextQuestion,
  getFirstQuestion,
  validateResponse
}; 