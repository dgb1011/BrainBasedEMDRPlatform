import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🔍 UI Debugging - BrainBased EMDR Platform');
console.log('='.repeat(50));

// Test basic connectivity
const testConnectivity = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          success: true,
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          contentLength: data.length,
          hasReactContent: data.includes('React') || data.includes('react'),
          hasLoadingScreen: data.includes('Loading BrainBased EMDR Platform')
        });
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

// Check if Vite is running
const checkViteStatus = async () => {
  try {
    const { stdout } = await execAsync('ps aux | grep vite | grep -v grep');
    return stdout.trim() !== '';
  } catch (error) {
    return false;
  }
};

// Check for common issues
const diagnoseIssues = async () => {
  console.log('🔍 Running diagnostics...\n');

  // Test connectivity
  try {
    const result = await testConnectivity();
    console.log('✅ Connectivity Test: PASSED');
    console.log(`   Status Code: ${result.statusCode}`);
    console.log(`   Content Type: ${result.contentType}`);
    console.log(`   Content Length: ${result.contentLength} bytes`);
    console.log(`   Has React Content: ${result.hasReactContent ? 'Yes' : 'No'}`);
    console.log(`   Has Loading Screen: ${result.hasLoadingScreen ? 'Yes' : 'No'}`);
    
    if (!result.hasReactContent) {
      console.log('⚠️  WARNING: No React content detected in response');
    }
    
    if (result.hasLoadingScreen) {
      console.log('⚠️  WARNING: Loading screen detected - may be stuck');
    }
  } catch (error) {
    console.log('❌ Connectivity Test: FAILED');
    console.log(`   Error: ${error.error}`);
  }

  // Check Vite status
  const viteRunning = await checkViteStatus();
  console.log(`\n📦 Vite Status: ${viteRunning ? 'Running' : 'Not Running'}`);

  // Check port usage
  try {
    const { stdout } = await execAsync('lsof -i :5000');
    console.log('\n🔌 Port 5000 Status:');
    console.log(stdout || '   No processes found on port 5000');
  } catch (error) {
    console.log('\n🔌 Port 5000 Status: No processes found');
  }

  console.log('\n💡 Troubleshooting Steps:');
  console.log('1. Clear browser cache and reload the page');
  console.log('2. Try opening in an incognito/private window');
  console.log('3. Check browser console for JavaScript errors');
  console.log('4. Restart the development server if needed');
  console.log('5. Check if all dependencies are properly installed');
  
  console.log('\n🌐 Test URLs:');
  console.log('   Main App: http://localhost:5000');
  console.log('   Health Check: http://localhost:5000/api/health');
  console.log('   Static Assets: http://localhost:5000/src/main.tsx');
};

// Run diagnostics
diagnoseIssues().catch(console.error); 