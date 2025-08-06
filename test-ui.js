const http = require('http');

// Test configuration
const TEST_CONFIG = {
  host: 'localhost',
  port: 5000,
  timeout: 5000
};

// Test cases
const TESTS = [
  {
    name: 'Server Connection',
    path: '/',
    expectedStatus: 200,
    description: 'Check if the server is running and responding'
  },
  {
    name: 'Health Check',
    path: '/api/health',
    expectedStatus: 200,
    description: 'Check API health endpoint'
  },
  {
    name: 'Authentication Page',
    path: '/auth',
    expectedStatus: 200,
    description: 'Check if authentication page loads'
  },
  {
    name: 'Static Assets',
    path: '/src/main.tsx',
    expectedStatus: 200,
    description: 'Check if static assets are served'
  }
];

// Test function
function testEndpoint(test) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: TEST_CONFIG.host,
      port: TEST_CONFIG.port,
      path: test.path,
      method: 'GET',
      timeout: TEST_CONFIG.timeout
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const success = res.statusCode === test.expectedStatus;
        const result = {
          name: test.name,
          path: test.path,
          statusCode: res.statusCode,
          expectedStatus: test.expectedStatus,
          success,
          description: test.description,
          contentType: res.headers['content-type'] || 'unknown'
        };
        
        resolve(result);
      });
    });

    req.on('error', (error) => {
      reject({
        name: test.name,
        path: test.path,
        error: error.message,
        success: false,
        description: test.description
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        name: test.name,
        path: test.path,
        error: 'Request timeout',
        success: false,
        description: test.description
      });
    });

    req.end();
  });
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting UI Testing...\n');
  console.log(`📍 Testing server at: http://${TEST_CONFIG.host}:${TEST_CONFIG.port}\n`);
  
  const results = [];
  
  for (const test of TESTS) {
    try {
      console.log(`⏳ Testing: ${test.name}...`);
      const result = await testEndpoint(test);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${test.name}: PASSED (${result.statusCode})`);
      } else {
        console.log(`❌ ${test.name}: FAILED (Expected: ${result.expectedStatus}, Got: ${result.statusCode})`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR (${error.error})`);
      results.push(error);
    }
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / results.length) * 100)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`  - ${result.name}: ${result.error || `Status ${result.statusCode} (expected ${result.expectedStatus})`}`);
    });
  }
  
  console.log('\n🎯 Next Steps:');
  if (passed === results.length) {
    console.log('✅ All tests passed! The application is running correctly.');
    console.log('🌐 Open your browser and navigate to: http://localhost:5000');
    console.log('👤 Test the different user roles:');
    console.log('   - Student: Register/login as a student');
    console.log('   - Consultant: Register/login as a consultant');
    console.log('   - Admin: Register/login as an admin');
  } else {
    console.log('❌ Some tests failed. Check the server status and try again.');
    console.log('💡 Make sure the development server is running: npm run dev');
  }
  
  console.log('\n📱 Manual Testing Checklist:');
  console.log('1. Open http://localhost:5000 in your browser');
  console.log('2. Test the registration/login forms');
  console.log('3. Verify the modern UI design on different pages');
  console.log('4. Test responsive design on mobile/tablet');
  console.log('5. Check all interactive elements (buttons, forms, etc.)');
}

// Run the tests
runTests().catch(console.error); 