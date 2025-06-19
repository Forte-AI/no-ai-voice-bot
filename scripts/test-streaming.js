#!/usr/bin/env node

/**
 * Test script for Twilio Streaming Voice Bot
 * 
 * This script demonstrates how to use the streaming approach for real-time voice conversations:
 * 1. Configure your Twilio phone number to use the streaming webhook
 * 2. Make a call to test the real-time voice conversation
 * 
 * Setup Instructions:
 * 1. Deploy your server to a public URL (e.g., ngrok, Heroku, etc.)
 * 2. Configure your Twilio phone number webhook:
 *    - Voice webhook: https://your-domain.com/twilio/incoming
 *    - Status callback: https://your-domain.com/twilio/status
 * 3. Run this script to test the setup
 */

const twilio = require('twilio');

// Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const toNumber = process.env.TEST_PHONE_NUMBER; // Your test phone number

if (!accountSid || !authToken || !fromNumber || !toNumber) {
  console.error('Missing required environment variables:');
  console.error('- TWILIO_ACCOUNT_SID');
  console.error('- TWILIO_AUTH_TOKEN');
  console.error('- TWILIO_PHONE_NUMBER');
  console.error('- TEST_PHONE_NUMBER');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function testStreamingCall() {
  try {
    console.log('Making test call to streaming voice bot...');
    console.log('From:', fromNumber);
    console.log('To:', toNumber);
    
    const call = await client.calls.create({
      url: 'http://demo.twilio.com/docs/voice.xml', // This will be overridden by your webhook
      to: toNumber,
      from: fromNumber,
      statusCallback: 'https://your-domain.com/twilio/status', // Replace with your domain
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });
    
    console.log('Call initiated successfully!');
    console.log('Call SID:', call.sid);
    console.log('Call status:', call.status);
    console.log('\nMonitor the call at: https://console.twilio.com/us1/develop/voice/manage/calls');
    console.log('Call SID for monitoring:', call.sid);
    
  } catch (error) {
    console.error('Error making test call:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      moreInfo: error.moreInfo
    });
  }
}

// Instructions for setup
console.log('=== Twilio Streaming Voice Bot Test ===\n');

console.log('Before running this test, make sure to:');
console.log('1. Deploy your server to a public URL (e.g., ngrok, Heroku, etc.)');
console.log('2. Configure your Twilio phone number webhook:');
console.log('   - Voice webhook: https://your-domain.com/twilio/incoming');
console.log('   - Status callback: https://your-domain.com/twilio/status');
console.log('3. Update the statusCallback URL in this script with your actual domain');
console.log('4. Set TEST_PHONE_NUMBER environment variable to your test phone number\n');

console.log('Current configuration:');
console.log('- Account SID:', accountSid ? '✓ Set' : '✗ Missing');
console.log('- Auth Token:', authToken ? '✓ Set' : '✗ Missing');
console.log('- From Number:', fromNumber || '✗ Missing');
console.log('- To Number:', toNumber || '✗ Missing\n');

if (accountSid && authToken && fromNumber && toNumber) {
  console.log('All required variables are set. Running test...\n');
  testStreamingCall();
} else {
  console.log('Please set all required environment variables before running the test.');
  process.exit(1);
} 