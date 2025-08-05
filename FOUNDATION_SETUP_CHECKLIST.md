# 🔐 FOUNDATION SETUP CHECKLIST
# Authentication & Storage Configuration

## 📋 PREREQUISITES
- [x] Supabase project created
- [x] Environment files configured
- [x] Database schema ready

---

## 🔐 STEP 3: AUTHENTICATION CONFIGURATION

### **3.1 Email Templates Setup**
**Location:** Supabase Dashboard → Authentication → Email Templates

#### **Welcome Email Template**
- [ ] **Template:** Welcome
- [ ] **Subject:** Welcome to BrainBased EMDR Platform
- [ ] **Content:** Professional welcome message with role information
- [ ] **Variables:** {{ .Role }} for user role

#### **Password Reset Email Template**
- [ ] **Template:** Reset Password
- [ ] **Subject:** Reset Your BrainBased EMDR Platform Password
- [ ] **Content:** Secure password reset instructions
- [ ] **Variables:** {{ .ConfirmationURL }} for reset link

#### **Email Verification Template**
- [ ] **Template:** Confirm Signup
- [ ] **Subject:** Verify Your BrainBased EMDR Platform Account
- [ ] **Content:** Email verification instructions
- [ ] **Variables:** {{ .ConfirmationURL }} for verification link

### **3.2 Authentication Settings**
**Location:** Supabase Dashboard → Authentication → Settings

#### **Site Configuration**
- [ ] **Site URL:** http://localhost:5000 (development)
- [ ] **Redirect URLs:**
  - [ ] http://localhost:5000/auth/callback
  - [ ] http://localhost:5000/dashboard
  - [ ] http://localhost:5000/login

#### **Password Policy**
- [ ] **Minimum Length:** 8 characters
- [ ] **Require Uppercase:** Yes
- [ ] **Require Lowercase:** Yes
- [ ] **Require Numbers:** Yes
- [ ] **Require Special Characters:** Yes

#### **Session Configuration**
- [ ] **Session Timeout:** 7 days
- [ ] **Refresh Token Rotation:** Enabled
- [ ] **Secure Cookies:** Enabled (production)

---

## 📁 STEP 4: STORAGE BUCKETS CONFIGURATION

### **4.1 Create Storage Buckets**
**Location:** Supabase Dashboard → Storage → Buckets

#### **Documents Bucket**
- [ ] **Name:** documents
- [ ] **Public:** No (private access)
- [ ] **File Size Limit:** 10MB
- [ ] **Allowed MIME Types:**
  - [ ] application/pdf
  - [ ] application/msword
  - [ ] application/vnd.openxmlformats-officedocument.wordprocessingml.document
  - [ ] image/jpeg
  - [ ] image/png

#### **Recordings Bucket**
- [ ] **Name:** recordings
- [ ] **Public:** No (private access)
- [ ] **File Size Limit:** 100MB
- [ ] **Allowed MIME Types:**
  - [ ] video/mp4
  - [ ] video/webm
  - [ ] video/quicktime

#### **Certificates Bucket**
- [ ] **Name:** certificates
- [ ] **Public:** No (private access)
- [ ] **File Size Limit:** 5MB
- [ ] **Allowed MIME Types:**
  - [ ] application/pdf
  - [ ] image/png
  - [ ] image/jpeg

### **4.2 Configure Storage Policies**
**Location:** Supabase Dashboard → SQL Editor

#### **Run Storage Policies SQL**
- [ ] Copy content from `supabase/storage-policies.sql`
- [ ] Paste in SQL Editor
- [ ] Execute the script
- [ ] Verify policies are created

#### **Verify Policy Creation**
- [ ] **Documents Policies:**
  - [ ] Students can upload their own documents
  - [ ] Students can view their own documents
  - [ ] Consultants can view student documents
  - [ ] Admins can view all documents

- [ ] **Recordings Policies:**
  - [ ] Students can view their session recordings
  - [ ] Consultants can manage recordings
  - [ ] Admins can view all recordings

- [ ] **Certificates Policies:**
  - [ ] Students can view their certificates
  - [ ] Consultants can upload certificates
  - [ ] Admins can manage all certificates

---

## 🧪 TESTING & VERIFICATION

### **5.1 Authentication Testing**
- [ ] **User Registration:**
  - [ ] Test student registration
  - [ ] Test consultant registration
  - [ ] Test admin registration
  - [ ] Verify email templates work

