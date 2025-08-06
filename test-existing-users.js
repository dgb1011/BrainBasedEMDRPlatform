import http from 'http';

console.log('🔍 Testing Login with Existing Users');
console.log('='.repeat(50));

const testLogin = async (email, password) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: email,
      password: password
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
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

    req.write(postData);
    req.end();
  });
};

const runTests = async () => {
  console.log('🧪 Testing Login with Existing Users');
  console.log('');

  // Test common password combinations
  const testCredentials = [
    { email: 'test@outlook.com', password: 'password123' },
    { email: 'test@outlook.com', password: 'password' },
    { email: 'test@outlook.com', password: '123456' },
    { email: 'test@outlook.com', password: 'test123' },
    { email: 'test@hotmail.com', password: 'password123' },
    { email: 'test@hotmail.com', password: 'password' },
    { email: 'test@hotmail.com', password: '123456' },
    { email: 'test@hotmail.com', password: 'test123' },
    // Try some variations
    { email: 'student@brainbased.com', password: 'password123' },
    { email: 'student@brainbased.com', password: 'password' },
    { email: 'consultant@brainbased.com', password: 'password123' },
    { email: 'consultant@brainbased.com', password: 'password' },
    { email: 'admin@brainbased.com', password: 'password123' },
    { email: 'admin@brainbased.com', password: 'password' },
    // Try with different domains
    { email: 'test@outlook.com', password: 'Password123' },
    { email: 'test@outlook.com', password: 'PASSWORD123' },
    { email: 'test@outlook.com', password: 'Password' },
  ];

  for (const cred of testCredentials) {
    console.log(`🔐 Testing: ${cred.email} / ${cred.password}`);
    
    try {
      const loginResult = await testLogin(cred.email, cred.password);
      
      if (loginResult.statusCode === 200) {
        console.log(`   ✅ SUCCESS! Login worked!`);
        console.log(`   User Role: ${loginResult.data.user?.role || 'Unknown'}`);
        console.log(`   Token: ${loginResult.data.token ? 'Received' : 'Missing'}`);
        console.log(`   User ID: ${loginResult.data.user?.id || 'Unknown'}`);
        
        console.log('');
        console.log('🎉 WORKING CREDENTIALS FOUND!');
        console.log(`Email: ${cred.email}`);
        console.log(`Password: ${cred.password}`);
        console.log(`Role: ${loginResult.data.user?.role || 'Unknown'}`);
        console.log('');
        
        return; // Stop testing once we find working credentials
      } else {
        console.log(`   ❌ Failed: ${loginResult.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.error}`);
    }
  }

  console.log('');
  console.log('🔧 No working credentials found. Try these solutions:');
  console.log('1. Check your Supabase dashboard for existing users');
  console.log('2. Try resetting passwords in Supabase Auth');
  console.log('3. Create new users with a real email address');
  console.log('4. Check if email verification is required');
};

runTests().catch(console.error); 