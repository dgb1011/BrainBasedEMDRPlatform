require('dotenv/config');

async function testEmail() {
  try {
    const { EmailService } = require('./server/services/emailService');
    
    console.log('🔄 Testing email service...');
    
    const userData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: 'student',
      userId: 'test-user-id'
    };
    
    await EmailService.sendWelcomeEmail(userData, 'platform');
    console.log('✅ Email sent successfully!');
    
  } catch (error) {
    console.log('❌ Email error:', error.message);
    console.log('Error details:', error);
  }
}

testEmail();
