const speech = require('@google-cloud/speech');
const fs = require('fs');
const https = require('https');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const os = require('os');
const path = require('path');

// Initialize Speech-to-Text client
let speechClient;
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  // Use base64-encoded credentials
  const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString());
  speechClient = new speech.SpeechClient({ credentials });
} else {
  // Use individual environment variables
  speechClient = new speech.SpeechClient({
    credentials: {
      type: "service_account",
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL
    }
  });
}

// Download file from URL
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      // Check if the response is successful
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        // Check if the downloaded file has content
        const stats = fs.statSync(dest);
        if (stats.size === 0) {
          reject(new Error('Downloaded file is empty'));
          return;
        }
        console.log(`Downloaded file size: ${stats.size} bytes`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete the file if there's an error
      reject(err);
    });
  });
}

// Transcribe audio from Twilio recording
async function transcribeAudio(recordingUri) {
  let tempFile = null;
  try {
    // Create a temporary file in the system's temp directory
    const tempDir = os.tmpdir();
    tempFile = path.join(tempDir, `recording-${Date.now()}.wav`);
    
    // Get the media URL from the recording URI
    const mediaUrl = recordingUri.replace('.json', '.mp3');
    
    console.log('Downloading recording from:', mediaUrl);
    console.log('Recording URI:', recordingUri);
    
    // Download the recording from Twilio
    await downloadFile(mediaUrl, tempFile);
    
    console.log('Reading audio file from:', tempFile);
    // Read the file
    const audioBytes = fs.readFileSync(tempFile).toString('base64');
    console.log('Audio file size:', audioBytes.length, 'characters');
    
    // Check if audio file has meaningful content
    if (audioBytes.length < 100) {
      console.log('Audio file too small, likely empty or corrupted');
      return '';
    }
    
    // Configure the request - use the same settings as web version
    const audio = {
      content: audioBytes
    };
    
    // Use the same configuration as the web version for better compatibility
    const config = {
      encoding: 'MP3',
      sampleRateHertz: 16000, // Use 16kHz like web version instead of 8kHz
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: false,
      model: 'phone_call', // Keep phone call model for better accuracy
      useEnhanced: true // Use enhanced model for better accuracy
    };
    
    const request = {
      audio: audio,
      config: config,
    };
    
    console.log('Sending request to Google Speech-to-Text with config:', config);
    // Perform the transcription
    const [response] = await speechClient.recognize(request);
    
    if (!response.results || response.results.length === 0) {
      console.log('No transcription results returned');
      return '';
    }
    
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    
    console.log('Transcription successful:', transcription);
    console.log('Confidence scores:', response.results.map(r => r.alternatives[0].confidence));
    
    return transcription;
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      recordingUri: recordingUri
    });
    
    // Try fallback configuration similar to web version
    if (error.message.includes('encoding') || error.message.includes('sampleRate')) {
      console.log('Trying fallback configuration similar to web version...');
      try {
        const audioBytes = fs.readFileSync(tempFile).toString('base64');
        const fallbackConfig = {
          encoding: 'MP3',
          sampleRateHertz: 24000, // Try 24kHz like web version
          languageCode: 'en-US',
          enableAutomaticPunctuation: true
        };
        
        const fallbackRequest = {
          audio: { content: audioBytes },
          config: fallbackConfig,
        };
        
        const [fallbackResponse] = await speechClient.recognize(fallbackRequest);
        const fallbackTranscription = fallbackResponse.results
          .map(result => result.alternatives[0].transcript)
          .join('\n');
        
        console.log('Fallback transcription successful:', fallbackTranscription);
        return fallbackTranscription;
      } catch (fallbackError) {
        console.error('Fallback transcription also failed:', fallbackError);
        throw error; // Throw original error
      }
    }
    
    throw error;
  } finally {
    // Clean up the temporary file
    if (tempFile && fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
        console.log('Temporary file cleaned up successfully');
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }
    }
  }
}

module.exports = {
  transcribeAudio
}; 