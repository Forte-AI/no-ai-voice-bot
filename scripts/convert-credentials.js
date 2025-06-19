#!/usr/bin/env node

/**
 * Google Cloud Credentials Converter
 * Converts google-cloud-key.json to base64 and individual environment variables
 */

const fs = require('fs');
const path = require('path');

function convertCredentials() {
  console.log('🔧 Google Cloud Credentials Converter\n');
  
  const keyFile = path.join(__dirname, '..', 'google-cloud-key.json');
  
  if (!fs.existsSync(keyFile)) {
    console.error('❌ google-cloud-key.json not found in project root');
    console.log('Please ensure your Google Cloud service account key file is in the project root directory.');
    return;
  }
  
  try {
    // Read the JSON file
    const credentials = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    
    // Convert to base64
    const base64Credentials = Buffer.from(JSON.stringify(credentials)).toString('base64');
    
    console.log('✅ Successfully converted credentials!\n');
    
    // Display base64 string
    console.log('📋 Base64 Credentials (for GOOGLE_CREDENTIALS_BASE64):');
    console.log('```');
    console.log(base64Credentials);
    console.log('```\n');
    
    // Display individual environment variables
    console.log('📋 Individual Environment Variables:');
    console.log('```env');
    console.log(`GOOGLE_PROJECT_ID=${credentials.project_id}`);
    console.log(`GOOGLE_PRIVATE_KEY_ID=${credentials.private_key_id}`);
    console.log(`GOOGLE_PRIVATE_KEY="${credentials.private_key}"`);
    console.log(`GOOGLE_CLIENT_EMAIL=${credentials.client_email}`);
    console.log(`GOOGLE_CLIENT_ID=${credentials.client_id}`);
    console.log(`GOOGLE_CLIENT_CERT_URL=${credentials.client_x509_cert_url}`);
    console.log('```\n');
    
    // Display Heroku commands
    console.log('🚀 Heroku Commands (Base64 method):');
    console.log('```bash');
    console.log(`heroku config:set GOOGLE_CREDENTIALS_BASE64="${base64Credentials}"`);
    console.log('```\n');
    
    console.log('🚀 Heroku Commands (Individual variables method):');
    console.log('```bash');
    console.log(`heroku config:set GOOGLE_PROJECT_ID=${credentials.project_id}`);
    console.log(`heroku config:set GOOGLE_PRIVATE_KEY_ID=${credentials.private_key_id}`);
    console.log(`heroku config:set GOOGLE_PRIVATE_KEY="${credentials.private_key}"`);
    console.log(`heroku config:set GOOGLE_CLIENT_EMAIL=${credentials.client_email}`);
    console.log(`heroku config:set GOOGLE_CLIENT_ID=${credentials.client_id}`);
    console.log(`heroku config:set GOOGLE_CLIENT_CERT_URL=${credentials.client_x509_cert_url}`);
    console.log('```\n');
    
    console.log('💡 Note: Your code supports both methods:');
    console.log('   - Base64 method (GOOGLE_CREDENTIALS_BASE64)');
    console.log('   - Individual variables method (GOOGLE_PROJECT_ID, etc.)');
    console.log('\n   Choose whichever method you prefer!');
    
  } catch (error) {
    console.error('❌ Error processing credentials:', error.message);
  }
}

convertCredentials(); 