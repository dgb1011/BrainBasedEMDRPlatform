import http from 'http';

console.log('🔧 Testing Login Fix with Different Email Formats');
console.log('='.repeat(60));

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
  console.log('🧪 Testing Different Email Formats');
  console.log('');

  // Test different email formats
  const testEmails = [
    'test@outlook.com',
    'test@gmail.com', 
    'test@yahoo.com',
    'test@hotmail.com',
    'test@icloud.com',
    'test@protonmail.com'
  ];

  for (const email of testEmails) {
    console.log(`📧 Testing registration with: ${email}`);
    
    try {
      const registerResult = await testRegistration(email, 'password123', {
        firstName: 'Test',
        lastName: 'User',
        role: 'student'
      });
      
      console.log(`   Status: ${registerResult.statusCode}`);
      
      if (registerResult.statusCode === 200 || registerResult.statusCode === 201) {
        console.log(`   ✅ SUCCESS! Registration worked with ${email}`);
        console.log(`   Response: ${JSON.stringify(registerResult.data, null, 2)}`);
        
        // Try to login immediately
        console.log(`   🔐 Testing login with ${email}...`);
        const loginResult = await testLogin(email, 'password123');
        
        if (loginResult.statusCode === 200) {
          console.log(`   ✅ LOGIN SUCCESS! Token: ${loginResult.data.token ? 'Received' : 'Missing'}`);
          console.log(`   User Role: ${loginResult.data.user?.role || 'Unknown'}`);
          
          console.log('');
          console.log('🎉 WORKING CREDENTIALS FOUND!');
          console.log(`Email: ${email}`);
          console.log('Password: password123');
          console.log('');
          
          return; // Stop testing once we find working credentials
        } else {
          console.log(`   ❌ Login failed: ${loginResult.data.message || 'Unknown error'}`);
        }
      } else {
        console.log(`   ❌ Registration failed: ${registerResult.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.error}`);
    }
    
    console.log('');
  }

  console.log('🔧 If all emails failed, try these solutions:');
  console.log('1. Check Supabase project settings for email restrictions');
  console.log('2. Verify SMTP configuration in Supabase dashboard');
  console.log('3. Try using a real email address you own');
  console.log('4. Check if Supabase email sending is temporarily disabled');
};

runTests().catch(console.error); 