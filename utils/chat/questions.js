// Question types
export const QuestionType = {
  YES_NO: 'yes_no',
  NUMERIC: 'numeric',
  TEXT: 'text',
  VALIDATION: 'validation'
};

// Question structure
export const questions = [
  {
    id: 1,
    text: "Are you a Sonic Franchise?",
    type: QuestionType.YES_NO,
    validate: (response) => {
      const isYes = response.toLowerCase().includes('yes');
      return {
        isValid: isYes,
        message: isYes 
          ? "Great! What is your store number?"
          : "I'm sorry, but this service is only for Sonic Franchises."
      };
    }
  },
  {
    id: 2,
    text: "What is your store number?",
    type: QuestionType.NUMERIC,
    validate: (response) => {
      const isValid = /^\d{4}$/.test(response);
      return {
        isValid,
        message: isValid 
          ? "Thank you! What is your store's address?"
          : "Please provide a valid 4-digit store number."
      };
    }
  },
  {
    id: 3,
    text: "What is your store's address?",
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
    text: "What is your store's phone number?",
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
    text: "What is your store's operating hours?",
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
    text: "Do you offer drive-thru service?",
    type: QuestionType.YES_NO,
    validate: (response) => {
      const isYes = response.toLowerCase().includes('yes');
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
    text: "Do you have indoor seating?",
    type: QuestionType.YES_NO,
    validate: (response) => {
      const isYes = response.toLowerCase().includes('yes');
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
    text: "What is your store's manager's name?",
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
    text: "What is your store's email address?",
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
    text: "Do you accept mobile payments?",
    type: QuestionType.YES_NO,
    validate: (response) => {
      const isYes = response.toLowerCase().includes('yes');
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
    text: "What is your store's social media handle?",
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
    text: "Would you like to receive marketing updates?",
    type: QuestionType.YES_NO,
    validate: (response) => {
      const isYes = response.toLowerCase().includes('yes');
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
export const validateResponse = (questionId, response) => {
  const question = questions.find(q => q.id === questionId);
  if (!question) return { isValid: false, message: "Invalid question." };
  return question.validate(response);
}; 