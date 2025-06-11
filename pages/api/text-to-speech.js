import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import os from 'os';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { input, voice, audioConfig } = req.body;

    if (!input || !input.text) {
      console.error('Missing input text in request body:', req.body);
      res.status(400).json({ error: 'Input text is required' });
      return;
    }

    // Handle credentials for both local development and Vercel deployment
    let credentials;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      // For Vercel deployment
      const keyJson = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString();
      const tempFilePath = path.join(os.tmpdir(), 'google-cloud-key.json');
      fs.writeFileSync(tempFilePath, keyJson);
      credentials = tempFilePath;
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // For local development
      credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    } else {
      throw new Error('Google Cloud credentials not configured');
    }

    // Initialize client with credentials
    const textToSpeechClient = new TextToSpeechClient({
      keyFilename: credentials
    });

    const [response] = await textToSpeechClient.synthesizeSpeech({
      input: input,
      voice: voice,
      audioConfig: audioConfig
    });

    if (!response || !response.audioContent) {
      throw new Error('No audio content received from Google Cloud TTS');
    }

    // Convert the base64 audio content to a buffer
    const audioBuffer = Buffer.from(response.audioContent, 'base64');

    res.setHeader('Content-Type', 'audio/mp3');
    res.send(audioBuffer);
  } catch (error) {
    console.error('Error with Google Cloud TTS:', error);
    res.status(500).json({ 
      error: 'Failed to generate speech',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 