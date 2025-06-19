# SIP URI Setup Guide for Twilio Origination

## Overview
This guide explains how to set up SIP URI origination for your Twilio voice bot service.

## Current Architecture
Your service currently uses HTTP webhooks for incoming calls. To enable SIP origination, you need to configure Twilio to connect to your service via SIP.

## Setup Options

### Option 1: Twilio SIP Domain (Recommended)

#### Step 1: Create SIP Domain
1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to Voice → SIP Domains
3. Click "Create SIP Domain"
4. Configure:
   - **Domain Name**: `your-app.sip.twilio.com` (or your custom domain)
   - **SIP Registration**: Enable if you want registration
   - **Voice Configuration**: Set to your webhook URL

#### Step 2: Create SIP Credentials
1. Go to Voice → SIP Credentials
2. Create a new credential list
3. Add username/password pairs for authentication

#### Step 3: Configure Your SIP URI
Your SIP URI will be:
```
sip:username@your-app.sip.twilio.com
```

### Option 2: External SIP Server

#### Step 1: Deploy SIP Server
You can deploy a SIP server (Asterisk, FreeSWITCH) alongside your Node.js app:

```bash
# Example with Docker
docker run -d --name asterisk \
  -p 5060:5060/udp \
  -p 5060:5060/tcp \
  -p 10000-20000:10000-20000/udp \
  asterisk/asterisk
```

#### Step 2: Configure SIP Endpoint
Your SIP URI would be:
```
sip:your-server-ip:5060
```

### Option 3: Cloud SIP Provider

Use a cloud SIP provider like:
- **Twilio SIP Domain** (easiest)
- **AsteriskNow** (self-hosted)
- **FreePBX** (self-hosted)
- **3CX** (commercial)

## Configuration in Twilio Console

### For Outbound Calls (Origination)

1. **Go to Twilio Console → Voice → SIP Domains**
2. **Select your SIP Domain**
3. **Configure Voice Settings:**
   - **Webhook URL**: `https://your-domain.com/twilio/incoming`
   - **HTTP Method**: POST
   - **Fallback URL**: (optional)

### For Inbound Calls (Termination)

1. **Go to Twilio Console → Phone Numbers**
2. **Select your phone number**
3. **Configure Voice Settings:**
   - **Webhook URL**: `https://your-domain.com/twilio/incoming`
   - **HTTP Method**: POST

## Environment Variables

Add these to your `.env` file:

```env
# SIP Configuration
SIP_DOMAIN=your-app.sip.twilio.com
SIP_USERNAME=your_sip_username
SIP_PASSWORD=your_sip_password
SIP_URI=sip:your_sip_username@your-app.sip.twilio.com

# Twilio Configuration (existing)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## Testing Your SIP Setup

### Test SIP URI
```bash
# Test with curl (if you have a SIP client)
curl -X POST https://your-domain.com/twilio/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=sip:test@your-app.sip.twilio.com&To=+1234567890&CallSid=test123"
```

### Test with Twilio CLI
```bash
# Install Twilio CLI
npm install -g twilio-cli

# Test call
twilio voice:call:create \
  --from="sip:username@your-app.sip.twilio.com" \
  --to="+1234567890" \
  --url="https://your-domain.com/twilio/incoming"
```

## Production Deployment

### Option A: Heroku
```bash
# Deploy to Heroku
heroku create your-sip-app
git push heroku main

# Set environment variables
heroku config:set SIP_DOMAIN=your-app.sip.twilio.com
heroku config:set SIP_USERNAME=your_username
heroku config:set SIP_PASSWORD=your_password
```

### Option B: AWS/GCP/Azure
Deploy your Node.js app to your preferred cloud provider and configure the SIP domain to point to your deployed URL.

## Troubleshooting

### Common Issues

1. **SIP Registration Fails**
   - Check credentials
   - Verify domain configuration
   - Check firewall settings

2. **Calls Not Routing**
   - Verify webhook URL is accessible
   - Check Twilio logs
   - Ensure proper HTTP response format

3. **Audio Issues**
   - Check codec compatibility
   - Verify RTP port configuration
   - Test with different audio formats

### Debug Commands

```bash
# Check Twilio logs
twilio api:core:logs:list

# Test SIP connectivity
telnet your-sip-domain.com 5060

# Check webhook responses
curl -X POST https://your-domain.com/twilio/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "test=1"
```

## Security Considerations

1. **Use HTTPS** for all webhook URLs
2. **Implement authentication** for SIP credentials
3. **Validate Twilio requests** using signature verification
4. **Use strong passwords** for SIP credentials
5. **Monitor call logs** for suspicious activity

## Next Steps

1. Choose your preferred SIP setup option
2. Configure Twilio SIP Domain
3. Update your environment variables
4. Test the setup
5. Deploy to production
6. Monitor and maintain

## Support

- [Twilio SIP Documentation](https://www.twilio.com/docs/voice/sip)
- [Twilio Support](https://support.twilio.com/)
- [SIP RFC 3261](https://tools.ietf.org/html/rfc3261) 