# 🚀 Supabase Setup Guide for BrainBased EMDR Platform

## 📋 Prerequisites
- Supabase account (free tier is sufficient)
- Node.js and npm installed
- Git repository cloned

---

## 🎯 Step-by-Step Setup

### **STEP 1: Create Supabase Project**

1. **Go to Supabase Dashboard**
   - Visit [supabase.com](https://supabase.com)
   - Sign in or create an account

2. **Create New Project**
   - Click "New Project"
   - Select your organization
   - Fill in project details:
     ```
     Name: brainbased-emdr-platform
     Database Password: [Generate a strong password]
     Region: [Choose closest to your users]
     ```
   - Click "Create new project"
   - Wait 2-3 minutes for setup

3. **Get Project Credentials**
   - Go to **Settings** → **API**
   - Copy these values:
     - **Project URL** (starts with `https://`)
     - **anon/public key** (starts with `eyJ`)
     - **service_role key** (starts with `eyJ`)

### **STEP 2: Set Up Database Schema**

1. **Open SQL Editor**
   - In Supabase dashboard, go to **SQL Editor**
   - Click "New query"

2. **Run Schema Script**
   - Copy the entire content from `supabase/schema.sql`
   - Paste into the SQL editor
   - Click "Run" to execute
   - Verify all tables are created in **Table Editor**

3. **Verify Tables Created**
   - Go to **Table Editor**
   - Confirm these tables exist:
     - `users`
     - `students`
     - `consultants`
     - `consultation_sessions`
     - `video_sessions`
     - `student_documents`
     - `certifications`
     - `consultant_availability`
     - `payments`
     - `notifications`

### **STEP 3: Configure Authentication**

1. **Authentication Settings**
   - Go to **Authentication** → **Settings**
   - Configure email templates (optional)
   - Set password policy if needed

2. **Email Templates** (Optional)
   - Customize welcome email
   - Set up password reset email
   - Configure email verification

### **STEP 4: Set Up Storage Buckets**

1. **Create Storage Buckets**
   - Go to **Storage** → **Buckets**
   - Create these buckets:
     ```
     documents (for student documents)
     recordings (for video session recordings)
     certificates (for generated certificates)
     ```

2. **Configure Bucket Policies**
   - Set appropriate RLS policies for each bucket
   - Configure public/private access as needed

### **STEP 5: Environment Configuration**

1. **Create Server Environment File**
   ```bash
   # Copy the example file
   cp env.example .env
   ```

2. **Update .env with Your Values**
   ```env
   # Replace these with your actual values
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   JWT_SECRET=your-super-secure-jwt-secret-key-here
   ```

3. **Create Client Environment File**
   ```bash
   # Copy the example file
   cp client/env.example client/.env
   ```

4. **Update client/.env with Your Values**
   ```env
   # Replace these with your actual values
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### **STEP 6: Generate JWT Secret**

1. **Generate Secure JWT Secret**
   ```bash
   # Option 1: Using Node.js
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Option 2: Using OpenSSL
   openssl rand -hex 64
   
   # Option 3: Online generator
   # Visit: https://generate-secret.vercel.app/64
   ```

2. **Add to .env**
   ```env
   JWT_SECRET=your-generated-secret-here
   ```

### **STEP 7: Test the Setup**

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Test API Endpoints**
   ```bash
   # Test health endpoint
   curl http://localhost:5000/api/health
   
   # Should return: {"status":"ok","timestamp":"..."}
   ```

4. **Test Authentication**
   - Open browser to `http://localhost:5000`
   - Try registering a new user
   - Verify login/logout functionality

---

## 🔧 Configuration Details

### **Database Schema Features**
- **Row Level Security (RLS)** enabled on all tables
- **Automatic user profile creation** when auth user is created
- **Role-based access control** for all operations
- **Audit trails** with created_at/updated_at timestamps

### **Authentication Features**
- **JWT-based authentication** with secure token management
- **Role-based middleware** for API protection
- **Automatic profile creation** based on user role
- **Secure password handling** with Supabase Auth

### **Storage Features**
- **Secure file upload** with size and type validation
- **Public/private file access** control
- **Automatic file cleanup** and management

---

## 🚨 Security Considerations

### **Environment Variables**
- ✅ Never commit `.env` files to git
- ✅ Use strong, unique JWT secrets
- ✅ Rotate secrets regularly in production
- ✅ Use different keys for development/production

### **Database Security**
- ✅ Row Level Security (RLS) enabled
- ✅ Role-based access control implemented
- ✅ Input validation on all endpoints
- ✅ SQL injection protection via Supabase 

### **API Security**
- ✅ JWT token validation on all protected routes
- ✅ Role-based middleware for access control
- ✅ Rate limiting (implement as needed)
- ✅ CORS configuration (implement as needed)

---

## 🧪 Testing Checklist

### **Authentication Tests**
- [ ] User registration works
- [ ] User login works
- [ ] User logout works
- [ ] Role assignment works correctly
- [ ] Protected routes require authentication
- [ ] Role-based access control works

### **Database Tests**
- [ ] Tables created successfully
- [ ] RLS policies working
- [ ] User profiles created automatically
- [ ] Data can be inserted/updated/read
- [ ] Relationships work correctly

### **API Tests**
- [ ] Health endpoint responds
- [ ] Authentication endpoints work
- [ ] Role-specific endpoints work
- [ ] Error handling works correctly
- [ ] WebSocket connections work

---

## 🚀 Next Steps

After completing this setup:

1. **Test the complete authentication flow**
2. **Implement frontend authentication integration**
3. **Add session booking functionality**
4. **Integrate video conferencing**
5. **Add file upload capabilities**
6. **Implement payment processing**

---

## 📞 Support

If you encounter issues:

1. **Check Supabase Dashboard** for error logs
2. **Verify environment variables** are correct
3. **Check browser console** for client-side errors
4. **Review server logs** for backend errors
5. **Consult Supabase documentation** for specific issues

---

## 🔗 Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage) 