import { getFirstQuestion, getNextQuestion, validateResponse } from './questions';

export class ConversationManager {
  constructor(speakText) {
    this.speakText = speakText;
    this.currentQuestion = null;
  }

  async startConversation() {
    const firstQuestion = getFirstQuestion();
    this.currentQuestion = firstQuestion;
    await this.speakText(firstQuestion.text);
    return {
      role: 'assistant',
      text: firstQuestion.text
    };
  }

  async handleResponse(response) {
    if (!this.currentQuestion || !response.trim()) return null;

    // Validate the response
    const validation = validateResponse(this.currentQuestion.id, response);
    
    // Speak the validation message (which now includes the next question if valid)
    await this.speakText(validation.message);

    // If response is valid, move to next question
    if (validation.isValid) {
      const nextQuestion = getNextQuestion(this.currentQuestion.id);
      if (nextQuestion) {
        this.currentQuestion = nextQuestion;
        return {
          userMessage: { role: 'user', text: response },
          assistantMessage: { role: 'assistant', text: validation.message }
        };
      } else {
        // End of conversation
        this.currentQuestion = null;
        return {
          userMessage: { role: 'user', text: response },
          assistantMessage: { role: 'assistant', text: validation.message }
        };
      }
    }

    // If response is invalid, just return the validation message
    return {
      userMessage: { role: 'user', text: response },
      assistantMessage: { role: 'assistant', text: validation.message }
    };
  }

  getCurrentQuestion() {
    return this.currentQuestion;
  }
} 
 