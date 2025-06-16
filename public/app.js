const { useState, useRef, useEffect } = React;

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const [isEnded, setIsEnded] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          sampleSize: 16,
          volume: 1.0
        } 
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 48000
      });
      
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
          console.log('No audio data recorded');
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          try {
            console.log('Sending audio data to server');
            const response = await fetch('/api/speech-to-text', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                audio: reader.result
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.details || 'Failed to process speech');
            }

            const data = await response.json();
            if (data.text) {
              handleUserInput(data.text);
            } else {
              throw new Error('No transcription received');
            }
          } catch (error) {
            console.error('Error processing speech:', error);
            setSpeechError('Failed to process speech. Please try again.');
          }
        };

        reader.readAsDataURL(audioBlob);
      };

      // Start recording with a 1-second interval for data chunks
      mediaRecorderRef.current.start(1000);
      setIsListening(true);
      setSpeechError(null);
    } catch (error) {
      console.error('Error starting recording:', error);
      setSpeechError('Failed to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        setIsListening(false);
      } catch (error) {
        console.error('Error stopping recording:', error);
        setSpeechError('Error stopping recording. Please try again.');
      }
    }
  };

  const toggleListening = () => {
    if (isEnded || !isStarted || isProcessing) return;
    
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

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
          // Start recording after a short delay
          setTimeout(() => {
            startRecording();
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