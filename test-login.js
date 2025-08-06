import http from 'http';

console.log('🔍 Testing Login Functionality');
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
      timeout: 10000
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

const testRegistration = async (email, password, userData) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: email,
      password: password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
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
  console.log('🧪 Testing Authentication API Endpoints');
  console.log('');

  // Test 1: Try to register a new test user
  console.log('1️⃣ Testing User Registration...');
  try {
    const registerResult = await testRegistration('test@brainbased.com', 'password123', {
      firstName: 'Test',
      lastName: 'User',
      role: 'student'
    });
    
    console.log('   Status Code:', registerResult.statusCode);
    console.log('   Response:', JSON.stringify(registerResult.data, null, 2));
    
    if (registerResult.statusCode === 200 || registerResult.statusCode === 201) {
      console.log('   ✅ Registration successful');
    } else {
      console.log('   ❌ Registration failed');
    }
  } catch (error) {
    console.log('   ❌ Registration error:', error.error);
  }

  console.log('');

  // Test 2: Try to login with the test user
  console.log('2️⃣ Testing User Login...');
  try {
    const loginResult = await testLogin('test@brainbased.com', 'password123');
    
    console.log('   Status Code:', loginResult.statusCode);
    console.log('   Response:', JSON.stringify(loginResult.data, null, 2));
    
    if (loginResult.statusCode === 200) {
      console.log('   ✅ Login successful');
      if (loginResult.data.token) {
        console.log('   ✅ JWT token received');
      } else {
        console.log('   ❌ No JWT token in response');
      }
    } else {
      console.log('   ❌ Login failed');
    }
  } catch (error) {
    console.log('   ❌ Login error:', error.error);
  }

  console.log('');

  // Test 3: Try to login with existing users (if you mentioned you created them)
  console.log('3️⃣ Testing Login with Existing Users...');
  const testUsers = [
    { email: 'student@brainbased.com', password: 'password123' },
    { email: 'consultant@brainbased.com', password: 'password123' },
    { email: 'admin@brainbased.com', password: 'password123' }
  ];

  for (const user of testUsers) {
    try {
      console.log(`   Testing: ${user.email}`);
      const loginResult = await testLogin(user.email, user.password);
      
      if (loginResult.statusCode === 200) {
        console.log(`   ✅ Login successful for ${user.email}`);
        console.log(`   Role: ${loginResult.data.user?.role || 'Unknown'}`);
      } else {
        console.log(`   ❌ Login failed for ${user.email}: ${loginResult.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ Login error for ${user.email}:`, error.error);
    }
  }

  console.log('');
  console.log('🔧 Troubleshooting Steps:');
  console.log('1. Check if client/.env file exists with Supabase credentials');
  console.log('2. Verify Supabase project is active and accessible');
  console.log('3. Check browser console for JavaScript errors');
  console.log('4. Verify RLS policies are correctly configured');
  console.log('5. Check if users exist in Supabase auth and database tables');
};

runTests().catch(console.error); 