# Environment Setup for brainbasedemdr-platform.com

## Copy this to your .env file:

```bash
# ========================================
# TWILIO INTEGRATION - ENVIRONMENT SETUP
# ========================================

# Twilio Account Settings (Get from Twilio Console)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# Twilio Video (WebRTC replacement)
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret_here

# Twilio SendGrid (Email replacement)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@brainbasedemdr-platform.com
SENDGRID_FROM_NAME=BrainBased EMDR Platform

# Twilio SMS & Voice
TWILIO_PHONE_NUMBER=+15551234567
ENABLE_SMS_NOTIFICATIONS=true
ENABLE_VOICE_NOTIFICATIONS=false

# Twilio Verify (2FA - optional)
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ========================================
# YOUR DOMAIN: brainbasedemdr-platform.com
# ========================================
```

## Next Steps:
1. Get your SendGrid API key from SendGrid dashboard
2. Replace SENDGRID_API_KEY with your actual key
3. Save as .env file in project root
