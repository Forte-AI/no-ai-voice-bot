const speech = require('@google-cloud/speech');
const fs = require('fs');
const https = require('https');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

// Initialize Speech-to-Text client
const speechClient = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

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
  try {
    // Create a temporary file to store the audio
    const tempFile = `/tmp/recording-${Date.now()}.wav`;
    
    // Get the media URL from the recording URI
    const mediaUrl = recordingUri.replace('.json', '.mp3');
    
    // Download the recording from Twilio
    await downloadFile(mediaUrl, tempFile);
    
    // Read the file
    const audioBytes = fs.readFileSync(tempFile).toString('base64');
    
    // Configure the request
    const audio = {
      content: audioBytes
    };
    
    const config = {
      encoding: 'MP3',  // Changed from LINEAR16 to MP3 since Twilio records in MP3
      sampleRateHertz: 8000,
      languageCode: 'en-US',
    };
    
    const request = {
      audio: audio,
      config: config,
    };
    
    // Perform the transcription
    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    
    // Clean up the temporary file
    fs.unlinkSync(tempFile);
    
    return transcription;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}

module.exports = {
  transcribeAudio
}; 