- [ ] **User Login:**
  - [ ] Test login with valid credentials
  - [ ] Test login with invalid credentials
  - [ ] Test password reset functionality
  - [ ] Test email verification

- [ ] **Role-Based Access:**
  - [ ] Verify students can only access student features
  - [ ] Verify consultants can only access consultant features
  - [ ] Verify admins can access all features

### **5.2 Storage Testing**
- [ ] **File Upload Testing:**
  - [ ] Test document upload (PDF, DOC, images)
  - [ ] Test recording upload (video files)
  - [ ] Test certificate upload
  - [ ] Verify file size limits

- [ ] **File Access Testing:**
  - [ ] Test students can access their own files
  - [ ] Test consultants can access student files
  - [ ] Test admins can access all files
  - [ ] Verify unauthorized access is blocked

- [ ] **File Organization Testing:**
  - [ ] Verify files are organized in correct folders
  - [ ] Test file listing functionality
  - [ ] Test file deletion functionality

---

## 🔧 INTEGRATION TESTING

### **6.1 API Endpoint Testing**
- [ ] **Authentication Endpoints:**
  - [ ] POST /api/auth/register
  - [ ] POST /api/auth/login
  - [ ] POST /api/auth/logout
  - [ ] GET /api/auth/me

- [ ] **Storage Endpoints:**
  - [ ] POST /api/storage/upload
  - [ ] GET /api/storage/files
  - [ ] DELETE /api/storage/files/:id

### **6.2 Frontend Integration**
- [ ] **Authentication UI:**
  - [ ] Registration form works
  - [ ] Login form works
  - [ ] Password reset works
  - [ ] Role-based navigation works

- [ ] **File Upload UI:**
  - [ ] File upload component works
  - [ ] File validation works
  - [ ] Progress indicators work
  - [ ] Error handling works

---

## 🚨 SECURITY VERIFICATION

### **7.1 Authentication Security**
- [ ] **Password Security:**
  - [ ] Passwords are properly hashed
  - [ ] Password policy is enforced
  - [ ] Brute force protection is active

- [ ] **Session Security:**
  - [ ] JWT tokens are properly signed
  - [ ] Session timeout works correctly
  - [ ] Logout properly invalidates sessions

### **7.2 Storage Security**
- [ ] **File Access Control:**
  - [ ] RLS policies are working correctly
  - [ ] Unauthorized access is blocked
  - [ ] File URLs are secure

- [ ] **File Validation:**
  - [ ] File type validation works
  - [ ] File size validation works
  - [ ] Malicious file upload is prevented

---

## 📊 MONITORING & MAINTENANCE

### **8.1 Logging Setup**
- [ ] **Authentication Logs:**
  - [ ] Login attempts are logged
  - [ ] Failed login attempts are flagged
  - [ ] Password reset attempts are tracked

- [ ] **Storage Logs:**
  - [ ] File uploads are logged
  - [ ] File access is tracked
  - [ ] Storage usage is monitored

### **8.2 Maintenance Tasks**
- [ ] **Regular Cleanup:**
  - [ ] Old files are automatically cleaned up
  - [ ] Expired sessions are cleared
  - [ ] Storage usage is optimized

---

## ✅ COMPLETION CHECKLIST

### **Foundation Setup Complete When:**
- [ ] All authentication templates are configured
- [ ] All storage buckets are created
- [ ] All storage policies are applied
- [ ] Authentication flow works end-to-end
- [ ] File upload/download works correctly
- [ ] Role-based access control is verified
- [ ] Security measures are tested
- [ ] Error handling is implemented

### **Next Steps After Foundation:**
1. **Implement session booking workflow**
2. **Add video conferencing integration**
3. **Create document review system**
4. **Build certification automation**
5. **Add payment processing**
6. **Implement notification system**

---

## 🆘 TROUBLESHOOTING

### **Common Issues:**
- **Email templates not sending:** Check SMTP configuration
- **File uploads failing:** Verify bucket permissions
- **Authentication errors:** Check JWT secret configuration
- **Storage access denied:** Verify RLS policies

### **Support Resources:**
- Supabase Documentation: https://supabase.com/docs
- Authentication Guide: https://supabase.com/docs/guides/auth
- Storage Guide: https://supabase.com/docs/guides/storage 