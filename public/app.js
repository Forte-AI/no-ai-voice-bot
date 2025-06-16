const { useState, useRef, useEffect } = React;

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const [isEnded, setIsEnded] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleUserInput(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setSpeechError(event.error);
        setIsListening(false);
        
        // Show error message to user
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I had trouble understanding you. Please try speaking again or type your message.' 
        }]);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setSpeechError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
    }
  }, []);

  const startChat = async () => {
    setIsStarted(true);
    setIsProcessing(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'START',
          sessionId
        })
      });

      const data = await response.json();
      
      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
        await speakText(data.message);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error starting the chat. Please try again.' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUserInput = async (text) => {
    if (!text.trim() || isEnded || !isStarted) return;

    setIsProcessing(true);
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          sessionId
        })
      });

      const data = await response.json();
      
      if (data.message) {
        // Add assistant message
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
        
        // Convert to speech
        await speakText(data.message);
        
        // Check if chat has ended
        if (data.endChat) {
          setIsEnded(true);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your request. Please try again.' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = async (text) => {
    try {
      console.log('Sending text to TTS:', text);
      const audioRes = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Chirp3-HD-Charon',
            ssmlGender: 'MALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            sampleRateHertz: 24000,
            speakingRate: 1.0,
            pitch: 0.0,
            volumeGainDb: 0.0,
            effectsProfileId: ['headphone-class-device']
          }
        }),
      });

      if (!audioRes.ok) {
        const errorData = await audioRes.json();
        console.error('TTS Error:', errorData);
        throw new Error(errorData.details || 'Failed to generate speech');
      }

      const blob = await audioRes.blob();
      if (blob.size === 0) {
        throw new Error('Received empty audio response');
      }

      console.log('Received audio blob:', blob.size, 'bytes');
      const audio = new Audio(URL.createObjectURL(blob));
      
      audio.onended = () => {
        if (!isEnded) {
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
                setIsListening(true);
              } catch (error) {
                console.error('Error starting speech recognition:', error);
                setSpeechError('Failed to start listening. Please try clicking the Speak button again.');
              }
            }
          }, 500);
        }
      };

      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, there was an error playing the voice response. Please continue with text input.' 
        }]);
      };
      
      await audio.play();
    } catch (err) {
      console.error('Error in speakText:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error with the voice response. Please continue with text input.' 
      }]);
    }
  };

  const toggleListening = () => {
    if (isEnded || !isStarted || isProcessing) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setSpeechError('Failed to start listening. Please try again.');
      }
    }
  };

  if (!isStarted) {
    return (
      <div className="chat-container">
        <div className="start-container">
          <h1>Welcome to the Sonic Claims Assistant</h1>
          <p>Click the button below to start your claim process</p>
          <button 
            onClick={startChat}
            className="start-button"
            disabled={isProcessing}
          >
            {isProcessing ? 'Starting...' : 'Start Claim'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {speechError && (
          <div className="message error">
            {speechError}
          </div>
        )}
      </div>
      <div className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleUserInput(input)}
          placeholder={isEnded ? "Chat has ended" : "Type your message..."}
          disabled={isEnded || isProcessing}
        />
        <button 
          onClick={() => handleUserInput(input)}
          disabled={isEnded || isProcessing}
        >
          Send
        </button>
        <button 
          onClick={toggleListening}
          className={`${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''}`}
          disabled={isEnded || isProcessing}
        >
          {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Speak'}
        </button>
      </div>
    </div>
  );
}

ReactDOM.render(<ChatInterface />, document.getElementById('root')); 