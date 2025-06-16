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
      response.pipe(file);
      file.on('finish', () => {
        file.close();
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
    // Download the recording from Twilio
    await downloadFile(mediaUrl, tempFile);
    
    console.log('Reading audio file from:', tempFile);
    // Read the file
    const audioBytes = fs.readFileSync(tempFile).toString('base64');
    
    // Configure the request
    const audio = {
      content: audioBytes
    };
    
    const config = {
      encoding: 'MP3',
      sampleRateHertz: 8000,
      languageCode: 'en-US',
    };
    
    const request = {
      audio: audio,
      config: config,
    };
    
    console.log('Sending request to Google Speech-to-Text');
    // Perform the transcription
    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    
    console.log('Transcription successful:', transcription);
    return transcription;
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
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