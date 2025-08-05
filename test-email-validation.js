// =====================================================
// EMAIL VALIDATION TEST
// BrainBased EMDR Platform
// =====================================================

const BASE_URL = 'http://localhost:5000';

// Test different email formats
const testEmails = [
  'test@example.com',
  'test@brainbased.com',
  'test@emdr.com',
  'test@healthcare.com',
  'test@outlook.com',
  'test@gmail.com',
  'test@yahoo.com'
];

async function testEmailValidation() {
  console.log('🧪 Testing Email Validation');
  console.log('==========================');
  console.log('');

  for (const email of testEmails) {
    console.log(`Testing email: ${email}`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'student'
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ SUCCESS: ${email} - Registration successful`);
        console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
        break; // Found a working email
      } else {
        console.log(`❌ FAILED: ${email} - ${data.message}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${email} - ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('==========================');
  console.log('Email validation test completed');
}

// Also test the health endpoint to ensure server is working
async function testServerHealth() {
  console.log('🏥 Testing Server Health');
  console.log('=======================');
  
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    
    console.log(`✅ Server Health: ${JSON.stringify(data, null, 2)}`);
  } catch (error) {
    console.log(`❌ Server Health Error: ${error.message}`);
  }
  
  console.log('');
}

// Run tests
async function runTests() {
  await testServerHealth();
  await testEmailValidation();
}

runTests().catch(error => {
  console.log(`💥 Test error: ${error.message}`);
}); 