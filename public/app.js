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
  const streamRef = useRef(null);

  const cleanupRecording = () => {
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (error) {
        console.error('Error stopping media recorder:', error);
      }
      mediaRecorderRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    audioChunksRef.current = [];
    setIsListening(false);
  };

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  const startRecording = async () => {
    try {
      cleanupRecording();

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          volume: 1.0
        } 
      });
      
      streamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
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
          setIsListening(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          try {
            console.log('Sending audio data to server for session:', sessionId);
            const response = await fetch('/api/speech-to-text', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                audio: reader.result,
                sessionId: sessionId
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.details || 'Failed to process speech');
            }

            const data = await response.json();
            // If no transcription received or empty transcription, treat it as an empty message
            if (!data.text || data.text.trim() === '') {
              console.log('No transcription received, treating as empty message');
              handleUserInput(' ', true);
            } else {
              handleUserInput(data.text, true);
            }
          } catch (error) {
            console.error('Error processing speech:', error);
            // On error, treat it as an empty message to trigger retry logic
            console.log('Error in speech processing, treating as empty message');
            handleUserInput(' ', true);
          } finally {
            setIsListening(false);
            cleanupRecording();
          }
        };

        reader.readAsDataURL(audioBlob);
      };

      // Get the current question's talking time from the server
      try {
        const response = await fetch(`/api/current-question?sessionId=${sessionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const talkingTime = data.talkingTime || 10; // Default to 10 seconds if not specified
          console.log('Setting talking time to:', talkingTime, 'seconds');
          
          // Clear any existing timeout
          if (mediaRecorderRef.current.silenceTimeout) {
            clearTimeout(mediaRecorderRef.current.silenceTimeout);
          }
          
          // Start recording
          mediaRecorderRef.current.start(1000);
          setIsListening(true);
          setSpeechError(null);
          
          // Set new timeout
          mediaRecorderRef.current.silenceTimeout = setTimeout(() => {
            console.log('Talking time limit reached:', talkingTime, 'seconds');
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
          }, talkingTime * 1000);
        }
      } catch (error) {
        console.error('Error getting question talking time:', error);
        // Fallback to default 10 seconds if there's an error
        mediaRecorderRef.current.start(1000);
        setIsListening(true);
        setSpeechError(null);
        
        // Clear any existing timeout
        if (mediaRecorderRef.current.silenceTimeout) {
          clearTimeout(mediaRecorderRef.current.silenceTimeout);
        }
        
        // Set fallback timeout
        mediaRecorderRef.current.silenceTimeout = setTimeout(() => {
          console.log('Fallback talking time limit reached: 10 seconds');
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, 10000);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setSpeechError('Failed to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      try {
        // Clear the auto-stop timeout if it exists
        if (mediaRecorderRef.current.silenceTimeout) {
          clearTimeout(mediaRecorderRef.current.silenceTimeout);
        }
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error('Error stopping recording:', error);
        setSpeechError('Error stopping recording. Please try again.');
        setIsListening(false);
        cleanupRecording();
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

  const handleUserInput = async (text, bypassChecks = false) => {
    console.log('handleUserInput called with:', text, 'isStarted:', isStarted, 'isEnded:', isEnded, 'bypassChecks:', bypassChecks);
    if (!bypassChecks && (!text.trim() || isEnded || !isStarted)) return;
    setIsProcessing(true);
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
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
        await speakText(data.message);
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
      console.log('Sending text to TTS for session:', sessionId);
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
          },
          sessionId: sessionId
        }),
      });

      if (!audioRes.ok) {
        const errorData = await audioRes.json();
        console.error('TTS Error:', errorData);
        // Instead of throwing error, send empty message
        handleUserInput(' ', true);
        return;
      }

      const blob = await audioRes.blob();
      if (blob.size === 0) {
        console.error('Received empty audio response');
        // Instead of throwing error, send empty message
        handleUserInput(' ', true);
        return;
      }

      console.log('Received audio blob:', blob.size, 'bytes');
      const audio = new Audio(URL.createObjectURL(blob));
      
      audio.onended = () => {
        if (!isEnded) {
          setTimeout(() => {
            startRecording();
          }, 500);
        }
      };

      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        // Instead of showing error message, send empty message
        handleUserInput(' ', true);
      };
      
      await audio.play();
    } catch (err) {
      console.error('Error in speakText:', err);
      // Instead of showing error message, send empty message
      handleUserInput(' ', true);
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