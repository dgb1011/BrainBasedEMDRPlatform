// =====================================================
// AUTHENTICATION SYSTEM TEST SCRIPT
// BrainBased EMDR Platform
// =====================================================

const BASE_URL = 'http://localhost:5000';

// Test data
const testUsers = {
  student: {
    email: 'test.student@emdr.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Student',
    role: 'student'
  },
  consultant: {
    email: 'test.consultant@emdr.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Consultant',
    role: 'consultant'
  },
  admin: {
    email: 'test.admin@emdr.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin'
  }
};

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    log(`PASS: ${message}`, 'success');
  } else {
    testResults.failed++;
    testResults.errors.push(message);
    log(`FAIL: ${message}`, 'error');
  }
}

// Test functions
async function testServerConnection() {
  log('Testing server connection...');
  try {
    const response = await fetch(BASE_URL);
    assert(response.ok, 'Server is responding');
    log('Server connection test completed');
  } catch (error) {
    assert(false, `Server connection failed: ${error.message}`);
  }
}

async function testRegistration(userType, userData) {
  log(`Testing ${userType} registration...`);
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      assert(true, `${userType} registration successful`);
      return data;
    } else {
      assert(false, `${userType} registration failed: ${data.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    assert(false, `${userType} registration error: ${error.message}`);
    return null;
  }
}

async function testLogin(userType, userData) {
  log(`Testing ${userType} login...`);
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      assert(true, `${userType} login successful`);
      return data.token;
    } else {
      assert(false, `${userType} login failed: ${data.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    assert(false, `${userType} login error: ${error.message}`);
    return null;
  }
}

async function testDataAccess(userType, token) {
  log(`Testing ${userType} data access...`);
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      assert(data.user.role === testUsers[userType].role, `${userType} role assignment correct`);
      assert(data.user.email === testUsers[userType].email, `${userType} email matches`);
      log(`${userType} data access test completed`);
    } else {
      assert(false, `${userType} data access failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    assert(false, `${userType} data access error: ${error.message}`);
  }
}

async function testLogout(token) {
  log('Testing logout...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      assert(true, 'Logout successful');
    } else {
      const data = await response.json();
      assert(false, `Logout failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    assert(false, `Logout error: ${error.message}`);
  }
}

async function testInvalidCredentials() {
  log('Testing invalid credentials...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'invalid@email.com',
        password: 'wrongpassword'
      })
    });
    
    const data = await response.json();
    
    // Should fail with invalid credentials
    assert(!response.ok, 'Invalid credentials properly rejected');
    log('Invalid credentials test completed');
  } catch (error) {
    assert(false, `Invalid credentials test error: ${error.message}`);
  }
}

async function testUnauthorizedAccess() {
  log('Testing unauthorized access...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // Should fail without token
    assert(!response.ok, 'Unauthorized access properly rejected');
    log('Unauthorized access test completed');
  } catch (error) {
    assert(false, `Unauthorized access test error: ${error.message}`);
  }
}

// Main test runner
async function runTests() {
  log('🚀 Starting Authentication System Tests');
  log('=====================================');
  
  // Test 1: Server connection
  await testServerConnection();
  
  // Test 2: Invalid credentials
  await testInvalidCredentials();
  
  // Test 3: Unauthorized access
  await testUnauthorizedAccess();
  
  // Test 4: Registration and login for each role
  const tokens = {};
  
  for (const [userType, userData] of Object.entries(testUsers)) {
    log(`\n--- Testing ${userType.toUpperCase()} ---`);
    
    // Register user
    const registrationResult = await testRegistration(userType, userData);
    
    if (registrationResult) {
      // Login user
      const token = await testLogin(userType, userData);
      
      if (token) {
        tokens[userType] = token;
        
        // Test data access
        await testDataAccess(userType, token);
        
        // Test logout
        await testLogout(token);
      }
    }
  }
  
  // Test 5: Re-login to verify session cleanup
  log('\n--- Testing Session Cleanup ---');
  for (const [userType, userData] of Object.entries(testUsers)) {
    const token = await testLogin(userType, userData);
    if (token) {
      await testDataAccess(userType, token);
      await testLogout(token);
    }
  }
  
  // Test summary
  log('\n=====================================');
  log('📊 TEST RESULTS SUMMARY');
  log('=====================================');
  log(`✅ Passed: ${testResults.passed}`);
  log(`❌ Failed: ${testResults.failed}`);
  log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    log('\n🚨 ERRORS FOUND:');
    testResults.errors.forEach((error, index) => {
      log(`${index + 1}. ${error}`, 'error');
    });
  }
  
  if (testResults.failed === 0) {
    log('\n🎉 ALL TESTS PASSED! Authentication system is working correctly.');
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.');
  }
  
  log('\n=====================================');
  log('🧪 Testing completed!');
}

// Run the tests
runTests().catch(error => {
  log(`💥 Test runner error: ${error.message}`, 'error');
  process.exit(1);
}); 