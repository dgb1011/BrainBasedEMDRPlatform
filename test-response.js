import http from 'http';

console.log('🔍 Testing Application Response');
console.log('='.repeat(50));

const testResponse = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET',
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          contentLength: data.length,
          content: data.substring(0, 1000), // First 1000 characters
          hasReact: data.includes('React') || data.includes('react'),
          hasLoading: data.includes('Loading BrainBased EMDR Platform'),
          hasScript: data.includes('<script'),
          hasDiv: data.includes('<div'),
          hasBody: data.includes('<body'),
          hasHead: data.includes('<head'),
          hasTitle: data.includes('<title'),
          hasVite: data.includes('vite'),
          hasError: data.includes('error') || data.includes('Error'),
          hasConsole: data.includes('console.log') || data.includes('console.error')
        });
      });
    });

    req.on('error', (error) => {
      reject({
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout'
      });
    });

    req.end();
  });
};

testResponse()
  .then(result => {
    console.log('📊 Response Analysis:');
    console.log(`   Status Code: ${result.statusCode}`);
    console.log(`   Content Type: ${result.contentType}`);
    console.log(`   Content Length: ${result.contentLength} bytes`);
    console.log('\n🔍 Content Analysis:');
    console.log(`   Has React: ${result.hasReact}`);
    console.log(`   Has Loading Screen: ${result.hasLoading}`);
    console.log(`   Has Script Tags: ${result.hasScript}`);
    console.log(`   Has Div Tags: ${result.hasDiv}`);
    console.log(`   Has Body Tag: ${result.hasBody}`);
    console.log(`   Has Head Tag: ${result.hasHead}`);
    console.log(`   Has Title Tag: ${result.hasTitle}`);
    console.log(`   Has Vite References: ${result.hasVite}`);
    console.log(`   Has Error Messages: ${result.hasError}`);
    console.log(`   Has Console Logs: ${result.hasConsole}`);
    
    console.log('\n📄 First 1000 characters of response:');
    console.log('='.repeat(50));
    console.log(result.content);
    console.log('='.repeat(50));
    
    if (result.hasLoading) {
      console.log('\n⚠️  ISSUE DETECTED: Loading screen is present in HTML');
      console.log('   This suggests the React app is not mounting properly');
    }
    
    if (!result.hasReact) {
      console.log('\n⚠️  ISSUE DETECTED: No React content found');
      console.log('   This suggests the React app is not being served');
    }
    
    if (result.hasError) {
      console.log('\n⚠️  ISSUE DETECTED: Error messages found in response');
      console.log('   Check for JavaScript errors in the browser console');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('1. Check browser console for JavaScript errors');
    console.log('2. Try opening in incognito/private window');
    console.log('3. Clear browser cache and reload');
    console.log('4. Check if Vite is properly serving the React app');
  })
  .catch(error => {
    console.log('❌ Error testing response:');
    console.log(error.error);
  }); 