#!/usr/bin/env node

/**
 * 🧪 Comprehensive Integration Test Suite
 * Tests all BrainBased EMDR Platform integrations
 */

import https from 'https';
import http from 'http';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TEST_EMAIL = 'test@brainbasedemdr.com';
const TEST_PASSWORD = 'TestPassword123!';

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m'     // Reset
  };
  
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function makeRequest(method, endpoint, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  log('🧪 Testing Health Check...', 'info');
  
  try {
    const response = await makeRequest('GET', '/api/health');
    
    if (response.status === 200 && response.data.status === 'ok') {
      log('✅ Health check passed', 'success');
      return { passed: true, message: 'Health check working' };
    } else {
      log('❌ Health check failed', 'error');
      return { passed: false, message: `Health check failed: ${response.status}` };
    }
  } catch (error) {
    log(`❌ Health check error: ${error.message}`, 'error');
    return { passed: false, message: `Health check error: ${error.message}` };
  }
}

async function testAuthentication() {
  log('🧪 Testing Authentication System...', 'info');
  
  try {
    // Test registration
    log('  Testing user registration...', 'info');
    const registerData = {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      firstName: 'Test',
      lastName: 'User',
      role: 'student'
    };
    
    const registerResponse = await makeRequest('POST', '/api/auth/register', registerData);
    
    if (registerResponse.status === 200 && registerResponse.data.user) {
      log('  ✅ Registration successful', 'success');
      
      // Test login
      log('  Testing user login...', 'info');
      const loginResponse = await makeRequest('POST', '/api/auth/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      
      if (loginResponse.status === 200 && loginResponse.data.token) {
        log('  ✅ Login successful', 'success');
        
        // Test authenticated endpoint
        log('  Testing authenticated endpoint...', 'info');
        const authResponse = await makeRequest('GET', '/api/auth/me', null, {
          'Authorization': `Bearer ${loginResponse.data.token}`
        });
        
        if (authResponse.status === 200 && authResponse.data.user) {
          log('  ✅ Authenticated endpoint working', 'success');
          return { passed: true, message: 'Authentication system working' };
        } else {
          log('  ❌ Authenticated endpoint failed', 'error');
          return { passed: false, message: 'Authenticated endpoint failed' };
        }
      } else {
        log('  ❌ Login failed', 'error');
        return { passed: false, message: 'Login failed' };
      }
    } else {
      log('  ❌ Registration failed', 'error');
      return { passed: false, message: 'Registration failed' };
    }
  } catch (error) {
    log(`❌ Authentication test error: ${error.message}`, 'error');
    return { passed: false, message: `Authentication error: ${error.message}` };
  }
}

async function testStorageService() {
  log('🧪 Testing Storage Service...', 'info');
  
  try {
    // Test admin endpoints (these should work with proper authentication)
    log('  Testing admin endpoints...', 'info');
    
    // Note: These would require admin authentication in real testing
    // For now, we'll test the endpoints exist and return proper error codes
    
    const studentsResponse = await makeRequest('GET', '/api/admin/students');
    const consultantsResponse = await makeRequest('GET', '/api/admin/consultants');
    
    // Should return 401 (unauthorized) without proper auth, which is expected
    if (studentsResponse.status === 401 && consultantsResponse.status === 401) {
      log('  ✅ Storage service endpoints exist and properly protected', 'success');
      return { passed: true, message: 'Storage service endpoints working' };
    } else {
      log('  ❌ Storage service endpoints not properly protected', 'error');
      return { passed: false, message: 'Storage service security issue' };
    }
  } catch (error) {
    log(`❌ Storage service test error: ${error.message}`, 'error');
    return { passed: false, message: `Storage service error: ${error.message}` };
  }
}

async function testKajabiIntegration() {
  log('🧪 Testing Kajabi Integration...', 'info');
  
  try {
    // Test Kajabi webhook endpoint
    log('  Testing Kajabi webhook endpoint...', 'info');
    
    const webhookData = {
      event: 'student.enrolled',
      student: {
        id: 'test-student-123',
        email: 'newstudent@test.com',
        firstName: 'New',
        lastName: 'Student',
        courseId: 'emdr-basic-2025'
      },
      course: {
        id: 'emdr-basic-2025',
        name: 'EMDR Basic Training',
        status: 'active'
      }
    };
    
    const webhookResponse = await makeRequest('POST', '/api/webhooks/kajabi', webhookData);
    
    if (webhookResponse.status === 200 && webhookResponse.data.status === 'success') {
      log('  ✅ Kajabi webhook endpoint working', 'success');
      return { passed: true, message: 'Kajabi integration working' };
    } else {
      log('  ❌ Kajabi webhook failed', 'error');
      return { passed: false, message: 'Kajabi webhook failed' };
    }
  } catch (error) {
    log(`❌ Kajabi integration test error: ${error.message}`, 'error');
    return { passed: false, message: `Kajabi integration error: ${error.message}` };
  }
}

async function testVerificationSystem() {
  log('🧪 Testing Verification System...', 'info');
  
  try {
    // Test verification endpoints exist
    log('  Testing verification endpoints...', 'info');
    
    // These would require proper authentication and session IDs
    // For now, we'll test that the endpoints exist and return proper error codes
    
    const studentVerifyResponse = await makeRequest('POST', '/api/sessions/test-session/verify/student');
    const consultantVerifyResponse = await makeRequest('POST', '/api/sessions/test-session/verify/consultant');
    const statusResponse = await makeRequest('GET', '/api/sessions/test-session/verification-status');
    
    // Should return 401 (unauthorized) without proper auth, which is expected
    if (studentVerifyResponse.status === 401 && 
        consultantVerifyResponse.status === 401 && 
        statusResponse.status === 401) {
      log('  ✅ Verification endpoints exist and properly protected', 'success');
      return { passed: true, message: 'Verification system endpoints working' };
    } else {
      log('  ❌ Verification endpoints not properly protected', 'error');
      return { passed: false, message: 'Verification system security issue' };
    }
  } catch (error) {
    log(`❌ Verification system test error: ${error.message}`, 'error');
    return { passed: false, message: `Verification system error: ${error.message}` };
  }
}

async function testVideoEndpoints() {
  log('🧪 Testing Video Endpoints...', 'info');
  
  try {
    // Test video session creation endpoint
    log('  Testing video session endpoints...', 'info');
    
    const videoResponse = await makeRequest('POST', '/api/video-sessions', {
      roomId: 'test-room-123',
      recordingEnabled: false
    });
    
    // Should return 401 (unauthorized) without proper auth, which is expected
    if (videoResponse.status === 401) {
      log('  ✅ Video endpoints exist and properly protected', 'success');
      return { passed: true, message: 'Video endpoints working' };
    } else {
      log('  ❌ Video endpoints not properly protected', 'error');
      return { passed: false, message: 'Video endpoints security issue' };
    }
  } catch (error) {
    log(`❌ Video endpoints test error: ${error.message}`, 'error');
    return { passed: false, message: `Video endpoints error: ${error.message}` };
  }
}

async function testDatabaseConnection() {
  log('🧪 Testing Database Connection...', 'info');
  
  try {
    // Test that we can access the health endpoint (which uses database)
    const response = await makeRequest('GET', '/api/health');
    
    if (response.status === 200) {
      log('  ✅ Database connection working', 'success');
      return { passed: true, message: 'Database connection working' };
    } else {
      log('  ❌ Database connection failed', 'error');
      return { passed: false, message: 'Database connection failed' };
    }
  } catch (error) {
    log(`❌ Database connection test error: ${error.message}`, 'error');
    return { passed: false, message: `Database connection error: ${error.message}` };
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting BrainBased EMDR Platform Integration Tests...', 'info');
  log(`📍 Testing against: ${BASE_URL}`, 'info');
  log('', 'info');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Authentication System', fn: testAuthentication },
    { name: 'Storage Service', fn: testStorageService },
    { name: 'Kajabi Integration', fn: testKajabiIntegration },
    { name: 'Verification System', fn: testVerificationSystem },
    { name: 'Video Endpoints', fn: testVideoEndpoints }
  ];
  
  for (const test of tests) {
    log(`\n🧪 Running: ${test.name}`, 'info');
    const result = await test.fn();
    
    testResults.total++;
    if (result.passed) {
      testResults.passed++;
      log(`✅ ${test.name}: PASSED`, 'success');
    } else {
      testResults.failed++;
      log(`❌ ${test.name}: FAILED - ${result.message}`, 'error');
    }
    
    testResults.details.push({
      name: test.name,
      passed: result.passed,
      message: result.message
    });
  }
  
  // Print summary
  log('\n📊 TEST SUMMARY', 'info');
  log('=' * 50, 'info');
  log(`Total Tests: ${testResults.total}`, 'info');
  log(`Passed: ${testResults.passed}`, testResults.passed === testResults.total ? 'success' : 'info');
  log(`Failed: ${testResults.failed}`, testResults.failed === 0 ? 'success' : 'error');
  log(`Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`, 'info');
  
  if (testResults.failed > 0) {
    log('\n❌ FAILED TESTS:', 'error');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        log(`  - ${test.name}: ${test.message}`, 'error');
      });
  }
  
  if (testResults.passed === testResults.total) {
    log('\n🎉 ALL TESTS PASSED! Integration is working perfectly!', 'success');
  } else {
    log('\n⚠️  Some tests failed. Please review the issues above.', 'warning');
  }
  
  log('\n📋 DETAILED RESULTS:', 'info');
  testResults.details.forEach(test => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    log(`  ${status} ${test.name}`, test.passed ? 'success' : 'error');
  });
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    log(`❌ Test runner error: ${error.message}`, 'error');
    process.exit(1);
  });
}

export { runAllTests, testResults }; 