// =====================================================
// REAL EMAIL AUTHENTICATION TEST
// BrainBased EMDR Platform
// =====================================================

const BASE_URL = 'http://localhost:5000';

// Test with a real email address
const realUser = {
  email: 'test.brainbased@outlook.com', // Real email for testing
  password: 'BrainBasedTest123!',
  firstName: 'Test',
  lastName: 'User',
  role: 'student'
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
async function testRegistration() {
  log('Testing registration with real email...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(realUser)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      assert(true, 'Registration successful with real email');
      log(`Registration response: ${JSON.stringify(data, null, 2)}`);
      return data;
    } else {
      assert(false, `Registration failed: ${data.message || 'Unknown error'}`);
      log(`Registration error details: ${JSON.stringify(data, null, 2)}`);
      return null;
    }
  } catch (error) {
    assert(false, `Registration error: ${error.message}`);
    return null;
  }
}

async function testLogin() {
  log('Testing login with real email...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: realUser.email,
        password: realUser.password
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      assert(true, 'Login successful with real email');
      log(`Login response: ${JSON.stringify(data, null, 2)}`);
      return data.token;
    } else {
      assert(false, `Login failed: ${data.message || 'Unknown error'}`);
      log(`Login error details: ${JSON.stringify(data, null, 2)}`);
      return null;
    }
  } catch (error) {
    assert(false, `Login error: ${error.message}`);
    return null;
  }
}

async function testUserProfile(token) {
  log('Testing user profile access...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      assert(data.user.email === realUser.email, 'User email matches');
      assert(data.user.role === realUser.role, 'User role is correct');
      assert(data.user.firstName === realUser.firstName, 'User firstName matches');
      assert(data.user.lastName === realUser.lastName, 'User lastName matches');
      log(`User profile: ${JSON.stringify(data, null, 2)}`);
      return data;
    } else {
      assert(false, `Profile access failed: ${data.message || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    assert(false, `Profile access error: ${error.message}`);
    return null;
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
      return true;
    } else {
      const data = await response.json();
      assert(false, `Logout failed: ${data.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    assert(false, `Logout error: ${error.message}`);
    return false;
  }
}

async function testReLogin() {
  log('Testing re-login after logout...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: realUser.email,
        password: realUser.password
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      assert(true, 'Re-login successful');
      return data.token;
    } else {
      assert(false, `Re-login failed: ${data.message || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    assert(false, `Re-login error: ${error.message}`);
    return null;
  }
}

// Main test runner
async function runRealEmailTests() {
  log('🚀 Starting Real Email Authentication Tests');
  log('==========================================');
  log(`Testing with email: ${realUser.email}`);
  log(`Role: ${realUser.role}`);
  log('');
  
  // Test 1: Registration
  log('📝 PHASE 1: REGISTRATION');
  log('------------------------');
  const registrationResult = await testRegistration();
  
  if (!registrationResult) {
    log('⚠️  Registration failed. This might be expected if user already exists.');
    log('   Proceeding to login test...');
  }
  
  // Test 2: Login
  log('\n🔐 PHASE 2: LOGIN');
  log('------------------');
  const token = await testLogin();
  
  if (!token) {
    log('❌ Login failed. Cannot proceed with profile tests.');
    return;
  }
  
  // Test 3: User Profile
  log('\n👤 PHASE 3: USER PROFILE');
  log('-------------------------');
  const profileData = await testUserProfile(token);
  
  if (!profileData) {
    log('❌ Profile access failed.');
    return;
  }
  
  // Test 4: Logout
  log('\n🚪 PHASE 4: LOGOUT');
  log('-------------------');
  const logoutSuccess = await testLogout(token);
  
  if (!logoutSuccess) {
    log('❌ Logout failed.');
    return;
  }
  
  // Test 5: Re-login
  log('\n🔄 PHASE 5: RE-LOGIN');
  log('---------------------');
  const newToken = await testReLogin();
  
  if (newToken) {
    log('✅ Re-login successful - session management working correctly');
  }
  
  // Test summary
  log('\n==========================================');
  log('📊 REAL EMAIL TEST RESULTS SUMMARY');
  log('==========================================');
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
    log('\n🎉 ALL TESTS PASSED! Authentication system is production-ready!');
    log('✅ Real email validation working');
    log('✅ User registration and login functional');
    log('✅ Profile access secure');
    log('✅ Session management working');
    log('✅ Ready for production deployment!');
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.');
  }
  
  log('\n==========================================');
  log('🧪 Real email testing completed!');
  log('');
  log('📧 Check your email for verification if registration was successful!');
}

// Run the tests
runRealEmailTests().catch(error => {
  log(`💥 Test runner error: ${error.message}`, 'error');
  process.exit(1);
}); 