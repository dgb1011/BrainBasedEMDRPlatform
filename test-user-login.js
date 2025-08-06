import http from 'http';

console.log('🔍 Testing Login with Your Email');
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
  console.log('🧪 Testing Login with: diegogb1011@gmail.com');
  console.log('');

  // Common password combinations to try
  const passwords = [
    'password123',
    'password',
    '123456',
    'test123',
    'Password123',
    'PASSWORD123',
    'Password',
    'admin123',
    'user123',
    'brainbased123',
    'emdr123',
    'consultant123',
    'student123'
  ];

  for (const password of passwords) {
    console.log(`🔐 Trying password: ${password}`);
    
    try {
      const loginResult = await testLogin('diegogb1011@gmail.com', password);
      
      if (loginResult.statusCode === 200) {
        console.log(`   ✅ SUCCESS! Login worked!`);
        console.log(`   User Role: ${loginResult.data.user?.role || 'Unknown'}`);
        console.log(`   Token: ${loginResult.data.token ? 'Received' : 'Missing'}`);
        console.log(`   User ID: ${loginResult.data.user?.id || 'Unknown'}`);
        console.log(`   Name: ${loginResult.data.user?.firstName} ${loginResult.data.user?.lastName}`);
        
        console.log('');
        console.log('🎉 WORKING CREDENTIALS FOUND!');
        console.log(`Email: diegogb1011@gmail.com`);
        console.log(`Password: ${password}`);
        console.log(`Role: ${loginResult.data.user?.role || 'Unknown'}`);
        console.log('');
        console.log('🌐 You can now use these credentials to log in at: http://localhost:5000');
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
  console.log('🔧 No working password found. Try these solutions:');
  console.log('1. Check your Supabase dashboard for the correct password');
  console.log('2. Try resetting the password in Supabase Auth');
  console.log('3. Check if email verification is required');
  console.log('4. Verify the user exists in both Auth and Database tables');
};

runTests().catch(console.error); 