# Question-Specific Settings Reference

## Settings Explained

| Setting | What It Does | Recommended Values |
|---------|-------------|-------------------|
| `timeoutCount` | How long (in milliseconds) to wait for the user to start speaking after the bot finishes asking the question. Higher values give users more time to think and respond. | 3000-10000ms |
| `maxSilenceBeforeTimeout` | How long (in milliseconds) of silence is allowed before the recording times out. This prevents very long pauses from being recorded. | 2000-5000ms |
| `postResponseTimeoutCount` | IBM-style pause (in milliseconds) after the bot finishes speaking, before starting to record the user's response. This mimics natural conversation timing. | 8000-20000ms |
| `maxRecordingLength` | Maximum length (in seconds) for the user's voice recording. Should be long enough for the expected response type. | 8-60 seconds |
| `minRecordingLength` | Minimum length (in seconds) for a valid recording. Prevents very short accidental recordings. | 0.5-2 seconds |

## Current Configuration Breakdown

### Phone Number Questions
- **Patterns:** "phone number", "phone", "telephone"
- **timeoutCount:** 7000ms (7s) - Users need time to think about numbers
- **postResponseTimeoutCount:** 15000ms (15s) - IBM-style pause
- **maxRecordingLength:** 20s - Enough for phone numbers
- **minRecordingLength:** 1.0s - Prevents very short recordings

### Date Questions
- **Patterns:** "date", "when"
- **timeoutCount:** 6000ms (6s) - Moderate thinking time
- **postResponseTimeoutCount:** 10000ms (10s) - IBM-style pause
- **maxRecordingLength:** 15s - Enough for dates
- **minRecordingLength:** 0.8s - Prevents very short recordings

### Name Questions
- **Patterns:** "name" (excludes "phone")
- **timeoutCount:** 5000ms (5s) - Quick response expected
- **postResponseTimeoutCount:** 10000ms (10s) - IBM-style pause
- **maxRecordingLength:** 12s - Enough for names
- **minRecordingLength:** 0.8s - Prevents very short recordings

### Address Questions
- **Patterns:** "address"
- **timeoutCount:** 7000ms (7s) - Complex information
- **postResponseTimeoutCount:** 15000ms (15s) - IBM-style pause
- **maxRecordingLength:** 25s - Addresses can be long
- **minRecordingLength:** 1.2s - Prevents very short recordings

### Store Number Questions
- **Patterns:** "store number"
- **timeoutCount:** 6000ms (6s) - Moderate thinking time
- **postResponseTimeoutCount:** 12000ms (12s) - IBM-style pause
- **maxRecordingLength:** 18s - Enough for store numbers
- **minRecordingLength:** 0.8s - Prevents very short recordings

### Incident Description Questions
- **Patterns:** "describe", "incident"
- **timeoutCount:** 8000ms (8s) - Users need time to think
- **postResponseTimeoutCount:** 20000ms (20s) - IBM-style pause
- **maxRecordingLength:** 45s - Descriptions can be long
- **minRecordingLength:** 1.5s - Prevents very short recordings

## Question ID Specific Settings

### Question ID 1: "Are you a Sonic Franchise?"
- **timeoutCount:** 5000ms (5s) - Yes/no question
- **postResponseTimeoutCount:** 10000ms (10s) - IBM-style pause
- **maxRecordingLength:** 8s - Enough for yes/no
- **minRecordingLength:** 0.5s - Prevents very short recordings

### Question ID 8: Phone number question
- **timeoutCount:** 7000ms (7s) - Users need time for numbers
- **postResponseTimeoutCount:** 15000ms (15s) - IBM-style pause
- **maxRecordingLength:** 20s - Enough for phone numbers
- **minRecordingLength:** 1.0s - Prevents very short recordings

### Question ID 11: Contact phone number question
- **timeoutCount:** 7000ms (7s) - Users need time for numbers
- **postResponseTimeoutCount:** 15000ms (15s) - IBM-style pause
- **maxRecordingLength:** 20s - Enough for phone numbers
- **minRecordingLength:** 1.0s - Prevents very short recordings

## Usage Guidelines

### Yes/No Questions
Use shorter timeouts (3-5 seconds) since users typically respond quickly with 'yes' or 'no'.

### Phone Numbers
Use longer timeouts (6-8 seconds) since users need time to think about and speak their phone number clearly.

### Dates
Use moderate timeouts (5-6 seconds) for date responses.

### Addresses
Use longer timeouts (7-8 seconds) and longer recording times since addresses can be complex.

### Descriptions
Use the longest timeouts (8+ seconds) and recording times since users need time to formulate detailed responses.

## IBM Watson Comparison

These settings mimic IBM Watson's voice telephony configuration where different question types get different turn management settings:

| Question Type | IBM timeout_count | IBM post_response_timeout | Your Equivalent |
|---------------|------------------|---------------------------|-----------------|
| Yes/No | 5000ms | 10000ms | 5000ms / 10000ms |
| Date | 5000ms | 10000ms | 6000ms / 10000ms |
| Phone Number | 5000ms | 15000ms | 7000ms / 15000ms |
| Description | 5000ms | 20000ms | 8000ms / 20000ms |

## How to Modify

1. Edit `config/questionSpecificSettings.json`
2. Change the values you want
3. Save the file
4. Test with: `node scripts/test-simple-config.js`

No code changes needed - just edit the JSON file! 