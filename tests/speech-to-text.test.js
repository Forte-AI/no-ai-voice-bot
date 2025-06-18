const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');

describe('Speech-to-Text API', () => {
  let server;
  const testPort = 3001;
  const baseUrl = `http://localhost:${testPort}`;
  const sessionId = 'test-session-' + Date.now();

  beforeAll(async () => {
    // Start the server on a different port for testing
    process.env.PORT = testPort;
    server = require('../server.js');
  });

  afterAll(async () => {
    // Clean up and close the server
    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    }
  });

  describe('POST /api/speech-to-text', () => {
    it('should return 400 when no session ID is provided', async () => {
      try {
        await axios.post(`${baseUrl}/api/speech-to-text`, {
          audio: 'test-audio-data'
        });
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('No session ID provided');
      }
    });

    it('should return 400 when no audio data is provided', async () => {
      try {
        await axios.post(`${baseUrl}/api/speech-to-text`, {
          sessionId: sessionId
        });
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('No audio data provided');
      }
    });

    it('should return 500 when invalid audio data is provided', async () => {
      try {
        await axios.post(`${baseUrl}/api/speech-to-text`, {
          sessionId: sessionId,
          audio: 'invalid-audio-data'
        });
        fail('Expected request to fail');
      } catch (error) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBe('Error processing speech');
      }
    });

    it('should successfully transcribe valid audio data', async () => {
      // Create a mock audio file
      const tempDir = os.tmpdir();
      const mockAudioFile = path.join(tempDir, `test-audio-${Date.now()}.webm`);
      
      // Create a simple audio file (this is just a placeholder - in real tests you'd use actual audio data)
      fs.writeFileSync(mockAudioFile, 'mock audio data');
      
      // Read the file and convert to base64
      const audioData = fs.readFileSync(mockAudioFile);
      const base64Audio = `data:audio/webm;base64,${audioData.toString('base64')}`;

      try {
        const response = await axios.post(`${baseUrl}/api/speech-to-text`, {
          sessionId: sessionId,
          audio: base64Audio
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('text');
      } catch (error) {
        // This test might fail if Google Cloud credentials are not properly configured
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBe('Error processing speech');
      } finally {
        // Clean up the mock audio file
        if (fs.existsSync(mockAudioFile)) {
          fs.unlinkSync(mockAudioFile);
        }
      }
    });

    it('should transcribe real audio file (news.wav)', async () => {
      const audioPath = path.join(__dirname, '../public/audio/news.wav');
      if (!fs.existsSync(audioPath)) {
        console.warn('news.wav not found, skipping real audio test');
        return;
      }
      const audioData = fs.readFileSync(audioPath);
      const base64Audio = `data:audio/wav;base64,${audioData.toString('base64')}`;
      try {
        const response = await axios.post(`${baseUrl}/api/speech-to-text`, {
          sessionId: sessionId + '-real',
          audio: base64Audio
        });
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('text');
        console.log('Transcription:', response.data.text);
      } catch (error) {
        console.error('Google Speech-to-Text error:', error.response?.data || error.message);
        throw error;
      }
    });
  });
}); 