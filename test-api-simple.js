// Simple API test
const BASE_URL = 'http://localhost:5000';

async function testAPI() {
  console.log('🧪 Testing API endpoints...\n');

  // Test 1: Health endpoint
  console.log('1. Testing /api/health...');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      console.log(`   Response: ${JSON.stringify(data)}`);
    } else {
      const text = await response.text();
      console.log(`   Response (first 200 chars): ${text.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n2. Testing /api/auth/register...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'student'
      })
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      console.log(`   Response: ${JSON.stringify(data)}`);
    } else {
      const text = await response.text();
      console.log(`   Response (first 200 chars): ${text.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n3. Testing non-existent endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/api/nonexistent`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
}

testAPI(); 