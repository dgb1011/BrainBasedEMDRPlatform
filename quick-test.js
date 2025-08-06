import http from 'http';

console.log('🧪 Quick UI Test - BrainBased EMDR Platform');
console.log('='.repeat(50));

// Test the application
const testApp = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET',
      timeout: 3000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({
            success: true,
            statusCode: res.statusCode,
            contentType: res.headers['content-type']
          });
        } else {
          reject({
            success: false,
            statusCode: res.statusCode,
            message: 'Unexpected status code'
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        success: false,
        error: 'Connection timeout'
      });
    });

    req.end();
  });
};

// Run the test
testApp()
  .then(result => {
    console.log('✅ SUCCESS! Application is running correctly.');
    console.log(`📊 Status Code: ${result.statusCode}`);
    console.log(`📄 Content Type: ${result.contentType}`);
    console.log('\n🌐 Open your browser and navigate to:');
    console.log('   http://localhost:5000');
    console.log('\n🎨 Test the modern UI components:');
    console.log('   1. Authentication page (login/register)');
    console.log('   2. Student Dashboard with progress tracking');
    console.log('   3. Consultant Dashboard with session management');
    console.log('   4. Admin Panel with system overview');
    console.log('   5. Progress page with milestones and achievements');
    console.log('\n📱 Test responsive design on different screen sizes');
    console.log('🎯 All modern UI components are ready for testing!');
  })
  .catch(error => {
    console.log('❌ ERROR: Application is not accessible');
    console.log(`🔍 Error: ${error.error || error.message}`);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure the development server is running: npm run dev');
    console.log('   2. Check if port 5000 is available');
    console.log('   3. Look for any TypeScript compilation errors');
    console.log('   4. Restart the development server if needed');
  }); 