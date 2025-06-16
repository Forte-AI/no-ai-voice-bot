const { useState, useRef, useEffect } = React;

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const [isEnded, setIsEnded] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleUserInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startChat = async () => {
    setIsStarted(true);
    // Get the first question from the server
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
    }
  };

  const handleUserInput = async (text) => {
    if (!text.trim() || isEnded || !isStarted) return;

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
    }
  };

  const speakText = async (text) => {
    try {
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
      const blob = await audioRes.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      
      audio.onended = () => {
        if (!isEnded) {
          setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.start();
              setIsListening(true);
            }
          }, 500);
        }
      };
      
      await audio.play();
    } catch (err) {
      console.error('Error playing TTS:', err);
    }
  };

  const toggleListening = () => {
    if (isEnded || !isStarted) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
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
          >
            Start Claim
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
      </div>
      <div className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleUserInput(input)}
          placeholder={isEnded ? "Chat has ended" : "Type your message..."}
          disabled={isEnded}
        />
        <button 
          onClick={() => handleUserInput(input)}
          disabled={isEnded}
        >
          Send
        </button>
        <button 
          onClick={toggleListening}
          className={isListening ? 'listening' : ''}
          disabled={isEnded}
        >
          {isListening ? 'Stop' : 'Speak'}
        </button>
      </div>
    </div>
  );
}

ReactDOM.render(<ChatInterface />, document.getElementById('root')); 