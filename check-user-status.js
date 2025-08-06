import http from 'http';

console.log('🔍 Checking User Status and Password Reset');
console.log('='.repeat(60));

const checkUserStatus = async (email) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: email
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/check-status',
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
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
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

    req.write(postData);
    req.end();
  });
};

const resetPassword = async (email) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: email
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/reset-password',
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
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
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

    req.write(postData);
    req.end();
  });
};

const runChecks = async () => {
  console.log('🧪 Checking user status for: diegogb1011@gmail.com');
  console.log('');

  // First, let's try to reset the password
  console.log('1️⃣ Attempting password reset...');
  try {
    const resetResult = await resetPassword('diegogb1011@gmail.com');
    
    if (resetResult.statusCode === 200) {
      console.log('   ✅ Password reset email sent successfully!');
      console.log('   📧 Check your email for password reset instructions');
    } else {
      console.log(`   ❌ Password reset failed: ${resetResult.data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`   ❌ Password reset error: ${error.error}`);
  }

  console.log('');

  // Now let's try to create a new user with a simple password
  console.log('2️⃣ Attempting to create a new test user...');
  try {
    const createUser = async (email, password, userData) => {
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
                data: jsonData
              });
            } catch (error) {
              resolve({
                statusCode: res.statusCode,
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

        req.write(postData);
        req.end();
      });
    };

    const registerResult = await createUser('testuser@outlook.com', 'password123', {
      firstName: 'Test',
      lastName: 'User',
      role: 'student'
    });

    if (registerResult.statusCode === 200 || registerResult.statusCode === 201) {
      console.log('   ✅ New user created successfully!');
      console.log('   📧 Email: testuser@outlook.com');
      console.log('   🔐 Password: password123');
      console.log('   👤 Role: student');
      
      // Try to login immediately
      console.log('');
      console.log('3️⃣ Testing login with new user...');
      
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
                  data: jsonData
                });
              } catch (error) {
                resolve({
                  statusCode: res.statusCode,
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

          req.write(postData);
          req.end();
        });
      };

      const loginResult = await testLogin('testuser@outlook.com', 'password123');
      
      if (loginResult.statusCode === 200) {
        console.log('   ✅ Login successful with new user!');
        console.log('   🎉 You can now use these credentials:');
        console.log('   📧 Email: testuser@outlook.com');
        console.log('   🔐 Password: password123');
        console.log('   🌐 Login at: http://localhost:5000');
      } else {
        console.log(`   ❌ Login failed: ${loginResult.data.message || 'Unknown error'}`);
      }
    } else {
      console.log(`   ❌ User creation failed: ${registerResult.data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`   ❌ User creation error: ${error.error}`);
  }

  console.log('');
  console.log('🔧 Next Steps:');
  console.log('1. Check your email for password reset instructions');
  console.log('2. Try logging in with the new test user credentials');
  console.log('3. If email verification is required, check your email');
  console.log('4. Check Supabase dashboard for user status');
};

runChecks().catch(console.error); 