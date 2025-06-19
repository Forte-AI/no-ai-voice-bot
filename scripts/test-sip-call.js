#!/usr/bin/env node

/**
 * Test script for SIP URI streaming voice bot
 * 
 * This script tests the SIP URI: sonic-claims-bot.sip.twilio.com
 * which should connect to the streaming voice bot at:
 * https://no-ai-voice-bot-6fa8653de31d.herokuapp.com
 */

const twilio = require('twilio');

// Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const sipUri = 'sonic-claims-bot.sip.twilio.com';

if (!accountSid || !authToken || !fromNumber) {
  console.error('Missing required environment variables:');
  console.error('- TWILIO_ACCOUNT_SID');
  console.error('- TWILIO_AUTH_TOKEN');
  console.error('- TWILIO_PHONE_NUMBER');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function testSipCall() {
  try {
    console.log('=== Testing SIP URI Streaming Voice Bot ===\n');
    console.log('SIP URI:', sipUri);
    console.log('From Number:', fromNumber);
    console.log('Heroku App:', 'https://no-ai-voice-bot-6fa8653de31d.herokuapp.com');
    
    console.log('\nMaking SIP call to test streaming voice bot...');
    
    const call = await client.calls.create({
      to: `sip:${sipUri}`,
      from: fromNumber,
      statusCallback: 'https://no-ai-voice-bot-6fa8653de31d.herokuapp.com/twilio/status',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });
    
    console.log('\n✅ SIP Call initiated successfully!');
    console.log('Call SID:', call.sid);
    console.log('Call status:', call.status);
    console.log('To:', call.to);
    console.log('From:', call.from);
    
    console.log('\n📞 Expected behavior:');
    console.log('1. Call should connect to SIP URI');
    console.log('2. Voice bot should answer with "Connecting you to our voice assistant..."');
    console.log('3. WebSocket streaming should start');
    console.log('4. First question should be: "Are you a Sonic Franchise?"');
    console.log('5. Real-time audio processing should work');
    
    console.log('\n🔍 Monitor the call at:');
    console.log('https://console.twilio.com/us1/develop/voice/manage/calls');
    console.log('Call SID for monitoring:', call.sid);
    
    console.log('\n📊 Check Heroku logs for streaming activity:');
    console.log('https://dashboard.heroku.com/apps/no-ai-voice-bot-6fa8653de31d/logs');
    
  } catch (error) {
    console.error('\n❌ Error making SIP call:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      moreInfo: error.moreInfo
    });
    
    if (error.code === 21211) {
      console.error('\n💡 This might be a SIP URI configuration issue.');
      console.error('Check that sonic-claims-bot.sip.twilio.com is properly configured.');
    }
  }
}

// Instructions for manual testing
console.log('=== SIP URI Streaming Voice Bot Test ===\n');

console.log('Current configuration:');
console.log('- Account SID:', accountSid ? '✓ Set' : '✗ Missing');
console.log('- Auth Token:', authToken ? '✓ Set' : '✗ Missing');
console.log('- From Number:', fromNumber || '✗ Missing');
console.log('- SIP URI:', sipUri);
console.log('- Heroku App:', 'https://no-ai-voice-bot-6fa8653de31d.herokuapp.com\n');

if (accountSid && authToken && fromNumber) {
  console.log('All required variables are set. Running SIP test...\n');
  testSipCall();
} else {
  console.log('Please set all required environment variables before running the test.');
  process.exit(1);
}

console.log('\n💡 Manual Testing Options:');
console.log('1. Use a SIP client to call: sip:sonic-claims-bot.sip.twilio.com');
console.log('2. Use Twilio Console to make a test call');
console.log('3. Use a regular phone if you have a phone number configured'); 