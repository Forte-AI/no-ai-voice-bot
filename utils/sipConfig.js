/**
 * SIP Configuration Utility
 * Handles SIP URI generation and validation for Twilio integration
 */

class SIPConfig {
  constructor() {
    this.domain = process.env.SIP_DOMAIN || 'your-app.sip.twilio.com';
    this.username = process.env.SIP_USERNAME || 'default_user';
    this.password = process.env.SIP_PASSWORD || '';
    this.port = process.env.SIP_PORT || '5060';
  }

  /**
   * Generate SIP URI for origination
   * @param {string} username - Optional username override
   * @returns {string} Complete SIP URI
   */
  generateSIPURI(username = null) {
    const user = username || this.username;
    return `sip:${user}@${this.domain}`;
  }

  /**
   * Generate SIP URI with port
   * @param {string} username - Optional username override
   * @returns {string} Complete SIP URI with port
   */
  generateSIPURIWithPort(username = null) {
    const user = username || this.username;
    return `sip:${user}@${this.domain}:${this.port}`;
  }

  /**
   * Validate SIP URI format
   * @param {string} sipUri - SIP URI to validate
   * @returns {boolean} True if valid
   */
  validateSIPURI(sipUri) {
    const sipRegex = /^sip:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:\d+)?$/;
    return sipRegex.test(sipUri);
  }

  /**
   * Extract components from SIP URI
   * @param {string} sipUri - SIP URI to parse
   * @returns {object} Parsed components
   */
  parseSIPURI(sipUri) {
    const match = sipUri.match(/^sip:([^@]+)@([^:]+)(?::(\d+))?$/);
    if (!match) {
      throw new Error('Invalid SIP URI format');
    }
    
    return {
      username: match[1],
      domain: match[2],
      port: match[3] || '5060'
    };
  }

  /**
   * Get configuration for Twilio
   * @returns {object} Configuration object
   */
  getTwilioConfig() {
    return {
      sipUri: this.generateSIPURI(),
      domain: this.domain,
      username: this.username,
      port: this.port,
      isConfigured: !!(this.domain && this.username && this.password)
    };
  }

  /**
   * Generate webhook URL for SIP domain
   * @param {string} baseUrl - Your application's base URL
   * @returns {string} Webhook URL
   */
  generateWebhookURL(baseUrl) {
    return `${baseUrl}/twilio/incoming`;
  }

  /**
   * Get environment variables template
   * @returns {string} Environment variables template
   */
  getEnvTemplate() {
    return `# SIP Configuration
SIP_DOMAIN=${this.domain}
SIP_USERNAME=${this.username}
SIP_PASSWORD=your_sip_password_here
SIP_PORT=${this.port}
SIP_URI=${this.generateSIPURI()}

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here`;
  }
}

module.exports = SIPConfig; 