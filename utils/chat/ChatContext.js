import { createContext, useContext, useState, useCallback } from 'react';
import { ConversationManager } from './ConversationManager';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatContextConsumer = ChatContext.Consumer;

export const ChatProvider = ({ children, speakText }) => {
  const [messages, setMessages] = useState([]);
  const [responses, setResponses] = useState({});
  const [conversationManager] = useState(() => new ConversationManager(speakText));

  const startChat = useCallback(async () => {
    const firstMessage = await conversationManager.startConversation();
    setMessages([firstMessage]);
    setResponses({});
  }, [conversationManager]);

  const handleResponse = useCallback(async (response) => {
    const result = await conversationManager.handleResponse(response);
    if (!result) return;

    // Add user message
    setMessages(prev => [...prev, result.userMessage]);

    // Add assistant response
    setMessages(prev => [...prev, result.assistantMessage]);

    // If there's a next question, add it
    if (result.nextQuestion) {
      setMessages(prev => [...prev, result.nextQuestion]);
    }

    // Store response
    const currentQuestion = conversationManager.getCurrentQuestion();
    if (currentQuestion) {
      setResponses(prev => ({
        ...prev,
        [currentQuestion.id]: {
          response,
          isValid: result.assistantMessage.text.includes('Great') || 
                   result.assistantMessage.text.includes('Thank you')
        }
      }));
    }

    return result;
  }, [conversationManager]);

  const value = {
    currentQuestion: conversationManager.getCurrentQuestion(),
    messages,
    responses,
    startChat,
    handleResponse
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}; 