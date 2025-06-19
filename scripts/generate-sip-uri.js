#!/usr/bin/env node

/**
 * SIP URI Generator CLI Tool
 * Helps generate and validate SIP URIs for Twilio configuration
 */

const SIPConfig = require('../utils/sipConfig');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🔧 SIP URI Generator for Twilio\n');
  
  const sipConfig = new SIPConfig();
  
  // Check if environment variables are set
  const config = sipConfig.getTwilioConfig();
  
  if (config.isConfigured) {
    console.log('✅ SIP Configuration found in environment variables:');
    console.log(`   Domain: ${config.domain}`);
    console.log(`   Username: ${config.username}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   SIP URI: ${config.sipUri}\n`);
  } else {
    console.log('⚠️  SIP Configuration not found in environment variables.\n');
  }
  
  // Interactive configuration
  console.log('Let\'s configure your SIP URI:\n');
  
  const domain = await question(`SIP Domain (default: ${sipConfig.domain}): `) || sipConfig.domain;
  const username = await question(`SIP Username (default: ${sipConfig.username}): `) || sipConfig.username;
  const port = await question(`SIP Port (default: ${sipConfig.port}): `) || sipConfig.port;
  
  // Create new config with user input
  const customConfig = new SIPConfig();
  customConfig.domain = domain;
  customConfig.username = username;
  customConfig.port = port;
  
  const sipUri = customConfig.generateSIPURI();
  const sipUriWithPort = customConfig.generateSIPURIWithPort();
  
  console.log('\n📋 Generated SIP URIs:');
  console.log(`   Standard: ${sipUri}`);
  console.log(`   With Port: ${sipUriWithPort}`);
  
  // Validate the generated URI
  if (customConfig.validateSIPURI(sipUri)) {
    console.log('✅ SIP URI format is valid');
  } else {
    console.log('❌ SIP URI format is invalid');
  }
  
  // Show Twilio configuration
  console.log('\n🔧 Twilio Console Configuration:');
  console.log('1. Go to Twilio Console → Voice → SIP Domains');
  console.log('2. Create a new SIP Domain or select existing');
  console.log('3. Configure Voice Settings:');
  console.log(`   - Webhook URL: https://your-domain.com/twilio/incoming`);
  console.log(`   - HTTP Method: POST`);
  console.log('4. Create SIP Credentials:');
  console.log(`   - Username: ${username}`);
  console.log(`   - Password: [set a strong password]`);
  
  // Show environment variables
  console.log('\n📝 Environment Variables Template:');
  console.log('Add these to your .env file:');
  console.log('```env');
  console.log(`SIP_DOMAIN=${domain}`);
  console.log(`SIP_USERNAME=${username}`);
  console.log('SIP_PASSWORD=your_sip_password_here');
  console.log(`SIP_PORT=${port}`);
  console.log(`SIP_URI=${sipUri}`);
  console.log('```');
  
  // Show usage examples
  console.log('\n🚀 Usage Examples:');
  console.log('1. For outbound calls from your app:');
  console.log(`   const sipUri = "${sipUri}";`);
  console.log('   twilioClient.calls.create({');
  console.log(`     from: sipUri,`);
  console.log('     to: "+1234567890",');
  console.log('     url: "https://your-domain.com/twilio/incoming"');
  console.log('   });');
  
  console.log('\n2. For SIP registration:');
  console.log(`   Register to: ${sipUri}`);
  console.log(`   Username: ${username}`);
  console.log('   Password: [your_sip_password]');
  
  console.log('\n3. Test with curl:');
  console.log(`   curl -X POST https://your-domain.com/twilio/incoming \\`);
  console.log(`     -H "Content-Type: application/x-www-form-urlencoded" \\`);
  console.log(`     -d "From=${sipUri}&To=+1234567890&CallSid=test123"`);
  
  rl.close();
}

main().catch(console.error); 