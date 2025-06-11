import { ChatProvider } from '../utils/chat/ChatContext';
import { ChatInterface } from '../components/chat/ChatInterface';
import { useRef } from 'react';

export default function Home() {
  const recognitionRef = useRef(null);

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
      
      // Add event listener for when audio finishes playing
      audio.onended = () => {
        // Small delay before starting recognition to avoid any echo
        setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.start();
          }
        }, 500);
      };
      
      await audio.play();
    } catch (err) {
      console.error('Error playing TTS:', err);
    }
  };

  return (
    <ChatProvider speakText={speakText}>
      <ChatInterface recognitionRef={recognitionRef} />
    </ChatProvider>
  );
}
